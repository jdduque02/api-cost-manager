import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { EncryptionService } from '@shared/services/encryption.service';
import { FinancialObjectiveRepository } from '@finance/repositories/financial-objective.repository';
import { FinancialObjective } from '@finance/entities/financial-objective.entity';
import { BankAccount } from '@banking/entities/bank-account.entity';
import { CreateFinancialObjectiveDto } from '@finance/dto/financial-objective/create-financial-objective.dto';
import { UpdateFinancialObjectiveDto } from '@finance/dto/financial-objective/update-financial-objective.dto';
import { FinancialObjectiveTypeEnum } from '@shared/enums';

const mockTypeOrmRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  merge: jest.fn(),
  softRemove: jest.fn(),
};

const mockBankAccountRepo = {
  findOne: jest.fn(),
};

const mockI18nService = {
  t: jest.fn((key: string) => `[${key}]`),
};

const mockEncryptionService = {
  encryptField: jest.fn((v: string | null) => v),
  decryptField: jest.fn((v: string | null) => v),
};

const buildObjective = (overrides = {}): FinancialObjective =>
  ({
    id: 1,
    user_id: 10,
    name: 'Fondo de emergencia',
    target_amount: 5000,
    current_balance: 0,
    is_completed: false,
    completed_at: null,
    type: FinancialObjectiveTypeEnum.SAVINGS,
    deleted_at: null,
    ...overrides,
  }) as unknown as FinancialObjective;

describe('FinancialObjectiveRepository', () => {
  let repo: FinancialObjectiveRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialObjectiveRepository,
        {
          provide: getRepositoryToken(FinancialObjective),
          useValue: mockTypeOrmRepo,
        },
        {
          provide: getRepositoryToken(BankAccount),
          useValue: mockBankAccountRepo,
        },
        { provide: I18nService, useValue: mockI18nService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    repo = module.get<FinancialObjectiveRepository>(
      FinancialObjectiveRepository,
    );
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto: CreateFinancialObjectiveDto = {
      name: 'Fondo de emergencia',
      target_amount: 5000,
      type: FinancialObjectiveTypeEnum.SAVINGS,
    };

    it('debe crear y guardar el objetivo con saldo 0 y campos de progreso', async () => {
      const objective = buildObjective();
      mockTypeOrmRepo.create.mockReturnValue(objective);
      mockTypeOrmRepo.save.mockResolvedValue(objective);

      const result = await repo.create(10, dto);

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith({
        ...dto,
        user_id: 10,
        current_balance: 0,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          user_id: 10,
          current_balance: 0,
          is_completed: false,
          amount_remaining: 5000,
          progress_percent: 0,
          days_remaining: null,
        }),
      );
    });

    it('debe auto-completar la meta si el saldo inicial alcanza el objetivo', async () => {
      const dtoReached: CreateFinancialObjectiveDto = {
        name: 'Meta cumplida',
        target_amount: 5000,
        current_balance: 5000,
        type: FinancialObjectiveTypeEnum.SAVINGS,
      };
      const objective = buildObjective({ current_balance: 5000 });
      mockTypeOrmRepo.create.mockReturnValue(objective);
      mockTypeOrmRepo.save.mockResolvedValue(objective);

      const result = await repo.create(10, dtoReached);

      expect(objective.is_completed).toBe(true);
      expect(objective.completed_at).toBeInstanceOf(Date);
      expect(result.progress_percent).toBe(100);
      expect(result.amount_remaining).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('debe retornar objetivos del usuario sin soft-delete', async () => {
      const list = [
        buildObjective(),
        buildObjective({ id: 2, name: 'Vacaciones' }),
      ];
      mockTypeOrmRepo.find.mockResolvedValue(list);

      const result = await repo.findAll(10);

      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { user_id: 10, deleted_at: IsNull() },
        order: { created_at: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({ amount_remaining: 5000 }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('debe retornar el objetivo existente', async () => {
      const objective = buildObjective();
      mockTypeOrmRepo.findOne.mockResolvedValue(objective);

      const result = await repo.findById(1, 10);

      expect(result).toEqual(
        expect.objectContaining({ id: 1, user_id: 10 }),
      );
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
    const dto: UpdateFinancialObjectiveDto = { name: 'Fondo actualizado' };

    it('debe actualizar y retornar el objetivo', async () => {
      const existing = buildObjective();
      const updated = buildObjective({ name: 'Fondo actualizado' });
      mockTypeOrmRepo.findOne.mockResolvedValue(existing);
      mockTypeOrmRepo.merge.mockReturnValue(updated);
      mockTypeOrmRepo.save.mockResolvedValue(updated);

      const result = await repo.update(1, 10, dto);

      expect(result.name).toBe('Fondo actualizado');
    });

    it('debe respetar el completado explícito del usuario', async () => {
      const existing = buildObjective();
      const updated = buildObjective();
      mockTypeOrmRepo.findOne.mockResolvedValue(existing);
      mockTypeOrmRepo.merge.mockReturnValue(updated);
      mockTypeOrmRepo.save.mockResolvedValue(updated);

      const result = await repo.update(1, 10, { is_completed: true });

      expect(result.is_completed).toBe(true);
      expect(result.completed_at).toBeInstanceOf(Date);
    });

    it('debe reevaluar el completado automáticamente al cambiar montos', async () => {
      const existing = buildObjective();
      const updated = buildObjective({ current_balance: 6000 });
      mockTypeOrmRepo.findOne.mockResolvedValue(existing);
      mockTypeOrmRepo.merge.mockReturnValue(updated);
      mockTypeOrmRepo.save.mockResolvedValue(updated);

      const result = await repo.update(1, 10, { current_balance: 6000 });

      expect(result.is_completed).toBe(true);
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
    it('debe ejecutar softRemove sobre el objetivo', async () => {
      const objective = buildObjective();
      mockTypeOrmRepo.findOne.mockResolvedValue(objective);
      mockTypeOrmRepo.softRemove.mockResolvedValue(undefined);

      await repo.softDelete(1, 10);

      expect(mockTypeOrmRepo.softRemove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, user_id: 10 }),
      );
    });

    it('debe lanzar NotFoundException si no existe el objetivo', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      await expect(repo.softDelete(999, 10)).rejects.toThrow(NotFoundException);
    });
  });
});
