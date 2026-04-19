import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
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
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@auth/guards/auth.guard';
import { ApiIntrospectGuardResponse } from '@auth/decorators/api-introspect-guard-response.decorator';
import { FinancialProfileService } from '@identity/service/financial-profile.service';
import { CreateFinancialProfileDto } from '@identity/dto/financial-profile/create-financial-profile.dto';
import { UpdateFinancialProfileDto } from '@identity/dto/financial-profile/update-financial-profile.dto';
import { FinancialProfileResponseDto } from '@identity/dto/financial-profile/financial-profile-response.dto';
import { ErrorResponseDto } from '@shared/dto/error-response.dto';

@ApiTags('financial-profile')
@UseGuards(AuthGuard)
@ApiIntrospectGuardResponse()
@Controller('user/:userId/financial-profile')
export class FinancialProfileController {
  constructor(private readonly financialProfileService: FinancialProfileService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear perfil financiero del usuario' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Perfil financiero creado.', type: FinancialProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos.', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'El usuario ya tiene un perfil financiero.', type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: 'Error al crear el perfil.', type: ErrorResponseDto })
  create(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() createFinancialProfileDto: CreateFinancialProfileDto,
  ) {
    return this.financialProfileService.create(userId, createFinancialProfileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener perfil financiero del usuario' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Perfil financiero encontrado.', type: FinancialProfileResponseDto })
  @ApiNotFoundResponse({ description: 'El usuario no tiene perfil financiero.', type: ErrorResponseDto })
  findOne(@Param('userId', ParseIntPipe) userId: number) {
    return this.financialProfileService.findByUserId(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar perfil financiero del usuario' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Perfil financiero actualizado.', type: FinancialProfileResponseDto })
  @ApiNotFoundResponse({ description: 'El usuario no tiene perfil financiero.', type: ErrorResponseDto })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos.', type: ErrorResponseDto })
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateFinancialProfileDto: UpdateFinancialProfileDto,
  ) {
    return this.financialProfileService.update(userId, updateFinancialProfileDto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar perfil financiero del usuario' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Perfil financiero eliminado.' })
  @ApiNotFoundResponse({ description: 'El usuario no tiene perfil financiero.', type: ErrorResponseDto })
  async remove(@Param('userId', ParseIntPipe) userId: number) {
    await this.financialProfileService.remove(userId);
  }

  @Get('public/status')
  @ApiOperation({ summary: 'Estado del módulo de identidad' })
  getPublicStatus() {
    return { status: 'Identity Module is Running', authentication: 'Bypassed' };
  }
}
