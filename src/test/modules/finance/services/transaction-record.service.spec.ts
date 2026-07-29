import { Test, TestingModule } from '@nestjs/testing';
import { TransactionRecordService } from '@finance/service/transaction-record.service';
import { TransactionRecordRepository } from '@finance/repositories/transaction-record.repository';
import { CreateTransactionRecordDto } from '@finance/dto/transaction-record/create-transaction-record.dto';
import { UpdateTransactionRecordDto } from '@finance/dto/transaction-record/update-transaction-record.dto';
import { TransactionRecordQueryDto } from '@finance/dto/transaction-record/transaction-record-query.dto';
import { NotFoundException } from '@nestjs/common';
import { TransactionTypeEnum } from '@shared/enums';

const mockTransactionRecordRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

const buildTransaction = (overrides = {}) => ({
  id: 1,
  user_id: 10,
  category_id: 2,
  type: TransactionTypeEnum.EXPENSE,
  amount: 50000,
  ...overrides,
});

describe('TransactionRecordService', () => {
  let service: TransactionRecordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRecordService,
        { provide: TransactionRecordRepository, useValue: mockTransactionRecordRepository },
      ],
    }).compile();

    service = module.get<TransactionRecordService>(TransactionRecordService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio', async () => {
      const dto: CreateTransactionRecordDto = {
        category_id: 2,
        type: TransactionTypeEnum.EXPENSE,
        amount: 50000,
      } as CreateTransactionRecordDto;
      const created = buildTransaction();
      mockTransactionRecordRepository.create.mockResolvedValue(created);

      const result = await service.create(10, dto);

      expect(mockTransactionRecordRepository.create).toHaveBeenCalledWith(10, dto);
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('debe delegar la búsqueda paginada al repositorio', async () => {
      const payload = { data: [buildTransaction()], total: 1 };
      const query: TransactionRecordQueryDto = { page: 1, limit: 20 };
      mockTransactionRecordRepository.findAll.mockResolvedValue(payload);

      const result = await service.findAll(10, query);

      expect(mockTransactionRecordRepository.findAll).toHaveBeenCalledWith(10, query);
      expect(result).toEqual(payload);
    });
  });

  describe('findOne', () => {
    it('debe retornar transacción por id', async () => {
      const tx = buildTransaction();
      mockTransactionRecordRepository.findById.mockResolvedValue(tx);

      const result = await service.findOne(1, 10);

      expect(mockTransactionRecordRepository.findById).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(tx);
    });

    it('debe propagar NotFoundException del repositorio', async () => {
      mockTransactionRecordRepository.findById.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(999, 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debe delegar la actualización al repositorio', async () => {
      const dto: UpdateTransactionRecordDto = { amount: 75000 };
      const updated = buildTransaction({ amount: 75000 });
      mockTransactionRecordRepository.update.mockResolvedValue(updated);

      const result = await service.update(1, 10, dto);

      expect(mockTransactionRecordRepository.update).toHaveBeenCalledWith(1, 10, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('debe delegar el soft delete al repositorio', async () => {
      mockTransactionRecordRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 10);

      expect(mockTransactionRecordRepository.softDelete).toHaveBeenCalledWith(1, 10);
    });
  });
});
