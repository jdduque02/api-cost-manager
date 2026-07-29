import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthController } from '@auth/controller/auth.controller';
import { AuthService } from '@auth/service/auth.service';
import { LoginDto } from '@auth/dto/login.dto';
import { RefreshTokenDto } from '@auth/dto/refresh-token.dto';
import { ForgotPasswordDto } from '@auth/dto/forgot-password.dto';

const mockAuthService = {
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  introspect: jest.fn(),
};

const tokenResponse = {
  access_token: 'access-jwt',
  refresh_token: 'refresh-jwt',
  expires_in: 300,
  refresh_expires_in: 1800,
  token_type: 'Bearer',
  session_state: 'sess-uuid',
  scope: 'openid',
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────
  describe('login', () => {
    const dto: LoginDto = { username: 'testuser', password: 'pass123' };

    it('debe retornar KeycloakTokenResponse en login exitoso', async () => {
      mockAuthService.login.mockResolvedValue(tokenResponse);
      const result = await controller.login(dto);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(tokenResponse);
    });

    it('debe propagar UnauthorizedException con credenciales inválidas', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Credenciales inválidas.'));
      await expect(controller.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('debe propagar InternalServerErrorException en error de Keycloak', async () => {
      mockAuthService.login.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.login(dto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // REFRESH
  // ─────────────────────────────────────────────────────────────
  describe('refresh', () => {
    const dto: RefreshTokenDto = { refresh_token: 'valid-refresh' };

    it('debe retornar nuevos tokens en refresh exitoso', async () => {
      mockAuthService.refresh.mockResolvedValue(tokenResponse);
      const result = await controller.refresh(dto);
      expect(mockAuthService.refresh).toHaveBeenCalledWith(dto);
      expect(result).toEqual(tokenResponse);
    });

    it('debe propagar UnauthorizedException si el refresh token es inválido', async () => {
      mockAuthService.refresh.mockRejectedValue(
        new UnauthorizedException('Sesión expirada o token inválido.'),
      );
      await expect(controller.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('debe propagar InternalServerErrorException en error de Keycloak', async () => {
      mockAuthService.refresh.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.refresh(dto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────
  describe('logout', () => {
    const dto: RefreshTokenDto = { refresh_token: 'valid-refresh' };

    it('debe cerrar sesión correctamente y retornar undefined', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const result = await controller.logout(dto);
      expect(mockAuthService.logout).toHaveBeenCalledWith(dto.refresh_token);
      expect(result).toBeUndefined();
    });

    it('debe propagar InternalServerErrorException si Keycloak falla', async () => {
      mockAuthService.logout.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.logout(dto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    const dto: ForgotPasswordDto = { email: 'user@test.com' };

    it('debe enviar email de recuperación y retornar undefined', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined);
      const result = await controller.forgotPassword(dto);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto.email);
      expect(result).toBeUndefined();
    });

    it('debe propagar la excepción si el email no existe en Keycloak', async () => {
      mockAuthService.forgotPassword.mockRejectedValue(
        new InternalServerErrorException('Error al enviar email.'),
      );
      await expect(controller.forgotPassword(dto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // INTROSPECT
  // ─────────────────────────────────────────────────────────────
  describe('introspect', () => {
    const introspectResponse = {
      active: true,
      sub: 'user-uuid',
      username: 'testuser',
      email: 'test@test.com',
      expires_in_seconds: 250,
    };

    it('debe retornar IntrospectResponse con token válido', async () => {
      mockAuthService.introspect.mockResolvedValue(introspectResponse);
      const result = await controller.introspect('valid-access-token');
      expect(mockAuthService.introspect).toHaveBeenCalledWith('valid-access-token');
      expect(result.active).toBe(true);
      expect(result.username).toBe('testuser');
    });

    it('debe propagar UnauthorizedException si el token es inválido', async () => {
      mockAuthService.introspect.mockRejectedValue(
        new UnauthorizedException('El token ha expirado o no es válido.'),
      );
      await expect(controller.introspect('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('debe propagar InternalServerErrorException en error de Keycloak', async () => {
      mockAuthService.introspect.mockRejectedValue(new InternalServerErrorException());
      await expect(controller.introspect('any-token')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
