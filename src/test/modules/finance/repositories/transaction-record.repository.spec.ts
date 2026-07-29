import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionRecordRepository } from '@finance/repositories/transaction-record.repository';
import { TransactionRecord } from '@finance/entities/transaction-record.entity';
import { CreateTransactionRecordDto } from '@finance/dto/transaction-record/create-transaction-record.dto';
import { UpdateTransactionRecordDto } from '@finance/dto/transaction-record/update-transaction-record.dto';
import { TransactionRecordQueryDto } from '@finance/dto/transaction-record/transaction-record-query.dto';

// ─────────────────────────────────────────────────────────────
// QueryBuilder mock
// ─────────────────────────────────────────────────────────────
const mockQb = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
};

const mockTypeOrmRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  merge: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

const buildRecord = (overrides = {}): TransactionRecord =>
  ({
    id: 1,
    user_id: 10,
    amount: 100,
    type: 'EXPENSE',
    category_id: 1,
    deleted_at: null,
    created_at: new Date('2024-01-15'),
    ...overrides,
  }) as unknown as TransactionRecord;

describe('TransactionRecordRepository', () => {
  let repo: TransactionRecordRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRecordRepository,
        { provide: getRepositoryToken(TransactionRecord), useValue: mockTypeOrmRepo },
      ],
    }).compile();

    repo = module.get<TransactionRecordRepository>(TransactionRecordRepository);
    jest.clearAllMocks();
    // restaurar encadenamiento del QB después del clearAllMocks
    mockQb.where.mockReturnThis();
    mockQb.andWhere.mockReturnThis();
    mockQb.orderBy.mockReturnThis();
    mockQb.take.mockReturnThis();
    mockQb.skip.mockReturnThis();
    mockTypeOrmRepo.createQueryBuilder.mockReturnValue(mockQb);
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

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith({ ...dto, user_id: 10 });
      expect(result).toEqual(record);
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
      expect(mockQb.where).toHaveBeenCalledWith('tr.user_id = :userId', { userId: 10 });
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

      expect(mockQb.andWhere).toHaveBeenCalledWith('tr.created_at >= :date_from', { date_from: query.date_from });
      expect(mockQb.andWhere).toHaveBeenCalledWith('tr.created_at <= :date_to', { date_to: query.date_to });
      expect(mockQb.andWhere).toHaveBeenCalledWith('tr.category_id = :category_id', { category_id: 1 });
      expect(mockQb.andWhere).toHaveBeenCalledWith('tr.subcategory_id = :subcategory_id', { subcategory_id: 2 });
      expect(mockQb.andWhere).toHaveBeenCalledWith('tr.type = :type', { type: 'EXPENSE' });
    });

    it('debe limitar el page size a 100', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await repo.findAll(10, { page: 1, limit: 500 });

      expect(mockQb.take).toHaveBeenCalledWith(100);
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

      await expect(repo.update(999, 10, dto)).rejects.toThrow(NotFoundException);
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
