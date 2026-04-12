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

/**
 * DTO para la creación de un perfil financiero (identity.financial_profile).
 * user_id se asigna internamente desde el contexto de autenticación.
 */
export class CreateFinancialProfileDto {
  @IsNotEmpty({ message: 'El ID del usuario es obligatorio.' })
  @IsNumber()
  user_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  profile_name?: string;

  @IsOptional()
  @IsBoolean()
  is_custom?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El ratio de necesidades no puede ser negativo.' })
  @Max(100, { message: 'El ratio de necesidades no puede superar 100.' })
  needs_ratio?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El ratio de deseos no puede ser negativo.' })
  @Max(100, { message: 'El ratio de deseos no puede superar 100.' })
  wants_ratio?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El ratio de ahorro no puede ser negativo.' })
  @Max(100, { message: 'El ratio de ahorro no puede superar 100.' })
  savings_ratio?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'El ratio máximo de deuda no puede ser negativo.' })
  @Max(100, { message: 'El ratio máximo de deuda no puede superar 100.' })
  max_debt_ratio?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
