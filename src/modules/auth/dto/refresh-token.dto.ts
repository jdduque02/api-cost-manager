import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token obtenido en el login.' })
  @IsString({ message: 'El refresh token debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El refresh token no puede estar vacío.' })
  refresh_token!: string;
}
