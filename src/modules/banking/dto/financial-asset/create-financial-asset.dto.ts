import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFinancialAssetDto {
  @ApiProperty({ description: 'Tipo de activo financiero.', example: 'acciones' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  asset_type!: string;

  @ApiProperty({ description: 'Nombre descriptivo del activo.', example: 'Acciones Ecopetrol' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Valor actual del activo.', example: 5000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  current_value!: number;

  @ApiPropertyOptional({ description: 'Moneda ISO 4217.', example: 'COP' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
