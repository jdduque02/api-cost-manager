import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
import { AuthService } from '@auth/service/auth.service';
import { LoginDto } from '@auth/dto/login.dto';
import { RefreshTokenDto } from '@auth/dto/refresh-token.dto';
import { ForgotPasswordDto } from '@auth/dto/forgot-password.dto';
import { KeycloakTokenResponse } from '@auth/interfaces/KeycloakTokenResponse.dto';
import { ErrorResponseDto } from '@shared/dto/error-response.dto';

@ApiTags('auth')
@ApiExtraModels(KeycloakTokenResponse)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuario y obtener tokens' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso.',
    schema: {
      properties: {
        status: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Operación exitosa' },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(KeycloakTokenResponse) },
        },
        timestamp: { type: 'string', format: 'date-time', example: '2026-04-19T21:38:04.349Z' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas.', type: ErrorResponseDto })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos.', type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: 'Error de comunicación con Keycloak.', type: ErrorResponseDto })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar sesión con refresh token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token renovado exitosamente.', type: KeycloakTokenResponse })
  @ApiUnauthorizedResponse({ description: 'Refresh token expirado o inválido.', type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: 'Error de comunicación con Keycloak.', type: ErrorResponseDto })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión y revocar tokens' })
  @ApiNoContentResponse({ description: 'Sesión cerrada. Tokens revocados en Keycloak.' })
  @ApiInternalServerErrorResponse({ description: 'Error al cerrar sesión en Keycloak.', type: ErrorResponseDto })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refresh_token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Solicitar reset de contraseña por email' })
  @ApiNoContentResponse({ description: 'Email de recuperación enviado (si el usuario existe en Keycloak).' })
  @ApiBadRequestResponse({ description: 'Email inválido.', type: ErrorResponseDto })
  @ApiInternalServerErrorResponse({ description: 'Error al enviar email o comunicar con Keycloak.', type: ErrorResponseDto })
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
}
