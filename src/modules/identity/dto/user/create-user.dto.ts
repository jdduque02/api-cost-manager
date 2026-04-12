import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * DTO para la creación de un usuario (identity.app_user).
 * external_id, created_at, updated_at, deleted_at se generan automáticamente.
 */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  username: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
