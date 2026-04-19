import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export const USER_SORT_FIELDS = ['username', 'email', 'created_at', 'updated_at'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export class UserQueryDto {
  @ApiPropertyOptional({
    description: 'Texto a buscar en username o email (insensible a mayúsculas).',
    example: 'juan',
  })
  @IsOptional()
  @IsString({ message: 'El texto de búsqueda debe ser una cadena de texto.' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Campo por el que ordenar.',
    enum: USER_SORT_FIELDS,
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(USER_SORT_FIELDS, { message: 'El campo de ordenamiento no es válido.' })
  sortBy?: UserSortField = 'created_at';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento.',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'La dirección de ordenamiento no es válida.' })
  order?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ description: 'Número de página (desde 1).', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El número de página debe ser un número entero.' })
  @Min(1, { message: 'El número de página debe ser mayor o igual a 1.' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Resultados por página (máx. 100).', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El número de resultados por página debe ser un número entero.' })
  @Min(1, { message: 'El número de resultados por página debe ser mayor o igual a 1.' })
  @Max(100, { message: 'El número de resultados por página no puede exceder los 100.' })
  limit?: number = 20;
}
