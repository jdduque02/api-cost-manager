import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionTypeEnum } from '@shared/enums';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nombre de la categoría.', example: 'Alimentación' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: TransactionTypeEnum, description: 'Tipo de transacción asociada.' })
  @IsEnum(TransactionTypeEnum)
  group_type!: TransactionTypeEnum;

  @ApiPropertyOptional({ description: 'Clave del ícono.', example: 'food-fork-drink' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon_key?: string;

  @ApiPropertyOptional({ description: 'Color hexadecimal (formato #RRGGBB).', example: '#FF5733' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color_hex debe tener formato #RRGGBB.' })
  color_hex?: string;
}
