import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { FinancialObjectiveService } from '@finance/service/financial-objective.service';
import { FinancialObjectiveRepository } from '@finance/repositories/financial-objective.repository';
import { FinancialProfileRepository } from '@identity/repositories/financial-profile.repository';
import { UserRepository } from '@identity/repositories/app-user.repositories';
import { AuditLogService } from '@audit/service/audit-log.service';
import { CreateFinancialObjectiveDto } from '@finance/dto/financial-objective/create-financial-objective.dto';
import { UpdateFinancialObjectiveDto } from '@finance/dto/financial-objective/update-financial-objective.dto';
import { FinancialObjectiveTypeEnum } from '@shared/enums';

const mockFinancialObjectiveRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

const mockFinancialProfileRepository = {};

const mockAuditLogService = {
  log: jest.fn(),
};

const mockI18nService = {
  t: jest.fn((key: string) => `[${key}]`),
};

const buildObjective = (overrides = {}) => ({
  id: 1,
  user_id: 10,
  name: 'Fondo de emergencia',
  type: FinancialObjectiveTypeEnum.SAVINGS,
  target_amount: 5000000,
  ...overrides,
});

describe('FinancialObjectiveService', () => {
  let service: FinancialObjectiveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialObjectiveService,
        {
          provide: FinancialObjectiveRepository,
          useValue: mockFinancialObjectiveRepository,
        },
        {
          provide: FinancialProfileRepository,
          useValue: mockFinancialProfileRepository,
        },
        { provide: UserRepository, useValue: { findById: jest.fn() } },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<FinancialObjectiveService>(FinancialObjectiveService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio', async () => {
      const dto: CreateFinancialObjectiveDto = {
        name: 'Fondo de emergencia',
        type: FinancialObjectiveTypeEnum.SAVINGS,
      } as CreateFinancialObjectiveDto;
      const created = buildObjective();
      mockFinancialObjectiveRepository.create.mockResolvedValue(created);

      const result = await service.create(10, dto);

      expect(mockFinancialObjectiveRepository.create).toHaveBeenCalledWith(
        10,
        dto,
      );
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('debe retornar objetivos del usuario', async () => {
      const objectives = [buildObjective(), buildObjective({ id: 2 })];
      mockFinancialObjectiveRepository.findAll.mockResolvedValue(objectives);

      const result = await service.findAll(10);

      expect(mockFinancialObjectiveRepository.findAll).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('debe retornar objetivo por id', async () => {
      const objective = buildObjective();
      mockFinancialObjectiveRepository.findById.mockResolvedValue(objective);

      const result = await service.findOne(1, 10);

      expect(mockFinancialObjectiveRepository.findById).toHaveBeenCalledWith(
        1,
        10,
      );
      expect(result).toEqual(objective);
    });

    it('debe propagar NotFoundException del repositorio', async () => {
      mockFinancialObjectiveRepository.findById.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(service.findOne(999, 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debe delegar la actualización al repositorio', async () => {
      const dto: UpdateFinancialObjectiveDto = { name: 'Ahorro viaje' };
      const updated = buildObjective({ name: 'Ahorro viaje' });
      mockFinancialObjectiveRepository.update.mockResolvedValue(updated);

      const result = await service.update(1, 10, dto);

      expect(mockFinancialObjectiveRepository.update).toHaveBeenCalledWith(
        1,
        10,
        dto,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('debe delegar el soft delete al repositorio', async () => {
      mockFinancialObjectiveRepository.softDelete.mockResolvedValue(undefined);

      await service.remove(1, 10);

      expect(mockFinancialObjectiveRepository.softDelete).toHaveBeenCalledWith(
        1,
        10,
      );
    });
  });

  describe('calculateQuota', () => {
    it('mensual: usa meses calendario y días por periodo', async () => {
      const result = await service.calculateQuota(10, {
        target_amount: 1000000,
        current_balance: 0,
        start_date: '2026-01-01',
        end_date: '2027-12-31',
        frequency: 'monthly' as never,
      });

      expect(result.total_periods).toBe(24);
      expect(result.days_in_period).toBe(31);
      expect(result.quota_amount).toBe(41666.67);
    });

    it('weekly: calcula cuotas por semana completa', async () => {
      const result = await service.calculateQuota(10, {
        target_amount: 100000,
        current_balance: 0,
        start_date: '2026-01-01',
        end_date: '2026-01-28',
        frequency: 'weekly' as never,
      });

      expect(result.total_periods).toBe(4);
      expect(result.days_in_period).toBe(7);
      expect(result.quota_amount).toBe(25000);
    });

    it('sin end_date retorna recomendación sin calcular cuotas', async () => {
      const result = await service.calculateQuota(10, {
        target_amount: 1000000,
        frequency: 'monthly' as never,
      });

      expect(result.total_periods).toBe(0);
      expect(result.quota_amount).toBe(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('rechaza rango de fechas inválido', async () => {
      await expect(
        service.calculateQuota(10, {
          target_amount: 1000000,
          start_date: '2026-02-01',
          end_date: '2026-01-01',
          frequency: 'monthly' as never,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
