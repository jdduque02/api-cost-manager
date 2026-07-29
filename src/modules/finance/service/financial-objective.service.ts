import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { FinancialObjectiveRepository } from '@finance/repositories/financial-objective.repository';
import { CreateFinancialObjectiveDto } from '@finance/dto/financial-objective/create-financial-objective.dto';
import { UpdateFinancialObjectiveDto } from '@finance/dto/financial-objective/update-financial-objective.dto';
import { CalculateQuotaDto } from '@finance/dto/financial-objective/calculate-quota.dto';
import { CalculateQuotaResponseDto } from '@finance/dto/financial-objective/calculate-quota-response.dto';
import { FinancialProfileRepository } from '@identity/repositories/financial-profile.repository';
import { AuditLogService } from '@audit/service/audit-log.service';
import { FrequencyEnum, AuditActionEnum } from '@shared/enums';

const DAYS_PER_FREQUENCY: Record<string, number> = {
  [FrequencyEnum.WEEKLY]: 7,
  [FrequencyEnum.BIWEEKLY]: 14,
  [FrequencyEnum.MONTHLY]: 30.44,
};

const PERIODS_PER_MONTH: Record<string, number> = {
  [FrequencyEnum.WEEKLY]: 4.33,
  [FrequencyEnum.BIWEEKLY]: 2.17,
  [FrequencyEnum.MONTHLY]: 1,
};

@Injectable()
export class FinancialObjectiveService {
  private readonly logger = new Logger(FinancialObjectiveService.name);

  constructor(
    private readonly financialObjectiveRepository: FinancialObjectiveRepository,
    @Inject(forwardRef(() => FinancialProfileRepository))
    private readonly financialProfileRepository: FinancialProfileRepository,
    private readonly auditLogService: AuditLogService,
    @Inject(I18nService) private readonly i18n: I18nService,
  ) {}

  async create(userId: number, dto: CreateFinancialObjectiveDto) {
    return this.financialObjectiveRepository.create(userId, dto);
  }

  async findAll(userId: number) {
    return this.financialObjectiveRepository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.financialObjectiveRepository.findById(id, userId);
  }

  async update(id: number, userId: number, dto: UpdateFinancialObjectiveDto) {
    return this.financialObjectiveRepository.update(id, userId, dto);
  }

  async remove(id: number, userId: number) {
    return this.financialObjectiveRepository.softDelete(id, userId);
  }

  async calculateQuota(userId: number, dto: CalculateQuotaDto): Promise<CalculateQuotaResponseDto> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let monthlyIncome: number | null = null;
    let savingsRatio = 20;
    let hasFinancialProfile = false;

    // 1. Obtener perfil financiero del usuario
    try {
      const profile = await this.financialProfileRepository.findByUserId(String(userId));
      hasFinancialProfile = true;
      monthlyIncome = profile.monthly_income as unknown as number;
      savingsRatio = profile.savings_ratio ?? 20;
    } catch {
      this.logger.debug(`Usuario ${userId} no tiene perfil financiero registrado.`);
    }

    // 2. Validar fin de período
    const today = new Date().toISOString().split('T')[0];
    const startDate = dto.start_date ?? today;

    if (!dto.end_date) {
      const noEndDateResponse: CalculateQuotaResponseDto = {
        target_amount: dto.target_amount,
        current_balance: dto.current_balance ?? 0,
        amount_to_save: dto.target_amount - (dto.current_balance ?? 0),
        start_date: startDate,
        end_date: null,
        frequency: dto.frequency,
        total_periods: 0,
        days_in_period: 0,
        quota_amount: 0,
        monthly_income: monthlyIncome,
        savings_ratio: savingsRatio,
        max_allowed_per_period: null,
        is_within_budget: null,
        bank: null,
        current_profitability: null,
        projected_final_balance: null,
        has_financial_profile: hasFinancialProfile,
        warnings: [],
        recommendations: [
          this.i18n.t('finance.SET_END_DATE_RECOMMENDATION'),
          this.i18n.t('finance.REUSE_ROUTE_HINT'),
        ],
      };

      await this.logCalculation(userId, noEndDateResponse);
      return noEndDateResponse;
    }

    // 3. Validar montos
    const amountToSave = dto.target_amount - (dto.current_balance ?? 0);

    if (amountToSave <= 0) {
      throw new BadRequestException(this.i18n.t('finance.OBJECTIVE_ALREADY_REACHED'));
    }

