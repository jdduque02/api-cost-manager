import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Token de reset obtenido en POST /auth/verify-otp.',
    example: '10.1772311234.abcdef...',
  })
  @IsString()
  reset_token!: string;

  @ApiProperty({
    description: 'Nueva contraseña (texto plano, se cambia en Keycloak).',
    example: 'NuevaClave.2026!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  new_password!: string;
}
