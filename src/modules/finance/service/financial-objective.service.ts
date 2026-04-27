import { Injectable, Logger } from '@nestjs/common';
import { FinancialObjectiveRepository } from '@finance/repositories/financial-objective.repository';
import { CreateFinancialObjectiveDto } from '@finance/dto/financial-objective/create-financial-objective.dto';
import { UpdateFinancialObjectiveDto } from '@finance/dto/financial-objective/update-financial-objective.dto';

@Injectable()
export class FinancialObjectiveService {
  private readonly logger = new Logger(FinancialObjectiveService.name);

  constructor(private readonly financialObjectiveRepository: FinancialObjectiveRepository) {}

  async create(userId: number, dto: CreateFinancialObjectiveDto) {
    return this.financialObjectiveRepository.create(userId, dto);
  }

  async findAll(userId: number) {
    return this.financialObjectiveRepository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.financialObjectiveRepository.findById(id, userId);
  }

  async update(id: number, userId: number, dto: UpdateFinancialObjectiveDto) {
    return this.financialObjectiveRepository.update(id, userId, dto);
  }

  async remove(id: number, userId: number) {
    return this.financialObjectiveRepository.softDelete(id, userId);
  }
}
