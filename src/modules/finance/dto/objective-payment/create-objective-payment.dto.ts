import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateObjectivePaymentDto {
  @ApiProperty({ description: 'ID del objetivo financiero.', example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  objective_id!: number;

  @ApiProperty({ description: 'Monto del abono.', example: 200000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Fecha del pago (ISO 8601 date).', example: '2026-04-25' })
  @IsDateString()
  payment_date!: string;

  @ApiPropertyOptional({ description: 'Nota del pago.', example: 'Abono mensual' })
  @IsOptional()
  @IsString()
  note?: string;
}
