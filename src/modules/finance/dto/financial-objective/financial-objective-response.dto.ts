import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinancialObjectiveTypeEnum, FrequencyEnum } from '@shared/enums';

export class FinancialObjectiveResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  user_id!: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  category_id!: number | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  subcategory_id!: number | null;

  @ApiProperty({ example: 'Fondo de emergencia' })
  name!: string;

  @ApiProperty({ enum: FinancialObjectiveTypeEnum })
  type!: FinancialObjectiveTypeEnum;

  @ApiProperty({ example: 10000000 })
  target_amount!: number;

  @ApiProperty({ example: 0 })
  current_balance!: number;

  @ApiPropertyOptional({ example: 5.5, nullable: true })
  interest_rate!: number | null;

  @ApiPropertyOptional({ nullable: true })
  fees!: number | null;

  @ApiPropertyOptional({ nullable: true })
  monthly_payment!: number | null;

  @ApiPropertyOptional({ nullable: true })
  owner!: string | null;

  @ApiPropertyOptional({ example: 'Bancolombia', nullable: true })
  bank!: string | null;

  @ApiPropertyOptional({ example: 5.5, nullable: true })
  current_profitability!: number | null;

  @ApiPropertyOptional({
    description: 'Cuenta bancaria vinculada a la meta.',
    example: 1,
    nullable: true,
  })
  account_id!: number | null;

  @ApiPropertyOptional({ enum: FrequencyEnum, nullable: true })
  frequency!: FrequencyEnum | null;

  @ApiPropertyOptional({ example: 15, nullable: true })
  due_day!: number | null;

  @ApiPropertyOptional({ nullable: true })
  start_date!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  end_date!: Date | null;

  @ApiProperty({ example: false })
  is_completed!: boolean;

  @ApiProperty({
    description: 'Monto restante por ahorrar (target - current, mínimo 0).',
    example: 9800000,
  })
  amount_remaining!: number;

  @ApiProperty({
    description: 'Porcentaje de avance hacia la meta (0-100).',
    example: 2,
  })
  progress_percent!: number;

  @ApiPropertyOptional({
    description:
      'Días calendario restantes hasta end_date (0 si venció o no hay fecha).',
    example: 345,
    nullable: true,
  })
  days_remaining!: number | null;

  @ApiPropertyOptional({
    description: 'Referencia del cálculo de cuota usado al crear la meta.',
    nullable: true,
  })
  quota_calculation!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  completed_at!: Date | null;

  @ApiProperty({ example: '2026-04-25T10:00:00.000Z' })
  created_at!: Date;

  @ApiPropertyOptional({ nullable: true })
  updated_at!: Date | null;
}
