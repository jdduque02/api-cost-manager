import { Controller, Post, Get, Delete, Body, Param, HttpCode, HttpStatus, UseGuards, Inject } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiInternalServerErrorResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiIntrospectGuardResponse } from '@auth/decorators/api-introspect-guard-response.decorator';
import { BearerToken } from '@auth/decorators/bearer-token.decorator';
import { AuthGuard } from '@auth/guards/auth.guard';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { IntrospectResponse } from '@auth/interfaces/IntrospectResponse.dto';
import { AuthService } from '@auth/service/auth.service';
import { LoginDto } from '@auth/dto/login.dto';
import { RefreshTokenDto } from '@auth/dto/refresh-token.dto';
import { ForgotPasswordDto } from '@auth/dto/forgot-password.dto';
import { ChangePasswordDto } from '@auth/dto/change-password.dto';
import { SessionResponseDto } from '@auth/dto/session-response.dto';
import { EventResponseDto } from '@auth/dto/event-response.dto';
import { EncryptPasswordDto } from '@auth/dto/encrypt-password.dto';
import { EncryptPasswordResponseDto } from '@auth/dto/encrypt-password-response.dto';
import { KeycloakTokenResponse } from '@auth/interfaces/KeycloakTokenResponse.dto';
import { ErrorResponseDto } from '@shared/dto/error-response.dto';

@ApiTags('auth')
@ApiExtraModels(KeycloakTokenResponse, SessionResponseDto, EventResponseDto)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(I18nService) private readonly i18n: I18nService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar usuario y obtener tokens',
    description:
      'Acepta únicamente contraseñas encriptadas con AES-256-GCM (formato iv:authTag:ciphertext). ' +
      'Usar POST /auth/encrypt primero para obtener la contraseña encriptada.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login exitoso.',
    schema: {
      properties: {
        status: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Operación exitosa' },
        data: {
          type: 'array',
          items: { type: getSchemaPath(KeycloakTokenResponse) },
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-19T21:38:04.349Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas.',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos.',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Error de comunicación con Keycloak.',
    type: ErrorResponseDto,
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar sesión con refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token renovado exitosamente.',
    type: KeycloakTokenResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token expirado o inválido.',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Error de comunicación con Keycloak.',
    type: ErrorResponseDto,
  })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión y revocar tokens' })
  @ApiNoContentResponse({
    description: 'Sesión cerrada. Tokens revocados en Keycloak.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error al cerrar sesión en Keycloak.',
    type: ErrorResponseDto,
  })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refresh_token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Solicitar reset de contraseña por email' })
  @ApiNoContentResponse({
    description:
      'Email de recuperación enviado (si el usuario existe en Keycloak).',
  })
  @ApiBadRequestResponse({
    description: 'Email inválido.',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Error al enviar email o comunicar con Keycloak.',
    type: ErrorResponseDto,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
  }

  @Post('introspect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar vigencia del access_token de sesión' })
  @ApiIntrospectGuardResponse()
  async introspect(@BearerToken() token: string) {
    return this.authService.introspect(token);
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contraseña cambiada exitosamente.',
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos.',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Error al cambiar la contraseña.',
    type: ErrorResponseDto,
  })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() currentUser: IntrospectResponse,
  ) {
    await this.authService.changePassword(
      String(currentUser.userId),
      dto,
    );
    return { message: this.i18n.t('auth.PASSWORD_CHANGED') };
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  @ApiIntrospectGuardResponse()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar sesiones activas del usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sesiones activas.',
    type: [SessionResponseDto],
  })
  @ApiInternalServerErrorResponse({
    description: 'Error al obtener sesiones.',
    type: ErrorResponseDto,
  })
  async getActiveSessions(@CurrentUser() currentUser: IntrospectResponse) {
    return this.authService.getActiveSessions(String(currentUser.userId));
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard)
  @ApiIntrospectGuardResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revocar una sesión específica' })
  @ApiNoContentResponse({
    description: 'Sesión revocada exitosamente.',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error al revocar la sesión.',
    type: ErrorResponseDto,
  })
  async revokeSession(@Param('sessionId') sessionId: string) {
    await this.authService.revokeSession(sessionId);
  }

  @Get('access-history')
  @UseGuards(AuthGuard)
  @ApiIntrospectGuardResponse()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener historial de accesos del usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Historial de accesos.',
    type: [EventResponseDto],
  })
  @ApiInternalServerErrorResponse({
    description: 'Error al obtener historial de accesos.',
    type: ErrorResponseDto,
  })
  async getAccessHistory(@CurrentUser() currentUser: IntrospectResponse) {
    return this.authService.getAccessHistory(String(currentUser.userId));
  }

  @Post('encrypt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Encriptar una contraseña con AES-256-GCM',
    description:
      'Encripta una contraseña en texto plano usando la clave ENC_IDENTITY_KEY del servidor. ' +
      'El resultado se puede enviar directamente en el campo password de POST /auth/login.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contraseña encriptada exitosamente.',
    type: EncryptPasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Error al encriptar la contraseña.',
    type: ErrorResponseDto,
  })
  encryptPassword(@Body() dto: EncryptPasswordDto) {
    const encrypted = this.authService.encryptPassword(dto.password);
    return { encrypted_password: encrypted };
  }
}
