import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { TransactionRecordRepository } from '@finance/repositories/transaction-record.repository';
import { TransactionRecord } from '@finance/entities/transaction-record.entity';
import { FinancialObjective } from '@finance/entities/financial-objective.entity';
import { CreateTransactionRecordDto } from '@finance/dto/transaction-record/create-transaction-record.dto';
import { UpdateTransactionRecordDto } from '@finance/dto/transaction-record/update-transaction-record.dto';
import { TransactionRecordQueryDto } from '@finance/dto/transaction-record/transaction-record-query.dto';
import { BankAccount } from '@banking/entities/bank-account.entity';
import { FinancialAsset } from '@banking/entities/financial-asset.entity';
import { FinancialLiability } from '@banking/entities/financial-liability.entity';
import { EncryptionService } from '@shared/services/encryption.service';

// ─────────────────────────────────────────────────────────────
// QueryBuilder mock
// ─────────────────────────────────────────────────────────────
const mockQb = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getManyAndCount: jest.fn(),
  getRawMany: jest.fn(),
};

const mockTypeOrmRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  merge: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

const mockManager = {
  getRepository: jest.fn().mockReturnValue(mockTypeOrmRepo),
};

const mockDataSource = {
  transaction: jest.fn((cb: (manager: typeof mockManager) => unknown) =>
    cb(mockManager),
  ),
};

const mockEncryptionService = {
  encryptField: jest.fn((v: string | null) => v),
  decryptField: jest.fn((v: string | null) => v),
};

const mockI18nService = {
  t: jest.fn().mockReturnValue('Transacción no encontrada'),
};

const buildRecord = (overrides = {}): TransactionRecord =>
  ({
    id: 1,
    user_id: 10,
    amount: 100,
    type: 'EXPENSE',
    category_id: 1,
    deleted_at: null,
    transaction_date: new Date('2024-01-15'),
    created_at: new Date('2024-01-15'),
    objective_id: null,
    account_id: null,
    asset_id: null,
    liability_id: null,
    ...overrides,
  }) as unknown as TransactionRecord;

const linkedRepos = new Map<string, any>([
  [FinancialObjective.name, { ...mockTypeOrmRepo }],
  [BankAccount.name, { ...mockTypeOrmRepo }],
  [FinancialAsset.name, { ...mockTypeOrmRepo }],
  [FinancialLiability.name, { ...mockTypeOrmRepo }],
]);

