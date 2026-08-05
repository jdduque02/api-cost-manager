import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario.',
    example: 'MiViejaContraseña123!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description:
      'Nueva contraseña (mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial).',
    example: 'MiNuevaContraseña456!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/)
  newPassword!: string;
}
