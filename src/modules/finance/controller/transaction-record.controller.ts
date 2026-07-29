import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiExtraModels,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthGuard } from '@auth/guards/auth.guard';
import { ApiIntrospectGuardResponse } from '@auth/decorators/api-introspect-guard-response.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { IntrospectResponse } from '@auth/interfaces/IntrospectResponse.dto';
import { TransactionRecordService } from '@finance/service/transaction-record.service';
import { CreateTransactionRecordDto } from '@finance/dto/transaction-record/create-transaction-record.dto';
import { UpdateTransactionRecordDto } from '@finance/dto/transaction-record/update-transaction-record.dto';
import { TransactionRecordQueryDto } from '@finance/dto/transaction-record/transaction-record-query.dto';
import { TransactionRecordResponseDto } from '@finance/dto/transaction-record/transaction-record-response.dto';
import { ErrorResponseDto } from '@shared/dto/error-response.dto';

@ApiTags('finance')
@UseGuards(AuthGuard)
@ApiIntrospectGuardResponse()
@ApiExtraModels(TransactionRecordResponseDto)
@Controller('users/:userId/transactions')
export class TransactionRecordController {
  constructor(
    private readonly transactionRecordService: TransactionRecordService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar transacción' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transacción creada.',
    type: TransactionRecordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos.',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Error al crear la transacción.',
    type: ErrorResponseDto,
  })
  async create(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: CreateTransactionRecordDto,
    @CurrentUser() _currentUser: IntrospectResponse,
  ) {
    return this.transactionRecordService.create(userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Listar transacciones del usuario (CRÍTICO: usar date_from/date_to para partition pruning)',
  })
  @ApiQuery({
    name: 'date_from',
    required: false,
    description: 'Fecha inicio (ISO 8601). RECOMENDADO para rendimiento.',
  })
  @ApiQuery({
    name: 'date_to',
    required: false,
    description: 'Fecha fin (ISO 8601).',
  })
  @ApiQuery({ name: 'category_id', required: false })
  @ApiQuery({ name: 'subcategory_id', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transacciones del usuario.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(TransactionRecordResponseDto) },
        },
        total: { type: 'number' },
      },
    },
  })
  async findAll(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: TransactionRecordQueryDto,
    @CurrentUser() _currentUser: IntrospectResponse,
  ) {
    return this.transactionRecordService.findAll(userId, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener transacción por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transacción encontrada.',
    type: TransactionRecordResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Transacción no encontrada.',
    type: ErrorResponseDto,
  })
  async findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() _currentUser: IntrospectResponse,
  ) {
    return this.transactionRecordService.findOne(id, userId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar transacción' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transacción actualizada.',
    type: TransactionRecordResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Transacción no encontrada.',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos.',
    type: ErrorResponseDto,
  })
  async update(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransactionRecordDto,
    @CurrentUser() _currentUser: IntrospectResponse,
  ) {
    return this.transactionRecordService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar transacción (soft delete)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Transacción eliminada.',
  })
  @ApiNotFoundResponse({
    description: 'Transacción no encontrada.',
    type: ErrorResponseDto,
  })
  async remove(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() _currentUser: IntrospectResponse,
  ) {
    return this.transactionRecordService.remove(id, userId);
  }
}
