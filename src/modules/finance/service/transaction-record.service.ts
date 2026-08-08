import { Injectable, Logger } from '@nestjs/common';
import { TransactionRecordRepository } from '@finance/repositories/transaction-record.repository';
import { CreateTransactionRecordDto } from '@finance/dto/transaction-record/create-transaction-record.dto';
import { UpdateTransactionRecordDto } from '@finance/dto/transaction-record/update-transaction-record.dto';
import { TransactionRecordQueryDto } from '@finance/dto/transaction-record/transaction-record-query.dto';
import { TransactionSummaryQueryDto } from '@finance/dto/transaction-record/transaction-summary-query.dto';
import {
  nextOccurrence,
  startOfDay,
} from '@finance/service/fixed-reminder.scheduler';
import { UpcomingPaymentDto } from '@finance/dto/transaction-record/upcoming-payment.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_WINDOW_DAYS = 370 * 10; // cubre suscripciones anuales antiguas

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

  async removeMany(ids: number[], userId: number) {
    return this.transactionRecordRepository.softDeleteMany(ids, userId);
  }

  /**
   * Próximos pagos de suscripciones (deducciones fijas) del usuario:
   * calcula la siguiente fecha de pago y los días restantes para cada una.
   */
  async getUpcomingPayments(userId: number): Promise<UpcomingPaymentDto[]> {
    const today = startOfDay(new Date());
    const from = new Date(today.getTime() - SUBSCRIPTION_WINDOW_DAYS * DAY_MS);
    const subscriptions =
      await this.transactionRecordRepository.findUpcomingSubscriptions(
        userId,
        from,
      );

    const upcoming: UpcomingPaymentDto[] = [];
    for (const tx of subscriptions) {
      const next = nextOccurrence(tx, today);
      if (!next) continue;
      upcoming.push({
        id: tx.id,
        description: tx.description ?? null,
        amount: Number(tx.amount ?? 0),
        payment_method: tx.payment_method ?? null,
        frequency: tx.frequency ?? null,
        due_day: tx.due_day ?? null,
        reminder_days: tx.reminder_days ?? null,
        next_payment_date: next.toISOString().slice(0, 10),
        days_remaining: Math.floor((next.getTime() - today.getTime()) / DAY_MS),
      });
    }
    upcoming.sort((a, b) =>
      a.next_payment_date.localeCompare(b.next_payment_date),
    );

    return upcoming;
  }
}