describe('TransactionRecordRepository', () => {
  let repo: TransactionRecordRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRecordRepository,
        {
          provide: getRepositoryToken(TransactionRecord),
          useValue: mockTypeOrmRepo,
        },
        { provide: I18nService, useValue: mockI18nService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    repo = module.get<TransactionRecordRepository>(TransactionRecordRepository);
    jest.clearAllMocks();
    // restaurar encadenamiento del QB después del clearAllMocks
    mockQb.where.mockReturnThis();
    mockQb.andWhere.mockReturnThis();
    mockQb.orderBy.mockReturnThis();
    mockQb.addOrderBy.mockReturnThis();
    mockQb.take.mockReturnThis();
    mockQb.skip.mockReturnThis();
    mockQb.select.mockReturnThis();
    mockQb.addSelect.mockReturnThis();
    mockQb.groupBy.mockReturnThis();
    mockQb.addGroupBy.mockReturnThis();
    mockQb.setParameter.mockReturnThis();
    mockTypeOrmRepo.createQueryBuilder.mockReturnValue(mockQb);
    mockManager.getRepository.mockImplementation((entity: any) => {
      if (entity === TransactionRecord) return mockTypeOrmRepo;
      return linkedRepos.get(entity?.name) ?? mockTypeOrmRepo;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto: CreateTransactionRecordDto = {
      amount: 100,
      type: 'EXPENSE' as any,
      category_id: 1,
    };

    it('debe crear y guardar la transacción exitosamente', async () => {
      const record = buildRecord();
      mockTypeOrmRepo.create.mockReturnValue(record);
      mockTypeOrmRepo.save.mockResolvedValue(record);

      const result = await repo.create(10, dto);

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith({
        ...dto,
        user_id: 10,
      });
      expect(result).toEqual(record);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // vínculos meta / patrimonio (ajuste de saldos)
  // ─────────────────────────────────────────────────────────────
  describe('vínculos meta / patrimonio', () => {
    const defaultLinkedEntity = {
      objective: { id: 3, user_id: 10, current_balance: 1000 },
      account: { id: 1, user_id: 10, encrypted_balance: '1000' },
      asset: { id: 2, user_id: 10, current_value: 500 },
      liability: { id: 4, user_id: 10, current_balance: 2000 },
    };

    beforeEach(() => {
      mockTypeOrmRepo.save.mockImplementation((entity: any) =>
        Promise.resolve(entity),
      );
      mockTypeOrmRepo.findOneBy.mockImplementation((criteria: any) => {
        const entity =
          criteria?.id === 999
            ? null
            : {
                ...defaultLinkedEntity[
                  criteria?.id === 3
                    ? 'objective'
                    : criteria?.id === 1
                      ? 'account'
                      : criteria?.id === 2
                        ? 'asset'
                        : 'liability'
                ],
              };
        return Promise.resolve(entity);
      });
    });

    it('create: ingreso vinculado a una meta suma a current_balance', async () => {
      const saved = buildRecord({
        amount: 100,
        type: 'income',
        objective_id: 3,
      });
      mockTypeOrmRepo.create.mockReturnValue(saved);

      await repo.create(10, {
        amount: 100,
        type: 'income' as any,
        category_id: 1,
        objective_id: 3,
      });

      const objectiveSave = mockTypeOrmRepo.save.mock.calls.find(
        (call) => call[0]?.current_balance !== undefined && call[0]?.id === 3,
      );
      expect(objectiveSave).toBeDefined();
      expect(objectiveSave![0].current_balance).toBe(1100);
    });

    it('create: gasto vinculado a un pasivo reduce su saldo (abono)', async () => {
      const saved = buildRecord({
        amount: 250,
        type: 'expense',
        liability_id: 4,
      });
      mockTypeOrmRepo.create.mockReturnValue(saved);

      await repo.create(10, {
        amount: 250,
        type: 'expense' as any,
        category_id: 1,
        liability_id: 4,
      });

      const liabilitySave = mockTypeOrmRepo.save.mock.calls.find(
        (call) => call[0]?.current_balance !== undefined && call[0]?.id === 4,
      );
      expect(liabilitySave).toBeDefined();
      expect(liabilitySave![0].current_balance).toBe(1750);
    });

    it('update: cambio de monto de transacción vinculada a cuenta ajusta el saldo (revert + apply)', async () => {
      const old = buildRecord({ amount: 100, type: 'expense', account_id: 1 });
      const updated = buildRecord({
        amount: 150,
        type: 'expense',
        account_id: 1,
      });
      mockTypeOrmRepo.findOne.mockResolvedValue(old);
      mockTypeOrmRepo.merge.mockReturnValue(updated);

      await repo.update(1, 10, { amount: 150 });

      const accountSave = mockTypeOrmRepo.save.mock.calls.find(
        (call) => call[0]?.encrypted_balance !== undefined && call[0]?.id === 1,
      );
      expect(accountSave).toBeDefined();
      expect(accountSave![0].encrypted_balance).toBe('950');
    });

    it('update: vincular una meta por actualización suma al saldo aunque merge mute `old`', async () => {
      const old = buildRecord({ type: 'expense', objective_id: null });
      const linked = buildRecord({ type: 'investment', objective_id: 3 });
      mockTypeOrmRepo.findOne.mockResolvedValue(old);
      // Simula Repository.merge(): muta `old` en su lugar en lugar de
      // devolver un objeto nuevo; así el snapshot previo es imprescindible.
      mockTypeOrmRepo.merge.mockImplementation((target: any) => {
        Object.assign(target, linked);
        return target;
      });

      await repo.update(1, 10, { type: 'investment', objective_id: 3 });

      const objectiveSave = mockTypeOrmRepo.save.mock.calls.find(
        (call) => call[0]?.current_balance !== undefined && call[0]?.id === 3,
      );
      expect(objectiveSave).toBeDefined();
      expect(objectiveSave![0].current_balance).toBe(1100);
    });

    it('softDelete: eliminar transacción vinculada a activo revierte el valor', async () => {
      const old = buildRecord({ amount: 100, type: 'investment', asset_id: 2 });
      mockTypeOrmRepo.findOne.mockResolvedValue(old);

      await repo.softDelete(1, 10);

      const assetSave = mockTypeOrmRepo.save.mock.calls.find(
        (call) => call[0]?.current_value !== undefined && call[0]?.id === 2,
      );
      expect(assetSave).toBeDefined();
      expect(assetSave![0].current_value).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('debe retornar transacciones con paginación básica', async () => {
      const records = [buildRecord()];
      mockQb.getManyAndCount.mockResolvedValue([records, 1]);

      const query: TransactionRecordQueryDto = { page: 1, limit: 20 };
      const result = await repo.findAll(10, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQb.where).toHaveBeenCalledWith('tr.user_id = :userId', {
        userId: 10,
      });
    });

    it('debe aplicar filtros opcionales cuando se proveen', async () => {
      const records = [buildRecord()];
      mockQb.getManyAndCount.mockResolvedValue([records, 1]);

      const query: TransactionRecordQueryDto = {
        page: 1,
        limit: 10,
        category_id: 1,
        subcategory_id: 2,
        type: 'EXPENSE' as any,
        date_from: new Date('2024-01-01'),
        date_to: new Date('2024-01-31'),
      };
      await repo.findAll(10, query);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'tr.transaction_date >= :date_from',
        { date_from: query.date_from },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'tr.transaction_date <= :date_to',
        { date_to: query.date_to },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'tr.category_id = :category_id',
        { category_id: 1 },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'tr.subcategory_id = :subcategory_id',
        { subcategory_id: 2 },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith('tr.type = :type', {
        type: 'EXPENSE',
      });
    });

    it('debe limitar el page size a 500', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await repo.findAll(10, { page: 1, limit: 500 });

      expect(mockQb.take).toHaveBeenCalledWith(500);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('debe retornar la transacción existente', async () => {
      const record = buildRecord();
      mockTypeOrmRepo.findOne.mockResolvedValue(record);

      const result = await repo.findById(1, 10);

      expect(result).toEqual(record);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repo.findById(999, 10)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findFixedForReminders
  // ─────────────────────────────────────────────────────────────
  describe('findFixedForReminders', () => {
    it('debe filtrar transacciones fijas con due_day definido y created_at acotado', async () => {
      const records = [buildRecord({ id: 7, is_fixed: true, due_day: 15 })];
      mockQb.getMany.mockResolvedValue(records);

      const from = new Date('2025-08-02');
      const result = await repo.findFixedForReminders(from);

      expect(mockQb.where).toHaveBeenCalledWith('tr.deleted_at IS NULL');
      expect(mockQb.andWhere).toHaveBeenCalledWith('tr.is_fixed = TRUE');
      expect(mockQb.andWhere).toHaveBeenCalledWith('tr.due_day IS NOT NULL');
      expect(mockQb.andWhere).toHaveBeenCalledWith('tr.created_at >= :from', {
        from,
      });
      expect(result).toEqual(records);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getSummary
  // ─────────────────────────────────────────────────────────────
  describe('getSummary', () => {
    it('debe calcular totales, categorías y serie a partir de raw rows', async () => {
      mockQb.getRawMany
        .mockResolvedValueOnce([
          { type: 'income', amount: '1000', count: '2' },
          { type: 'expense', amount: '400', count: '3' },
        ])
        .mockResolvedValueOnce([
          { category_id: 1, type: 'expense', amount: '400', count: '3' },
        ])
        .mockResolvedValueOnce([
          { bucket: '2026-08-03', type: 'income', amount: '1000', count: '2' },
          { bucket: '2026-08-03', type: 'expense', amount: '400', count: '3' },
        ]);

      const result = await repo.getSummary(10, {
        date_from: '2026-08-01',
        date_to: '2026-08-31',
        group_by: 'day',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'tr.transaction_date >= :from',
        { from: '2026-08-01' },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'tr.transaction_date <= :to',
        { to: '2026-08-31' },
      );
      expect(mockQb.setParameter).toHaveBeenCalledWith('trunc', 'day');
      expect(result.totals).toEqual({
        income: 1000,
        expenses: 400,
        investments: 0,
        count: 5,
      });
      expect(result.by_category).toHaveLength(1);
      expect(result.by_category[0]).toMatchObject({
        category_id: 1,
        expenses: 400,
        count: 3,
      });
      expect(result.series).toHaveLength(1);
      expect(result.series[0]).toMatchObject({
        key: '2026-08-03',
        income: 1000,
        expenses: 400,
        count: 5,
      });
    });

    it('debe aplicar el filtro de tipo y el grupo semanal cuando se proveen', async () => {
      mockQb.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await repo.getSummary(10, { type: 'expense', group_by: 'week' });

      const typeCalls = mockQb.andWhere.mock.calls.filter(
        (c) => c[0] === 'tr.type = :type',
      );
      expect(typeCalls.length).toBeGreaterThan(0);
      expect(typeCalls[0][1]).toEqual({ type: 'expense' });
      expect(mockQb.setParameter).toHaveBeenCalledWith('trunc', 'week');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────────────────────
  describe('update', () => {
    const dto: UpdateTransactionRecordDto = { amount: 250 };

    it('debe actualizar y retornar la transacción', async () => {
      const existing = buildRecord();
      const updated = buildRecord({ amount: 250 });
      mockTypeOrmRepo.findOne.mockResolvedValue(existing);
      mockTypeOrmRepo.merge.mockReturnValue(updated);
      mockTypeOrmRepo.save.mockResolvedValue(updated);

      const result = await repo.update(1, 10, dto);

      expect(result.amount).toBe(250);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repo.update(999, 10, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // softDelete
  // ─────────────────────────────────────────────────────────────
  describe('softDelete', () => {
    it('debe ejecutar softRemove sobre la transacción', async () => {
      const record = buildRecord();
      mockTypeOrmRepo.findOne.mockResolvedValue(record);
      mockTypeOrmRepo.softRemove.mockResolvedValue(undefined);

      await repo.softDelete(1, 10);

      expect(mockTypeOrmRepo.softRemove).toHaveBeenCalledWith(record);
    });

    it('debe lanzar NotFoundException si no existe la transacción', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repo.softDelete(999, 10)).rejects.toThrow(NotFoundException);
    });
  });
});
