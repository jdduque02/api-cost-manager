import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Nombre del banco.', example: 'Bancolombia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bank_name!: string;

  @ApiProperty({
    description: 'Tipo de cuenta (ahorros, corriente, etc.).',
    example: 'ahorros',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  account_type!: string;

  @ApiProperty({
    description: 'Número de cuenta (se almacenará cifrado).',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  account_number!: string;

  @ApiProperty({ description: 'Saldo actual de la cuenta.', example: 1500000 })
  @Type(() => Number)
  @IsNumber()
  balance!: number;

  @ApiPropertyOptional({
    description: 'Código de moneda ISO 4217.',
    example: 'COP',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Indica si es la cuenta principal del usuario.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si la cuenta está exenta del impuesto 4x1000 (GMF).',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  exempt_4x1000?: boolean;

  @ApiPropertyOptional({
    description: 'Tasa de interés anual de la cuenta (%).',
    example: 4.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  annual_interest_rate?: number;

  @ApiPropertyOptional({
    description:
      'Frecuencia de entrega del rendimiento (daily, monthly, annual).',
    example: 'monthly',
    enum: ['daily', 'monthly', 'annual'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  yield_frequency?: string;
}
