import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AuthService } from '@auth/service/auth.service';
import { KeycloakAdminService } from '@auth/service/keycloak-admin.service';
import { UserRepository } from '@identity/repositories/app-user.repositories';
import { PasswordResetOtp } from '@auth/entities/password-reset-otp.entity';
import { MailService } from '@mail/service/mail.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoginDto } from '@auth/dto/login.dto';
import { RefreshTokenDto } from '@auth/dto/refresh-token.dto';
import { EncryptionService } from '@shared/services/encryption.service';
import { IpBlockService } from '@shared/services/ip-block.service';
import { I18nService } from 'nestjs-i18n';

const mockHttpService = {
  post: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      KEYCLOAK_URL: 'http://localhost:8080',
      KEYCLOAK_REALM: 'master',
      KEYCLOAK_CLIENT_ID: 'my-nestjs-app',
      KEYCLOAK_SECRET: 'test-secret',
    };
    return config[key];
  }),
};

const mockKeycloakAdminService = {
  createUser: jest.fn(),
  deleteUser: jest.fn(),
  findKeycloakIdByEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn(),
};

const mockUserRepository = {
  create: jest.fn(),
  findByExternalId: jest.fn(),
  findByUsername: jest.fn(),
  update: jest.fn(),
  recordLogin: jest.fn(),
};

const mockEncryptionService = {
  isEncrypted: jest.fn(() => true),
  decrypt: jest.fn((value: string) => value),
  encrypt: jest.fn((value: string) => value),
};

const mockIpBlockService = {
  recordFailedAttempt: jest.fn().mockResolvedValue({
    blocked: false,
    remainingAttempts: 4,
  }),
  resetAttempts: jest.fn(),
};

const mockI18nService = {
  t: jest.fn((key: string) => key),
};

const mockOtpRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  create: jest.fn((data: unknown) => data),
};

const mockMailService = {
  sendOtp: jest.fn(),
};

const TEST_IP = '127.0.0.1';

const axiosResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as unknown as AxiosResponse<T>['config'],
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: KeycloakAdminService, useValue: mockKeycloakAdminService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: IpBlockService, useValue: mockIpBlockService },
        { provide: I18nService, useValue: mockI18nService },
        {
          provide: getRepositoryToken(PasswordResetOtp),
          useValue: mockOtpRepo,
        },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────
  describe('login', () => {
    const dto: LoginDto = { username: 'testuser', password: 'pass123' };
    const tokenResponse = {
      access_token: 'abc',
      refresh_token: 'def',
      expires_in: 300,
      refresh_expires_in: 1800,
      token_type: 'Bearer',
      session_state: 'sess',
      scope: 'openid',
    };

    it('debe retornar KeycloakTokenResponse en login exitoso', async () => {
      mockUserRepository.findByUsername.mockResolvedValue({ id: '123' });
      mockHttpService.post.mockReturnValue(of(axiosResponse(tokenResponse)));
      const result = await service.login(dto, TEST_IP);
      expect(result).toEqual({ ...tokenResponse, userId: 123 });
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
      expect(mockIpBlockService.resetAttempts).toHaveBeenCalledWith(TEST_IP);
      expect(mockUserRepository.recordLogin).toHaveBeenCalledWith(
        '123',
        expect.any(Array),
      );
    });

    it('debe lanzar UnauthorizedException con credenciales inválidas (401)', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({ response: { status: 401, data: {} } })),
      );
      await expect(service.login(dto, TEST_IP)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockIpBlockService.recordFailedAttempt).toHaveBeenCalledWith(
        TEST_IP,
      );
    });

    it('debe lanzar UnauthorizedException con credenciales inválidas (400)', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({ response: { status: 400, data: {} } })),
      );
      await expect(service.login(dto, TEST_IP)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar InternalServerErrorException en error de red', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({ response: { status: 500, data: {} } })),
      );
      await expect(service.login(dto, TEST_IP)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockIpBlockService.recordFailedAttempt).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // REFRESH
  // ─────────────────────────────────────────────────────────────
  describe('refresh', () => {
    const dto: RefreshTokenDto = { refresh_token: 'valid-refresh-token' };

    it('debe retornar nuevos tokens en refresh exitoso', async () => {
      const tokenResponse = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      };
      mockHttpService.post.mockReturnValue(of(axiosResponse(tokenResponse)));
      const result = await service.refresh(dto);
      expect(result).toEqual(tokenResponse);
    });

    it('debe lanzar UnauthorizedException si el refresh token es inválido (401)', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({ response: { status: 401, data: {} } })),
      );
      await expect(service.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar InternalServerErrorException en error de red', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({ response: { status: 500, data: {} } })),
      );
      await expect(service.refresh(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('debe cerrar sesión correctamente', async () => {
      mockHttpService.post.mockReturnValue(of(axiosResponse({})));
      await expect(
        service.logout('valid-refresh-token'),
      ).resolves.toBeUndefined();
    });

    it('debe lanzar InternalServerErrorException en error de red', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({ response: { status: 500, data: {} } })),
      );
      await expect(service.logout('token')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('debe enviar email de recuperación correctamente', async () => {
      mockKeycloakAdminService.findKeycloakIdByEmail.mockResolvedValue(
        'kc-id-123',
      );
      mockUserRepository.findByExternalId.mockResolvedValue({
        id: '7',
        username: 'testuser',
      });
      mockOtpRepo.update.mockResolvedValue(undefined);
      mockOtpRepo.save.mockResolvedValue({});
      await expect(
        service.forgotPassword('user@test.com'),
      ).resolves.toBeUndefined();
      expect(
        mockKeycloakAdminService.findKeycloakIdByEmail,
      ).toHaveBeenCalledWith('user@test.com');
      expect(mockMailService.sendOtp).toHaveBeenCalledWith(
        'user@test.com',
        expect.any(String),
        'testuser',
      );
    });

    it('debe ignorar silenciosamente si el email no existe en Keycloak', async () => {
      mockKeycloakAdminService.findKeycloakIdByEmail.mockRejectedValue(
        new UnauthorizedException('Email no encontrado.'),
      );
      await expect(
        service.forgotPassword('noexiste@test.com'),
      ).resolves.toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // INTROSPECT
  // ─────────────────────────────────────────────────────────────
  describe('introspect', () => {
    const now = Math.floor(Date.now() / 1000);
    const activeTokenData = {
      active: true,
      exp: now + 300,
      iat: now,
      sub: 'user-uuid',
      preferred_username: 'testuser',
      email: 'test@test.com',
      realm_access: { roles: ['user'] },
    };

    it('debe retornar IntrospectResponse con token activo', async () => {
      mockUserRepository.findByUsername.mockResolvedValue({ id: '123' });
      mockHttpService.post.mockReturnValue(of(axiosResponse(activeTokenData)));
      const result = await service.introspect('valid-token');
      expect(result.active).toBe(true);
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@test.com');
      expect(result.expires_in_seconds).toBeGreaterThan(0);
    });

    it('debe lanzar UnauthorizedException si active=false', async () => {
      mockHttpService.post.mockReturnValue(
        of(axiosResponse({ active: false })),
      );
      await expect(service.introspect('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar InternalServerErrorException en error de red', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({ response: { status: 500, data: {} } })),
      );
      await expect(service.introspect('any-token')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
