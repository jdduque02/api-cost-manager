import { IsEnum, IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AuditActionEnum } from '@shared/enums';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Esquema de la tabla auditada.', example: 'finance' })
  @IsOptional()
  @IsString({ message: 'schema_name debe ser una cadena de texto.' })
  schema_name?: string;

  @ApiPropertyOptional({ description: 'Nombre de la tabla auditada.', example: 'transaction_record' })
  @IsOptional()
  @IsString({ message: 'table_name debe ser una cadena de texto.' })
  table_name?: string;

  @ApiPropertyOptional({ description: 'ID del registro auditado.', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'record_id debe ser un número entero.' })
  @IsPositive({ message: 'record_id debe ser un número positivo.' })
  record_id?: number;

  @ApiPropertyOptional({ description: 'ID del usuario que realizó el cambio.', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'changed_by debe ser un número entero.' })
  @IsPositive({ message: 'changed_by debe ser un número positivo.' })
  changed_by?: number;

  @ApiPropertyOptional({ enum: AuditActionEnum, description: 'Tipo de acción auditada.' })
  @IsOptional()
  @IsEnum(AuditActionEnum)
  action?: AuditActionEnum;

  @ApiPropertyOptional({ example: 1, description: 'Número de página (desde 1).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero.' })
  @IsPositive({ message: 'page debe ser un número positivo.' })
  @Min(1, { message: 'page debe ser al menos 1.' })
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Resultados por página (máx. 100).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero.' })
  @IsPositive({ message: 'limit debe ser un número positivo.' })
  @Min(1, { message: 'limit debe ser al menos 1.' })
  limit?: number = 20;
}
