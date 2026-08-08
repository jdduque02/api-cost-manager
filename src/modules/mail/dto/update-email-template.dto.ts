import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateEmailTemplateDto {
  @ApiProperty({
    description: 'Asunto del correo.',
    example: 'Tu código de recuperación de contraseña',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject!: string;

  @ApiProperty({
    description:
      'Cuerpo HTML del correo. Puede usar los marcadores {{otp}}, {{name}} y {{year}}.',
    example: '<p>Tu código es {{otp}}</p>',
  })
  @IsString()
  @MinLength(1)
  html_body!: string;
}

export class EmailTemplateResponseDto {
  @ApiProperty({ example: 'otp_password_reset' })
  key!: string;

  @ApiProperty({ example: 'Tu código de recuperación de contraseña' })
  subject!: string;

  @ApiProperty({ example: '<p>Tu código es {{otp}}</p>' })
  html_body!: string;

  @ApiPropertyOptional()
  updated_at!: Date | null;

  constructor(partial: Partial<EmailTemplateResponseDto>) {
    Object.assign(this, partial);
  }
}
