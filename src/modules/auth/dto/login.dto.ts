import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'juan_perez' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    example: 'a3F8dG1rOjEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=',
    description:
      'Contraseña encriptada con AES-256-GCM (formato base64iv:base64authTag:base64ciphertext). ' +
      'Obtener con POST /auth/encrypt antes de usar este endpoint.',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
