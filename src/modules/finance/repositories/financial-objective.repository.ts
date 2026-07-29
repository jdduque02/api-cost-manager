import { ConflictException, Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { IsNull, Repository } from 'typeorm';
import { FinancialObjective } from '@finance/entities/financial-objective.entity';
import { CreateFinancialObjectiveDto } from '@finance/dto/financial-objective/create-financial-objective.dto';
import { UpdateFinancialObjectiveDto } from '@finance/dto/financial-objective/update-financial-objective.dto';
import { EncryptionService } from '@shared/services/encryption.service';

@Injectable()
export class FinancialObjectiveRepository {
  private readonly logger = new Logger(FinancialObjectiveRepository.name);

  constructor(
    @InjectRepository(FinancialObjective)
    private readonly repo: Repository<FinancialObjective>,
    @Inject(I18nService) private readonly i18n: I18nService,
    private readonly encryptionService: EncryptionService,
  ) {}

  private readonly SCHEMA = 'finance';

  async create(userId: number, dto: CreateFinancialObjectiveDto): Promise<FinancialObjective> {
    const encrypted = { ...dto };
    if (encrypted.bank !== undefined && encrypted.bank !== null) {
      encrypted.bank = this.encryptionService.encryptField(encrypted.bank, this.SCHEMA) as unknown as string;
    }
    const objective = this.repo.create({ ...encrypted, user_id: userId });
    const saved = await this.repo.save(objective);
    this.logger.log(`Objetivo financiero creado para usuario ID: ${userId}`);
    return this.decryptBank(saved);
  }

  async findAll(userId: number): Promise<FinancialObjective[]> {
    const objectives = await this.repo.find({
      where: { user_id: userId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
    });
    return objectives.map((o) => this.decryptBank(o));
  }

  async findById(id: number, userId: number): Promise<FinancialObjective> {
    const objective = await this.repo.findOne({ where: { id, user_id: userId, deleted_at: IsNull() } });
    if (!objective) throw new NotFoundException(this.i18n.t('finance.OBJECTIVE_NOT_FOUND', { args: { id } }));
    return this.decryptBank(objective);
  }

  async update(id: number, userId: number, dto: UpdateFinancialObjectiveDto): Promise<FinancialObjective> {
    const objective = await this.findById(id, userId);

    const encrypted = { ...dto };
    if (encrypted.bank !== undefined && encrypted.bank !== null) {
      encrypted.bank = this.encryptionService.encryptField(encrypted.bank, this.SCHEMA) as unknown as string;
    }

    const updated = this.repo.merge(objective, encrypted as Partial<FinancialObjective>);
    const saved = await this.repo.save(updated);
    this.logger.log(`Objetivo financiero ID ${id} actualizado para usuario ID: ${userId}`);
    return this.decryptBank(saved);
  }

  async softDelete(id: number, userId: number): Promise<void> {
    const objective = await this.findById(id, userId);
    await this.repo.softRemove(objective);
    this.logger.log(`Objetivo financiero ID ${id} eliminado (soft) para usuario ID: ${userId}`);
  }

  private decryptBank(objective: FinancialObjective): FinancialObjective {
    const result = { ...objective };
    if (result.bank) {
      result.bank = this.encryptionService.decryptField(result.bank, this.SCHEMA);
    }
    return result;
  }
}
