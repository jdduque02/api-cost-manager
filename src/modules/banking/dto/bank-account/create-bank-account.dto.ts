import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Nombre del banco.', example: 'Bancolombia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bank_name!: string;

  @ApiProperty({ description: 'Tipo de cuenta (ahorros, corriente, etc.).', example: 'ahorros' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  account_type!: string;

  @ApiProperty({ description: 'Número de cuenta (se almacenará cifrado).', example: '123456789' })
  @IsString()
  @IsNotEmpty()
  account_number!: string;

  @ApiProperty({ description: 'Saldo actual de la cuenta.', example: 1500000 })
  @Type(() => Number)
  @IsNumber()
  balance!: number;

  @ApiPropertyOptional({ description: 'Indica si es la cuenta principal del usuario.', example: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}
