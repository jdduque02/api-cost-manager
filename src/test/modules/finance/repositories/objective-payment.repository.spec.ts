import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { ObjectivePaymentRepository } from '@finance/repositories/objective-payment.repository';
import { ObjectivePayment } from '@finance/entities/objective-payment.entity';
import { CreateObjectivePaymentDto } from '@finance/dto/objective-payment/create-objective-payment.dto';

const mockTypeOrmRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

const mockI18nService = {
  t: jest.fn((key: string) => `[${key}]`),
};

const buildPayment = (overrides = {}): ObjectivePayment =>
  ({
    id: 1,
    user_id: 10,
    objective_id: 5,
    amount: 200,
    payment_date: new Date('2024-01-15'),
    ...overrides,
  }) as unknown as ObjectivePayment;

describe('ObjectivePaymentRepository', () => {
  let repo: ObjectivePaymentRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectivePaymentRepository,
        {
          provide: getRepositoryToken(ObjectivePayment),
          useValue: mockTypeOrmRepo,
        },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    repo = module.get<ObjectivePaymentRepository>(ObjectivePaymentRepository);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto: CreateObjectivePaymentDto = {
      objective_id: 5,
      amount: 200,
      payment_date: new Date('2024-01-15'),
    };

    it('debe crear y guardar el pago exitosamente', async () => {
      const payment = buildPayment();
      mockTypeOrmRepo.create.mockReturnValue(payment);
      mockTypeOrmRepo.save.mockResolvedValue(payment);

      const result = await repo.create(10, dto);

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith({
        ...dto,
        user_id: 10,
      });
      expect(result).toEqual(payment);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findByObjective
  // ─────────────────────────────────────────────────────────────
  describe('findByObjective', () => {
    it('debe retornar los pagos del objetivo', async () => {
      const list = [buildPayment(), buildPayment({ id: 2, amount: 300 })];
      mockTypeOrmRepo.find.mockResolvedValue(list);

      const result = await repo.findByObjective(5, 10);

      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { objective_id: 5, user_id: 10 },
        order: { payment_date: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('debe retornar el pago existente', async () => {
      const payment = buildPayment();
      mockTypeOrmRepo.findOne.mockResolvedValue(payment);

      const result = await repo.findById(1, 10);

      expect(result).toEqual(payment);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repo.findById(999, 10)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('debe eliminar el pago del repositorio', async () => {
      const payment = buildPayment();
      mockTypeOrmRepo.findOne.mockResolvedValue(payment);
      mockTypeOrmRepo.remove.mockResolvedValue(undefined);

      await repo.remove(1, 10);

      expect(mockTypeOrmRepo.remove).toHaveBeenCalledWith(payment);
    });

    it('debe lanzar NotFoundException si no existe el pago', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repo.remove(999, 10)).rejects.toThrow(NotFoundException);
    });
  });
});
