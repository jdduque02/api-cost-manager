import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { FinancialSummary } from '@intelligence/entities/financial-summary.entity';
import { TaxSummary } from '@intelligence/entities/tax-summary.entity';
import { FinancialSummaryResponseDto } from '@intelligence/dto/financial-summary-response.dto';
import { TaxSummaryResponseDto } from '@intelligence/dto/tax-summary-response.dto';

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    @InjectRepository(FinancialSummary)
    private readonly financialSummaryRepo: Repository<FinancialSummary>,
    @InjectRepository(TaxSummary)
    private readonly taxSummaryRepo: Repository<TaxSummary>,
  ) {}

  async findFinancialSummary(userId: number): Promise<FinancialSummaryResponseDto> {
    const summary = await this.financialSummaryRepo.findOne({
      where: { user_id: userId, deleted_at: IsNull() },
      order: { calculated_at: 'DESC' },
    });
    if (!summary) {
      throw new NotFoundException(`No se encontró resumen financiero para el usuario ${userId}.`);
    }
    return this.mapFinancialSummary(summary);
  }

  async findFinancialSummaryByPeriod(userId: number, periodId: number): Promise<FinancialSummaryResponseDto> {
    const summary = await this.financialSummaryRepo.findOne({
      where: { user_id: userId, financial_period_id: periodId, deleted_at: IsNull() },
    });
    if (!summary) {
      throw new NotFoundException(`No se encontró resumen financiero para el período ${periodId}.`);
    }
    return this.mapFinancialSummary(summary);
  }

  async findTaxSummary(userId: number, fiscalYear?: number): Promise<TaxSummaryResponseDto> {
    const year = fiscalYear ?? new Date().getFullYear();
    const summary = await this.taxSummaryRepo.findOne({
      where: { user_id: userId, fiscal_year: year },
      order: { created_at: 'DESC' },
    });
    if (!summary) {
      throw new NotFoundException(`No se encontró resumen fiscal para el año ${year}.`);
    }
    return this.mapTaxSummary(summary);
  }

  private mapFinancialSummary(entity: FinancialSummary): FinancialSummaryResponseDto {
    return {
      id: entity.id,
      user_id: entity.user_id,
      financial_period_id: entity.financial_period_id,
      total_income: entity.total_income,
      total_expense: entity.total_expense,
      total_debt: entity.total_debt,
      net_worth: entity.net_worth,
      expense_ratio: entity.expense_ratio,
      debt_ratio: entity.debt_ratio,
      savings_rate: entity.savings_rate,
      recommended_max_expense: entity.recommended_max_expense,
      recommended_savings: entity.recommended_savings,
      is_over_spending: entity.is_over_spending,
      is_over_indebted: entity.is_over_indebted,
      insights: entity.insights ?? [],
      calculated_at: entity.calculated_at ?? null,
      is_final: entity.is_final,
    };
  }

  private mapTaxSummary(entity: TaxSummary): TaxSummaryResponseDto {
    return {
      id: entity.id,
      user_id: entity.user_id,
      fiscal_year: entity.fiscal_year,
      total_income: entity.total_income,
      total_assets: entity.total_assets,
      total_liabilities: entity.total_liabilities,
      patrimony: entity.patrimony,
      income_in_uvt: entity.income_in_uvt,
      assets_in_uvt: entity.assets_in_uvt,
      uvt_value: entity.uvt_value,
      must_declare: entity.must_declare,
      estimated_tax: entity.estimated_tax,
      created_at: entity.created_at,
    };
  }
}
