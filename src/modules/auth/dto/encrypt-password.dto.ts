import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EncryptPasswordDto {
  @ApiProperty({ example: 'MiContraseñaSegura123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
