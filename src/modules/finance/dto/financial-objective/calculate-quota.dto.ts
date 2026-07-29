import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FrequencyEnum } from '@shared/enums';

export class CalculateQuotaDto {
  @ApiProperty({
    description: 'Monto objetivo de la meta de ahorro.',
    example: 10000000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  target_amount!: number;

  @ApiPropertyOptional({
    description: 'Saldo actual ya ahorrado hacia esta meta.',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  current_balance?: number;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del plan de ahorro (ISO 8601). Si no se envía, usa la fecha actual.',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Fecha límite para alcanzar la meta (ISO 8601). Si no se envía, se retorna un mensaje recomendativo sin calcular cuotas.',
    example: '2027-12-31',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({
    enum: [FrequencyEnum.WEEKLY, FrequencyEnum.BIWEEKLY, FrequencyEnum.MONTHLY],
    description: 'Frecuencia de las cuotas de ahorro.',
    example: FrequencyEnum.MONTHLY,
  })
  @IsEnum([FrequencyEnum.WEEKLY, FrequencyEnum.BIWEEKLY, FrequencyEnum.MONTHLY], {
    message: 'La frecuencia debe ser: weekly, biweekly o monthly.',
  })
  @IsNotEmpty()
  frequency!: FrequencyEnum;
}
