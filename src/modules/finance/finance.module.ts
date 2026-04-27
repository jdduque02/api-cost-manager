import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { FinancialObjective } from './entities/financial-objective.entity';
import { FinancialPeriod } from './entities/financial-period.entity';
import { TransactionRecord } from './entities/transaction-record.entity';
import { ObjectivePayment } from './entities/objective-payment.entity';
import { Notification } from './entities/notification.entity';
import { FinancialObjectiveController } from './controller/financial-objective.controller';
import { FinancialPeriodController } from './controller/financial-period.controller';
import { TransactionRecordController } from './controller/transaction-record.controller';
import { ObjectivePaymentController } from './controller/objective-payment.controller';
import { FinancialObjectiveService } from './service/financial-objective.service';
import { FinancialPeriodService } from './service/financial-period.service';
import { TransactionRecordService } from './service/transaction-record.service';
import { ObjectivePaymentService } from './service/objective-payment.service';
import { FinancialObjectiveRepository } from './repositories/financial-objective.repository';
import { FinancialPeriodRepository } from './repositories/financial-period.repository';
import { TransactionRecordRepository } from './repositories/transaction-record.repository';
import { ObjectivePaymentRepository } from './repositories/objective-payment.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialObjective,
      FinancialPeriod,
      TransactionRecord,
      ObjectivePayment,
      Notification,
    ]),
    AuthModule,
  ],
  controllers: [
    FinancialObjectiveController,
    FinancialPeriodController,
    TransactionRecordController,
    ObjectivePaymentController,
  ],
  providers: [
    FinancialObjectiveService,
    FinancialPeriodService,
    TransactionRecordService,
    ObjectivePaymentService,
    FinancialObjectiveRepository,
    FinancialPeriodRepository,
    TransactionRecordRepository,
    ObjectivePaymentRepository,
  ],
  exports: [
    FinancialObjectiveService,
    FinancialPeriodService,
    TransactionRecordService,
    ObjectivePaymentService,
  ],
})
export class FinanceModule {}
