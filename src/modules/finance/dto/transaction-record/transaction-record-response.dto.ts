import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodEnum, TransactionTypeEnum } from '@shared/enums';

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
