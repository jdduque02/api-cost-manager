import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFinancialProfileDto {
  @ApiProperty({
    description: 'Identificador único del usuario asociado al perfil.',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del usuario debe ser un número válido.' })
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio.' })
  user_id!: number;

  @ApiPropertyOptional({
    description: 'Nombre descriptivo del perfil financiero.',
    example: 'Plan de Ahorro Agresivo',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'El nombre del perfil debe ser un texto.' })
  @MaxLength(50, { message: 'El nombre del perfil no puede exceder los 50 caracteres.' })
  profile_name?: string;

  @ApiPropertyOptional({
    description: 'Indica si es un perfil personalizado por el usuario.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo is_custom debe ser un valor booleano.' })
  is_custom?: boolean;

  @ApiPropertyOptional({
    description: 'Porcentaje destinado a necesidades básicas.',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El ratio de necesidades debe ser un número con máximo 2 decimales.' })
  @Min(0, { message: 'El ratio de necesidades no puede ser negativo.' })
  @Max(100, { message: 'El ratio de necesidades no puede superar 100.' })
  needs_ratio?: number;

  @ApiPropertyOptional({
    description: 'Porcentaje destinado a deseos o gastos variables.',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El ratio de deseos debe ser un número con máximo 2 decimales.' })
  @Min(0, { message: 'El ratio de deseos no puede ser negativo.' })
  @Max(100, { message: 'El ratio de deseos no puede superar 100.' })
  wants_ratio?: number;

  @ApiPropertyOptional({
    description: 'Porcentaje destinado a ahorros e inversión.',
    example: 20,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El ratio de ahorro debe ser un número con máximo 2 decimales.' })
  @Min(0, { message: 'El ratio de ahorro no puede ser negativo.' })
  @Max(100, { message: 'El ratio de ahorro no puede superar 100.' })
  savings_ratio?: number;

  @ApiPropertyOptional({
    description: 'Límite máximo de endeudamiento permitido.',
    example: 35,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El ratio máximo de deuda debe ser un número con máximo 2 decimales.' })
  @Min(0, { message: 'El ratio máximo de deuda no puede ser negativo.' })
  @Max(100, { message: 'El ratio máximo de deuda no puede superar 100.' })
  max_debt_ratio?: number;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales del perfil financiero.',
    example: { version: '1.0', tags: ['emergencia', 'personal'] },
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto válido.' })
  metadata?: Record<string, unknown>;
}