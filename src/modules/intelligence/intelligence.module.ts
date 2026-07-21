import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialSummary } from '@intelligence/entities/financial-summary.entity';
import { SummaryCategoryBreakdown } from '@intelligence/entities/summary-category-breakdown.entity';
import { TaxSummary } from '@intelligence/entities/tax-summary.entity';
import { IntelligenceService } from '@intelligence/service/intelligence.service';
import { IntelligenceController } from '@intelligence/controller/intelligence.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialSummary, SummaryCategoryBreakdown, TaxSummary]),
  ],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
