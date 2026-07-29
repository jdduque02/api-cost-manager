import { Injectable, Logger } from '@nestjs/common';
import { FinancialPeriodRepository } from '@finance/repositories/financial-period.repository';
import { CreateFinancialPeriodDto } from '@finance/dto/financial-period/create-financial-period.dto';

@Injectable()
export class FinancialPeriodService {
  private readonly logger = new Logger(FinancialPeriodService.name);

  constructor(private readonly financialPeriodRepository: FinancialPeriodRepository) {}

  async create(userId: number, dto: CreateFinancialPeriodDto) {
    return this.financialPeriodRepository.create(userId, dto);
  }

  async findAll(userId: number) {
    return this.financialPeriodRepository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.financialPeriodRepository.findById(id, userId);
  }

  async close(id: number, userId: number) {
    return this.financialPeriodRepository.close(id, userId);
  }
}
