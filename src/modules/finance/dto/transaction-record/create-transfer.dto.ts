import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'distinctTransferAccounts', async: false })
export class DistinctTransferAccountsConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as {
      source_account_id?: number;
      destination_account_id?: number;
    };
    return (
      obj.source_account_id !== undefined &&
      obj.destination_account_id !== undefined &&
      obj.source_account_id !== obj.destination_account_id
    );
  }

  defaultMessage(): string {
    return 'La cuenta de origen y la de destino deben ser diferentes.';
  }
}

@((Validate as any)(DistinctTransferAccountsConstraint))
export class CreateTransferDto {
  @ApiProperty({
    description: 'ID de la cuenta bancaria de origen (se debita).',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  source_account_id!: number;

  @ApiProperty({
    description: 'ID de la cuenta bancaria de destino (se acredita).',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destination_account_id!: number;

  @ApiProperty({ description: 'Monto del movimiento.', example: 250000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    description:
      'Fecha de negocio del movimiento (día del movimiento). Por defecto: hoy.',
    example: '2026-08-07',
  })
  @IsOptional()
  @IsDateString()
  transaction_date?: string;

  @ApiPropertyOptional({
    description: 'Descripción del movimiento.',
    example: 'Transferencia a cuenta de ahorros',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Código de referencia.',
    example: 'TRF-2026-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference_code?: string;

  @ApiPropertyOptional({
    description: 'Marca el movimiento como fijo (por ejemplo, ahorro mensual).',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_fixed?: boolean;
}
