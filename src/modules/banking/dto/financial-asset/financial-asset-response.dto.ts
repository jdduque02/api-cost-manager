import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FinancialAssetResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  user_id!: number;

  @ApiProperty({ example: 'acciones' })
  asset_type!: string;

  @ApiProperty({ example: 'Acciones Ecopetrol' })
  name!: string;

  @ApiProperty({ example: 5000000 })
  current_value!: number;

  @ApiProperty({ example: 'COP' })
  currency!: string;

  @ApiProperty({ example: '2026-04-25T10:00:00.000Z' })
  created_at!: Date;

  @ApiPropertyOptional({ example: '2026-04-25T10:00:00.000Z', nullable: true })
  updated_at!: Date | null;
}
