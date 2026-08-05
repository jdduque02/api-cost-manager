import { ApiProperty } from '@nestjs/swagger';

export class BankAccountResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  user_id!: number;

  @ApiProperty({ example: 'Bancolombia' })
  bank_name!: string;

  @ApiProperty({ example: 'ahorros' })
  account_type!: string;

  @ApiProperty({
    description: 'Número de cuenta enmascarado (últimos 4 dígitos).',
    example: '****6789',
  })
  masked_account_number!: string;

  @ApiProperty({
    description: 'Saldo visible de la cuenta.',
    example: '1500000',
  })
  display_balance!: string;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty({ example: false })
  is_primary!: boolean;

  @ApiProperty({ example: '2026-04-25T10:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-04-25T10:00:00.000Z', nullable: true })
  updated_at!: Date | null;
}
