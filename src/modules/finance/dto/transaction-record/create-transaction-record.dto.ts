import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethodEnum, TransactionTypeEnum } from '@shared/enums';

export class CreateTransactionRecordDto {
  @ApiProperty({ description: 'ID de la categoría.', example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  category_id!: number;

  @ApiPropertyOptional({ description: 'ID de la subcategoría.', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  subcategory_id?: number;

  @ApiProperty({ enum: TransactionTypeEnum, description: 'Tipo de transacción.' })
  @IsEnum(TransactionTypeEnum)
  type!: TransactionTypeEnum;

  @ApiProperty({ description: 'Monto de la transacción.', example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ enum: PaymentMethodEnum, description: 'Método de pago.' })
  @IsOptional()
  @IsEnum(PaymentMethodEnum)
  payment_method?: PaymentMethodEnum;

  @ApiPropertyOptional({ description: 'Descripción de la transacción.', example: 'Almuerzo trabajo' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Código de referencia.', example: 'REF-2026-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference_code?: string;

  @ApiPropertyOptional({ description: 'URLs de adjuntos.', type: [String] })
  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({ description: 'Cuenta origen.', example: 'Cuenta ahorros Bancolombia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source_account?: string;

  @ApiPropertyOptional({ description: 'Cuenta destino.', example: 'Cuenta ahorros Davivienda' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  destination_account?: string;

  @ApiPropertyOptional({ description: 'Banco origen.', example: 'Bancolombia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source_bank?: string;

  @ApiPropertyOptional({ description: 'Banco destino.', example: 'Davivienda' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  destination_bank?: string;

  @ApiPropertyOptional({ description: 'Destinatario.', example: 'Empresa XYZ' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressee?: string;

  @ApiPropertyOptional({ description: 'Fecha de la transacción (CRÍTICO: siempre incluir para partition pruning).', example: '2026-04-25T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  created_at?: string;
}
