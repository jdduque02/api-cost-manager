import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FinancialPeriodService } from '@finance/service/financial-period.service';
import { FinancialPeriodRepository } from '@finance/repositories/financial-period.repository';
import { CreateFinancialPeriodDto } from '@finance/dto/financial-period/create-financial-period.dto';

const mockFinancialPeriodRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  close: jest.fn(),
};

const buildPeriod = (overrides = {}) => ({
  id: 1,
  user_id: 10,
  year: 2026,
  month: 4,
  is_closed: false,
  ...overrides,
});

describe('FinancialPeriodService', () => {
  let service: FinancialPeriodService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialPeriodService,
        { provide: FinancialPeriodRepository, useValue: mockFinancialPeriodRepository },
      ],
    }).compile();

    service = module.get<FinancialPeriodService>(FinancialPeriodService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe delegar la creación al repositorio', async () => {
      const dto: CreateFinancialPeriodDto = { year: 2026, month: 4 };
      const created = buildPeriod();
      mockFinancialPeriodRepository.create.mockResolvedValue(created);

      const result = await service.create(10, dto);

      expect(mockFinancialPeriodRepository.create).toHaveBeenCalledWith(10, dto);
      expect(result).toEqual(created);
    });

    it('debe propagar ConflictException si ya existe el período', async () => {
      mockFinancialPeriodRepository.create.mockRejectedValue(new ConflictException());

      await expect(service.create(10, { year: 2026, month: 4 })).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('debe retornar todos los períodos del usuario', async () => {
      const periods = [buildPeriod(), buildPeriod({ id: 2, month: 3 })];
      mockFinancialPeriodRepository.findAll.mockResolvedValue(periods);

      const result = await service.findAll(10);

      expect(mockFinancialPeriodRepository.findAll).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('debe retornar período por id', async () => {
      const period = buildPeriod();
      mockFinancialPeriodRepository.findById.mockResolvedValue(period);

      const result = await service.findOne(1, 10);

      expect(mockFinancialPeriodRepository.findById).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(period);
    });

    it('debe propagar NotFoundException del repositorio', async () => {
      mockFinancialPeriodRepository.findById.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(999, 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('close', () => {
    it('debe delegar el cierre al repositorio', async () => {
      const closed = buildPeriod({ is_closed: true });
      mockFinancialPeriodRepository.close.mockResolvedValue(closed);

      const result = await service.close(1, 10);

      expect(mockFinancialPeriodRepository.close).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(closed);
    });

    it('debe propagar ConflictException si el período ya está cerrado', async () => {
      mockFinancialPeriodRepository.close.mockRejectedValue(new ConflictException());

      await expect(service.close(1, 10)).rejects.toThrow(ConflictException);
    });
  });
});
