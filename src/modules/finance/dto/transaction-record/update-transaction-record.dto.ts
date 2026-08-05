import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTransactionRecordDto } from './create-transaction-record.dto';

export class UpdateTransactionRecordDto extends PartialType(
  OmitType(CreateTransactionRecordDto, ['created_at'] as const),
) {}
