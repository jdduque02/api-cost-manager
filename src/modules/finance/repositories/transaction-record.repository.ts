import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import {
  DataSource,
  EntityManager,
  IsNull,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { TransactionRecord } from '@finance/entities/transaction-record.entity';
import { FinancialObjective } from '@finance/entities/financial-objective.entity';
import { CreateTransactionRecordDto } from '@finance/dto/transaction-record/create-transaction-record.dto';
import { UpdateTransactionRecordDto } from '@finance/dto/transaction-record/update-transaction-record.dto';
import { TransactionRecordQueryDto } from '@finance/dto/transaction-record/transaction-record-query.dto';
import { TransactionSummaryQueryDto } from '@finance/dto/transaction-record/transaction-summary-query.dto';
import { TransactionSummaryResponseDto } from '@finance/dto/transaction-record/transaction-summary-response.dto';
import { BankAccount } from '@banking/entities/bank-account.entity';
import { FinancialAsset } from '@banking/entities/financial-asset.entity';
import { FinancialLiability } from '@banking/entities/financial-liability.entity';
import { EncryptionService } from '@shared/services/encryption.service';
import { TransactionTypeEnum } from '@shared/enums';

interface SummaryRawRow {
  type: TransactionTypeEnum;
  amount: string;
  count: string;
}

interface CategoryRawRow extends SummaryRawRow {
  category_id: string;
}

interface SeriesRawRow extends SummaryRawRow {
  bucket: string | Date;
}

type LinkKind = 'objective' | 'account' | 'asset' | 'liability';

const LINK_KINDS: LinkKind[] = ['objective', 'account', 'asset', 'liability'];

/**
 * Contribución de una transacción sobre el saldo de un vínculo:
 * - objective:  ingreso/inversión suma, gasto resta.
 * - account:    ingreso suma, gasto/inversión resta.
 * - asset:      ingreso/inversión suma, gasto resta.
 * - liability:  cualquier transacción vinculada reduce el saldo (abono).
 */
function contribution(
  tx: Pick<TransactionRecord, 'type' | 'amount'>,
  kind: LinkKind,
): number {
  const amount = Number(tx.amount ?? 0);
  switch (kind) {
    case 'objective':
      return tx.type === TransactionTypeEnum.EXPENSE ? -amount : amount;
    case 'account':
      return tx.type === TransactionTypeEnum.INCOME ? amount : -amount;
    case 'asset':
      return tx.type === TransactionTypeEnum.EXPENSE ? -amount : amount;
    case 'liability':
      return -amount;
  }
}

@Injectable()
export class TransactionRecordRepository {
  private readonly logger = new Logger(TransactionRecordRepository.name);

  constructor(
    @InjectRepository(TransactionRecord)
    private readonly repo: Repository<TransactionRecord>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly encryptionService: EncryptionService,
    @Inject(I18nService) private readonly i18n: I18nService,
  ) {}

  async create(
    userId: number,
    dto: CreateTransactionRecordDto,
  ): Promise<TransactionRecord> {
    return this.dataSource.transaction(async (manager) => {
      const recordRepo = manager.getRepository(TransactionRecord);
      const record = recordRepo.create({ ...dto, user_id: userId });
      const saved = await recordRepo.save(record);
      await this.applyLinkAdjustments(manager, null, saved);
      this.logger.log(`Transacción creada para usuario ID: ${userId}`);
      return saved;
    });
  }

  async findAll(
    userId: number,
    query: TransactionRecordQueryDto,
  ): Promise<{ data: TransactionRecord[]; total: number }> {
    const {
      category_id,
      subcategory_id,
      type,
      date_from,
      date_to,
      objective_id,
      account_id,
      asset_id,
      liability_id,
      page = 1,
      limit = 20,
    } = query;

    // CRÍTICO: Siempre filtrar por user_id y soft-delete. El rango de fechas
    // se aplica sobre transaction_date (fecha de negocio).
    const qb = this.repo
      .createQueryBuilder('tr')
      .where('tr.user_id = :userId', { userId })
      .andWhere('tr.deleted_at IS NULL')
      .orderBy('tr.transaction_date', 'DESC')
      .addOrderBy('tr.id', 'DESC')
      .take(Math.min(limit, 500))
      .skip((page - 1) * limit);

    if (date_from)
      qb.andWhere('tr.transaction_date >= :date_from', { date_from });
    if (date_to) qb.andWhere('tr.transaction_date <= :date_to', { date_to });
    if (category_id)
      qb.andWhere('tr.category_id = :category_id', { category_id });
    if (subcategory_id)
      qb.andWhere('tr.subcategory_id = :subcategory_id', { subcategory_id });
    if (type) qb.andWhere('tr.type = :type', { type });
    if (objective_id)
      qb.andWhere('tr.objective_id = :objective_id', { objective_id });
    if (account_id) qb.andWhere('tr.account_id = :account_id', { account_id });
    if (asset_id) qb.andWhere('tr.asset_id = :asset_id', { asset_id });
    if (liability_id)
      qb.andWhere('tr.liability_id = :liability_id', { liability_id });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: number, userId: number): Promise<TransactionRecord> {
    const record = await this.repo.findOne({
      where: { id, user_id: userId, deleted_at: IsNull() },
    });
    if (!record)
      throw new NotFoundException(
        this.i18n.t('finance.TRANSACTION_NOT_FOUND', { args: { id } }),
      );
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

  async update(
    id: number,
    userId: number,
    dto: UpdateTransactionRecordDto,
  ): Promise<TransactionRecord> {
    const old = await this.findById(id, userId);
    return this.dataSource.transaction(async (manager) => {
      const recordRepo = manager.getRepository(TransactionRecord);
      const merged = recordRepo.merge(old, dto);
      const saved = await recordRepo.save(merged);
      await this.applyLinkAdjustments(manager, old, saved);
      this.logger.log(
        `Transacción ID ${id} actualizada para usuario ID: ${userId}`,
      );
      return saved;
    });
  }

  async softDelete(id: number, userId: number): Promise<void> {
    const old = await this.findById(id, userId);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(TransactionRecord).softRemove(old);
      await this.applyLinkAdjustments(manager, old, null);
    });
    this.logger.log(
      `Transacción ID ${id} eliminada (soft) para usuario ID: ${userId}`,
    );
  }

  /**
   * Ajusta los saldos de las entidades vinculadas (meta/patrimonio) de forma
   * atómica junto con la transacción. Revertir el efecto del estado anterior
   * y aplicar el del nuevo, dentro de la misma transacción de BD.
   */
  private async applyLinkAdjustments(
    manager: EntityManager,
    old: TransactionRecord | null,
    updated: TransactionRecord | null,
  ): Promise<void> {
    const net = new Map<string, number>();
    this.collectContributions(old, -1, net);
    this.collectContributions(updated, 1, net);

    for (const [key, delta] of net) {
      if (delta === 0) continue;
      const sep = key.indexOf(':');
      const kind = key.slice(0, sep) as LinkKind;
      const id = Number(key.slice(sep + 1));
      await this.applyToEntity(manager, kind, id, delta);
    }
  }

  private collectContributions(
    tx: TransactionRecord | null,
    sign: number,
    net: Map<string, number>,
  ): void {
    if (!tx) return;
    for (const kind of LINK_KINDS) {
      const id = tx[`${kind}_id` as keyof TransactionRecord] as
        number | null | undefined;
      if (id == null) continue;
      const key = `${kind}:${id}`;
      net.set(key, (net.get(key) ?? 0) + sign * contribution(tx, kind));
    }
  }

  private async applyToEntity(
    manager: EntityManager,
    kind: LinkKind,
    id: number,
    delta: number,
  ): Promise<void> {
    switch (kind) {
      case 'account': {
        const account = await manager
          .getRepository(BankAccount)
          .findOneBy({ id });
        if (!account) return;
        const current = Number(
          account.encrypted_balance
            ? this.encryptionService.decryptField(
                account.encrypted_balance,
                'banking',
              )
            : '0',
        );
        const next = current + delta;
        account.encrypted_balance = this.encryptionService.encryptField(
          String(next),
          'banking',
        );
        await manager.getRepository(BankAccount).save(account);
        return;
      }
      case 'objective': {
        const objective = await manager
          .getRepository(FinancialObjective)
          .findOneBy({ id });
        if (!objective) return;
        objective.current_balance =
          Number(objective.current_balance ?? 0) + delta;
        await manager.getRepository(FinancialObjective).save(objective);
        return;
      }
      case 'asset': {
        const asset = await manager
          .getRepository(FinancialAsset)
          .findOneBy({ id });
        if (!asset) return;
        asset.current_value = Number(asset.current_value ?? 0) + delta;
        await manager.getRepository(FinancialAsset).save(asset);
        return;
      }
      case 'liability': {
        const liability = await manager
          .getRepository(FinancialLiability)
          .findOneBy({ id });
        if (!liability) return;
        liability.current_balance =
          Number(liability.current_balance ?? 0) + delta;
        await manager.getRepository(FinancialLiability).save(liability);
        return;
      }
    }
  }

  /**
   * Resumen/agregación por intervalos de tiempo. Agrupa por transaction_date
   * (día/semana/mes) y devuelve totales + desglose por categoría.
   */
  async getSummary(
    userId: number,
    query: TransactionSummaryQueryDto,
  ): Promise<TransactionSummaryResponseDto> {
    const { date_from, date_to, group_by = 'day', type } = query;

    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, '0')}-01`;
    const defaultTo = now.toISOString().slice(0, 10);
    const from = date_from ?? defaultFrom;
    const to = date_to ?? defaultTo;

    const applyFilters = (qb: SelectQueryBuilder<TransactionRecord>) => {
      qb.where('tr.user_id = :userId', { userId })
        .andWhere('tr.deleted_at IS NULL')
        .andWhere('tr.transaction_date >= :from', { from })
        .andWhere('tr.transaction_date <= :to', { to });
      if (type) qb.andWhere('tr.type = :type', { type });
      return qb;
    };

    const totalsRaw = await applyFilters(
      this.repo
        .createQueryBuilder('tr')
        .select('tr.type', 'type')
        .addSelect('COALESCE(SUM(tr.amount), 0)', 'amount')
        .addSelect('COUNT(*)', 'count'),
    )
      .groupBy('tr.type')
      .getRawMany<SummaryRawRow>();

    const categoryRaw = await applyFilters(
      this.repo
        .createQueryBuilder('tr')
        .select('tr.category_id', 'category_id')
        .addSelect('tr.type', 'type')
        .addSelect('COALESCE(SUM(tr.amount), 0)', 'amount')
        .addSelect('COUNT(*)', 'count'),
    )
      .groupBy('tr.category_id')
      .addGroupBy('tr.type')
      .getRawMany<CategoryRawRow>();

    const seriesRaw = await applyFilters(
      this.repo
        .createQueryBuilder('tr')
        .select('DATE_TRUNC(:trunc, tr.transaction_date)::date', 'bucket')
        .addSelect('tr.type', 'type')
        .addSelect('COALESCE(SUM(tr.amount), 0)', 'amount')
        .addSelect('COUNT(*)', 'count'),
    )
      .setParameter('trunc', group_by)
      .groupBy('DATE_TRUNC(:trunc, tr.transaction_date)::date')
      .addGroupBy('tr.type')
      .orderBy('DATE_TRUNC(:trunc, tr.transaction_date)::date', 'ASC')
      .getRawMany<SeriesRawRow>();

    const totals = { income: 0, expenses: 0, investments: 0, count: 0 };
    for (const row of totalsRaw) {
      const amount = Number(row.amount ?? 0);
      const count = Number(row.count ?? 0);
      totals.count += count;
      if (row.type === TransactionTypeEnum.INCOME) totals.income += amount;
      else if (row.type === TransactionTypeEnum.EXPENSE)
        totals.expenses += amount;
      else if (row.type === TransactionTypeEnum.INVESTMENT)
        totals.investments += amount;
    }

    const categoryMap = new Map<
      number,
      {
        category_id: number;
        income: number;
        expenses: number;
        investments: number;
        count: number;
      }
    >();
    for (const row of categoryRaw) {
      const categoryId = Number(row.category_id);
      const amount = Number(row.amount ?? 0);
      const count = Number(row.count ?? 0);
      const entry = categoryMap.get(categoryId) ?? {
        category_id: categoryId,
        income: 0,
        expenses: 0,
        investments: 0,
        count: 0,
      };
      entry.count += count;
      if (row.type === TransactionTypeEnum.INCOME) entry.income += amount;
      else if (row.type === TransactionTypeEnum.EXPENSE)
        entry.expenses += amount;
      else if (row.type === TransactionTypeEnum.INVESTMENT)
        entry.investments += amount;
      categoryMap.set(categoryId, entry);
    }
    const by_category = Array.from(categoryMap.values()).sort(
      (a, b) => b.expenses - a.expenses || b.income - a.income,
    );

    const seriesMap = new Map<
      string,
      {
        key: string;
        label: string;
        income: number;
        expenses: number;
        investments: number;
        count: number;
      }
    >();
    for (const row of seriesRaw) {
      // pg devuelve el tipo DATE (OID 1082) como objeto Date, no como string
      // "YYYY-MM-DD"; por eso no podemos depender de slice(0,10) sobre String().
      const rawBucket = row.bucket;
      const key =
        rawBucket instanceof Date
          ? `${rawBucket.getFullYear()}-${String(rawBucket.getMonth() + 1).padStart(2, '0')}-${String(rawBucket.getDate()).padStart(2, '0')}`
          : String(rawBucket ?? '').slice(0, 10);
      const amount = Number(row.amount ?? 0);
      const count = Number(row.count ?? 0);
      const entry = seriesMap.get(key) ?? {
        key,
        label: this.formatBucketLabel(key, group_by),
        income: 0,
        expenses: 0,
        investments: 0,
        count: 0,
      };
      entry.count += count;
      if (row.type === TransactionTypeEnum.INCOME) entry.income += amount;
      else if (row.type === TransactionTypeEnum.EXPENSE)
        entry.expenses += amount;
      else if (row.type === TransactionTypeEnum.INVESTMENT)
        entry.investments += amount;
      seriesMap.set(key, entry);
    }
    const series = Array.from(seriesMap.values());

    return {
      date_from: from,
      date_to: to,
      group_by,
      totals,
      by_category,
      series,
    };
  }

  private formatBucketLabel(key: string, groupBy: string): string {
    const date = new Date(`${key}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return key;
    if (groupBy === 'month') {
      return date.toLocaleDateString('es-CO', {
        month: 'short',
        year: 'numeric',
      });
    }
    if (groupBy === 'week') {
      return `Sem ${date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
      })}`;
    }
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
    });
  }
}
