import { Injectable, Logger } from '@nestjs/common';
import { TransactionRecordRepository } from '@finance/repositories/transaction-record.repository';
import { CreateTransactionRecordDto } from '@finance/dto/transaction-record/create-transaction-record.dto';
import { UpdateTransactionRecordDto } from '@finance/dto/transaction-record/update-transaction-record.dto';
import { TransactionRecordQueryDto } from '@finance/dto/transaction-record/transaction-record-query.dto';
import { TransactionSummaryQueryDto } from '@finance/dto/transaction-record/transaction-summary-query.dto';

@Injectable()
export class TransactionRecordService {
  private readonly logger = new Logger(TransactionRecordService.name);

  constructor(
    private readonly transactionRecordRepository: TransactionRecordRepository,
  ) {}

  async create(userId: number, dto: CreateTransactionRecordDto) {
    return this.transactionRecordRepository.create(userId, dto);
  }

  async findAll(userId: number, query: TransactionRecordQueryDto) {
    return this.transactionRecordRepository.findAll(userId, query);
  }

  async getSummary(userId: number, query: TransactionSummaryQueryDto) {
    return this.transactionRecordRepository.getSummary(userId, query);
  }

  async findOne(id: number, userId: number) {
    return this.transactionRecordRepository.findById(id, userId);
  }

  async update(id: number, userId: number, dto: UpdateTransactionRecordDto) {
    return this.transactionRecordRepository.update(id, userId, dto);
  }

  async remove(id: number, userId: number) {
    return this.transactionRecordRepository.softDelete(id, userId);
  }
}
