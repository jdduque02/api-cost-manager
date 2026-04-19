import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateFinancialProfileDto } from '@identity/dto/financial-profile/create-financial-profile.dto';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre de usuario único para acceder al sistema.',
    example: 'juan_perez',
    minLength: 3,
    maxLength: 20,
  })
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  username!: string;

  @ApiProperty({
    description: 'Correo electrónico de contacto.',
    example: 'juan.perez@ejemplo.com',
  })
  @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email!: string;

  @ApiProperty({
    description: 'Contraseña inicial del usuario (mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial).',
    example: 'ContraseñaSegura123!',
    minLength: 8,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(
    /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/,
    { message: 'La contraseña es demasiado débil. Debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.' }
  )
  password!: string;

  @ApiPropertyOptional({
    description: 'Configuración regional del usuario (ej. es, en, fr).',
    example: 'es',
    maxLength: 10,
  })
  @IsOptional()
  @IsString({ message: 'El locale debe ser un texto.' })
  @MaxLength(10, { message: 'El locale no puede exceder los 10 caracteres.' })
  locale?: string;

  @ApiPropertyOptional({
    description: 'Zona horaria para cálculos de fechas.',
    example: 'America/Bogota',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'La zona horaria debe ser un texto.' })
  @MaxLength(50, { message: 'La zona horaria no puede exceder los 50 caracteres.' })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Objeto con datos adicionales personalizados.',
    example: { prefered_theme: 'dark', notifications: true },
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto válido.' })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Define si el usuario está habilitado para loguearse.',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado is_active debe ser un valor booleano.' })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Perfil financiero del usuario.',
    type: CreateFinancialProfileDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateFinancialProfileDto)
  financial_profile?: CreateFinancialProfileDto;
}