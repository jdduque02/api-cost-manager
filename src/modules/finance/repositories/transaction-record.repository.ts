import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { Between, IsNull, Repository } from 'typeorm';
import { TransactionRecord } from '@finance/entities/transaction-record.entity';
import { CreateTransactionRecordDto } from '@finance/dto/transaction-record/create-transaction-record.dto';
import { UpdateTransactionRecordDto } from '@finance/dto/transaction-record/update-transaction-record.dto';
import { TransactionRecordQueryDto } from '@finance/dto/transaction-record/transaction-record-query.dto';

@Injectable()
export class TransactionRecordRepository {
  private readonly logger = new Logger(TransactionRecordRepository.name);

  constructor(
    @InjectRepository(TransactionRecord)
    private readonly repo: Repository<TransactionRecord>,
    @Inject(I18nService) private readonly i18n: I18nService,
  ) {}

  async create(userId: number, dto: CreateTransactionRecordDto): Promise<TransactionRecord> {
    const record = this.repo.create({ ...dto, user_id: userId });
    const saved = await this.repo.save(record);
    this.logger.log(`Transacción creada para usuario ID: ${userId}`);
    return saved;
  }

  async findAll(userId: number, query: TransactionRecordQueryDto): Promise<{ data: TransactionRecord[]; total: number }> {
    const { category_id, subcategory_id, type, date_from, date_to, page = 1, limit = 20 } = query;

    // CRÍTICO: Siempre filtrar por created_at para habilitar partition pruning
    const qb = this.repo
      .createQueryBuilder('tr')
      .where('tr.user_id = :userId', { userId })
      .andWhere('tr.deleted_at IS NULL')
      .orderBy('tr.created_at', 'DESC')
      .take(Math.min(limit, 100))
      .skip((page - 1) * limit);

    if (date_from) qb.andWhere('tr.created_at >= :date_from', { date_from });
    if (date_to) qb.andWhere('tr.created_at <= :date_to', { date_to });
    if (category_id) qb.andWhere('tr.category_id = :category_id', { category_id });
    if (subcategory_id) qb.andWhere('tr.subcategory_id = :subcategory_id', { subcategory_id });
    if (type) qb.andWhere('tr.type = :type', { type });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: number, userId: number): Promise<TransactionRecord> {
    const record = await this.repo.findOne({ where: { id, user_id: userId, deleted_at: IsNull() } });
    if (!record) throw new NotFoundException(this.i18n.t('finance.TRANSACTION_NOT_FOUND', { args: { id } }));
    return record;
  }

  /**
   * CRÍTICO: query para el scheduler de recordatorios.
   * SIEMPRE incluye created_at en el WHERE para habilitar partition pruning.
   */
  async findFixedForReminders(fromDate: Date): Promise<TransactionRecord[]> {
    return this.repo
      .createQueryBuilder('tr')
      .where('tr.deleted_at IS NULL')
      .andWhere('tr.is_fixed = TRUE')
      .andWhere('tr.due_day IS NOT NULL')
      .andWhere('tr.created_at >= :from', { from: fromDate })
      .getMany();
  }

  async update(id: number, userId: number, dto: UpdateTransactionRecordDto): Promise<TransactionRecord> {
    const record = await this.findById(id, userId);
    const updated = this.repo.merge(record, dto as Partial<TransactionRecord>);
    const saved = await this.repo.save(updated);
    this.logger.log(`Transacción ID ${id} actualizada para usuario ID: ${userId}`);
    return saved;
  }

  async softDelete(id: number, userId: number): Promise<void> {
    const record = await this.findById(id, userId);
    await this.repo.softRemove(record);
    this.logger.log(`Transacción ID ${id} eliminada (soft) para usuario ID: ${userId}`);
  }
}