    // 4. Calcular períodos
    const start = new Date(startDate);
    const end = new Date(dto.end_date);

    if (start >= end) {
      throw new BadRequestException(this.i18n.t('finance.INVALID_DATE_RANGE'));
    }

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysPerPeriod = DAYS_PER_FREQUENCY[dto.frequency];
    const totalPeriods = Math.ceil(diffDays / daysPerPeriod);

    // 5. Calcular cuota
    const quotaAmount = amountToSave / totalPeriods;

    // 6. Calcular rentabilidad proyectada
    let projectedFinalBalance: number | null = null;
    let currentProfitability: number | null = null;

    // La rentabilidad se pasa como parámetro de la meta existente, no del cálculo
    // Se retorna null aquí; el frontend puede combinarla con datos de la meta

    // 7. Validar contra regla 50-30-20
    let maxAllowedPerPeriod: number | null = null;
    let isWithinBudget: boolean | null = null;

    if (monthlyIncome !== null && monthlyIncome > 0) {
      const periodsPerMonth = PERIODS_PER_MONTH[dto.frequency];
      maxAllowedPerPeriod = (monthlyIncome * (savingsRatio / 100)) / periodsPerMonth;
      isWithinBudget = quotaAmount <= maxAllowedPerPeriod;

      if (!isWithinBudget) {
        warnings.push(
          `Tu cuota de $${quotaAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })} ` +
          `excede el ${savingsRatio}% recomendado de tu ingreso mensual ` +
          `($${monthlyIncome.toLocaleString('es-CO', { maximumFractionDigits: 0 })}). ` +
          `El máximo recomendado por ${dto.frequency === FrequencyEnum.WEEKLY ? 'semana' : dto.frequency === FrequencyEnum.BIWEEKLY ? 'quincena' : 'mes'} ` +
          `es $${maxAllowedPerPeriod.toLocaleString('es-CO', { maximumFractionDigits: 0 })}.`,
        );
        recommendations.push(
          this.i18n.t('finance.REDUCE_OR_EXTEND_RECOMMENDATION'),
        );
      }
    } else {
      recommendations.push(
        this.i18n.t('finance.REGISTER_INCOME_RECOMMENDATION'),
      );
    }

    // 8. Sin perfil financiero
    if (!hasFinancialProfile) {
      recommendations.push(
        this.i18n.t('finance.LOAD_PROFILE_RECOMMENDATION'),
      );
    }

    const response: CalculateQuotaResponseDto = {
      target_amount: dto.target_amount,
      current_balance: dto.current_balance ?? 0,
      amount_to_save: amountToSave,
      start_date: startDate,
      end_date: dto.end_date,
      frequency: dto.frequency,
      total_periods: totalPeriods,
      days_in_period: diffDays,
      quota_amount: Math.round(quotaAmount * 100) / 100,
      monthly_income: monthlyIncome,
      savings_ratio: savingsRatio,
      max_allowed_per_period: maxAllowedPerPeriod ? Math.round(maxAllowedPerPeriod * 100) / 100 : null,
      is_within_budget: isWithinBudget,
      bank: null,
      current_profitability: currentProfitability,
      projected_final_balance: projectedFinalBalance,
      has_financial_profile: hasFinancialProfile,
      warnings,
      recommendations,
    };

    await this.logCalculation(userId, response);

    return response;
  }

  private async logCalculation(userId: number, response: CalculateQuotaResponseDto): Promise<void> {
    try {
      await this.auditLogService.write({
        schema_name: 'finance',
        table_name: 'financial_objective',
        record_id: 0,
        action: AuditActionEnum.INSERT,
        changed_by: userId,
        new_data: {
          type: 'quota_calculation',
          target_amount: response.target_amount,
          current_balance: response.current_balance,
          amount_to_save: response.amount_to_save,
          frequency: response.frequency,
          total_periods: response.total_periods,
          quota_amount: response.quota_amount,
          monthly_income_visible: response.monthly_income !== null,
          savings_ratio: response.savings_ratio,
          is_within_budget: response.is_within_budget,
          has_financial_profile: response.has_financial_profile,
          start_date: response.start_date,
          end_date: response.end_date,
        },
      });
    } catch (error) {
      this.logger.warn(`No se pudo registrar audit log para cálculo de cuota del usuario ${userId}: ${(error as Error).message}`);
    }
  }
}
