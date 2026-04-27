import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialPeriod } from '@finance/entities/financial-period.entity';
import { CreateFinancialPeriodDto } from '@finance/dto/financial-period/create-financial-period.dto';

@Injectable()
export class FinancialPeriodRepository {
  private readonly logger = new Logger(FinancialPeriodRepository.name);

  constructor(
    @InjectRepository(FinancialPeriod)
    private readonly repo: Repository<FinancialPeriod>,
  ) {}

  async create(userId: number, dto: CreateFinancialPeriodDto): Promise<FinancialPeriod> {
    const existing = await this.repo.findOne({ where: { user_id: userId, year: dto.year, month: dto.month } });
    if (existing) throw new ConflictException(`Ya existe un período ${dto.year}-${dto.month} para este usuario.`);

    const period = this.repo.create({ ...dto, user_id: userId });
    const saved = await this.repo.save(period);
    this.logger.log(`Período financiero ${dto.year}-${dto.month} creado para usuario ID: ${userId}`);
    return saved;
  }

  async findAll(userId: number): Promise<FinancialPeriod[]> {
    return this.repo.find({ where: { user_id: userId }, order: { year: 'DESC', month: 'DESC' } });
  }

  async findById(id: number, userId: number): Promise<FinancialPeriod> {
    const period = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!period) throw new NotFoundException(`Período financiero con id ${id} no encontrado.`);
    return period;
  }

  async close(id: number, userId: number): Promise<FinancialPeriod> {
    const period = await this.findById(id, userId);
    if (period.is_closed) throw new ConflictException(`El período ${period.year}-${period.month} ya está cerrado.`);
    period.is_closed = true;
    period.closed_at = new Date();
    const saved = await this.repo.save(period);
    this.logger.log(`Período ${period.year}-${period.month} cerrado para usuario ID: ${userId}`);
    return saved;
  }
}
