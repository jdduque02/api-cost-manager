import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FixedTypeEnum, PaymentMethodEnum, TransactionTypeEnum } from '@shared/enums';

export class TransactionRecordResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  user_id!: number;

  @ApiProperty({ example: 1 })
  category_id!: number;

  @ApiPropertyOptional({ example: 2, nullable: true })
  subcategory_id!: number | null;

  @ApiProperty({ enum: TransactionTypeEnum })
  type!: TransactionTypeEnum;

  @ApiProperty({ example: 50000 })
  amount!: number;

  @ApiProperty({ example: false })
  is_fixed!: boolean;

  @ApiPropertyOptional({ enum: FixedTypeEnum, nullable: true })
  fixed_type!: FixedTypeEnum | null;

  @ApiPropertyOptional({ enum: ['biweekly', 'monthly'], nullable: true })
  frequency!: 'biweekly' | 'monthly' | null;

  @ApiPropertyOptional({ example: 15, nullable: true })
  due_day!: number | null;

  @ApiPropertyOptional({ example: 3, nullable: true })
  reminder_days!: number | null;

  @ApiPropertyOptional({ enum: PaymentMethodEnum, nullable: true })
  payment_method!: PaymentMethodEnum | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reference_code!: string | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  attachments!: string[] | null;

  @ApiPropertyOptional({ nullable: true })
  source_account!: string | null;

  @ApiPropertyOptional({ nullable: true })
  destination_account!: string | null;

  @ApiPropertyOptional({ nullable: true })
  source_bank!: string | null;

  @ApiPropertyOptional({ nullable: true })
  destination_bank!: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressee!: string | null;

  @ApiProperty({ example: '2026-04-25T10:00:00.000Z' })
  created_at!: Date;

  @ApiPropertyOptional({ nullable: true })
  updated_at!: Date | null;
}
