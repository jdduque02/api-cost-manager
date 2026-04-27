import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FinancialObjective } from '@finance/entities/financial-objective.entity';
import { CreateFinancialObjectiveDto } from '@finance/dto/financial-objective/create-financial-objective.dto';
import { UpdateFinancialObjectiveDto } from '@finance/dto/financial-objective/update-financial-objective.dto';

@Injectable()
export class FinancialObjectiveRepository {
  private readonly logger = new Logger(FinancialObjectiveRepository.name);

  constructor(
    @InjectRepository(FinancialObjective)
    private readonly repo: Repository<FinancialObjective>,
  ) {}

  async create(userId: number, dto: CreateFinancialObjectiveDto): Promise<FinancialObjective> {
    const objective = this.repo.create({ ...dto, user_id: userId });
    const saved = await this.repo.save(objective);
    this.logger.log(`Objetivo financiero creado para usuario ID: ${userId}`);
    return saved;
  }

  async findAll(userId: number): Promise<FinancialObjective[]> {
    return this.repo.find({
      where: { user_id: userId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: number, userId: number): Promise<FinancialObjective> {
    const objective = await this.repo.findOne({ where: { id, user_id: userId, deleted_at: IsNull() } });
    if (!objective) throw new NotFoundException(`Objetivo financiero con id ${id} no encontrado.`);
    return objective;
  }

  async update(id: number, userId: number, dto: UpdateFinancialObjectiveDto): Promise<FinancialObjective> {
    const objective = await this.findById(id, userId);
    const updated = this.repo.merge(objective, dto as Partial<FinancialObjective>);
    const saved = await this.repo.save(updated);
    this.logger.log(`Objetivo financiero ID ${id} actualizado para usuario ID: ${userId}`);
    return saved;
  }

  async softDelete(id: number, userId: number): Promise<void> {
    const objective = await this.findById(id, userId);
    await this.repo.softRemove(objective);
    this.logger.log(`Objetivo financiero ID ${id} eliminado (soft) para usuario ID: ${userId}`);
  }
}
