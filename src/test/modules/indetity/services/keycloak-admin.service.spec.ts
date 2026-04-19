import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { KeycloakAdminService } from '@identity/service/keycloak-admin.service';

const mockHttpService = {
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  put: jest.fn(),
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

const axiosResponse = <T>(data: T, headers: Record<string, string> = {}): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers,
  config: { headers: {} } as any,
});

const ADMIN_TOKEN = 'admin-jwt-token';

describe('KeycloakAdminService', () => {
  let service: KeycloakAdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakAdminService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<KeycloakAdminService>(KeycloakAdminService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // GET ADMIN TOKEN
  // ─────────────────────────────────────────────────────────────
  describe('getAdminToken', () => {
    it('debe retornar el access_token de administración', async () => {
      mockHttpService.post.mockReturnValue(of(axiosResponse({ access_token: ADMIN_TOKEN })));
      const token = await service.getAdminToken();
      expect(token).toBe(ADMIN_TOKEN);
    });

    it('debe lanzar InternalServerErrorException si Keycloak falla', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({ response: { status: 500, data: {} }, message: 'Network error' })),
      );
      await expect(service.getAdminToken()).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // CREATE USER
  // ─────────────────────────────────────────────────────────────
  describe('createUser', () => {
    const dto = { username: 'newuser', email: 'new@test.com', password: 'pass123' };
    const locationHeader = { location: 'http://keycloak/realms/master/users/new-kc-id' };

    beforeEach(() => {
      // getAdminToken siempre exitoso
      mockHttpService.post.mockReturnValueOnce(of(axiosResponse({ access_token: ADMIN_TOKEN })));
    });

    it('debe crear el usuario y retornar su keycloakId', async () => {
      mockHttpService.post.mockReturnValueOnce(of(axiosResponse({}, locationHeader)));
      const result = await service.createUser(dto);
      expect(result).toBe('new-kc-id');
    });

    it('debe lanzar ConflictException si el usuario ya existe (409)', async () => {
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => ({ response: { status: 409, data: {} } })),
      );
      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
    });

    it('debe lanzar InternalServerErrorException en error de red', async () => {
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => ({ response: { status: 500, data: {} } })),
      );
      await expect(service.createUser(dto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // DELETE USER (rollback)
  // ─────────────────────────────────────────────────────────────
  describe('deleteUser', () => {
    beforeEach(() => {
      mockHttpService.post.mockReturnValueOnce(of(axiosResponse({ access_token: ADMIN_TOKEN })));
    });

    it('debe eliminar el usuario de Keycloak sin lanzar excepción', async () => {
      mockHttpService.delete.mockReturnValue(of(axiosResponse({})));
      await expect(service.deleteUser('kc-id-123')).resolves.toBeUndefined();
      expect(mockHttpService.delete).toHaveBeenCalledTimes(1);
    });

    it('debe silenciar el error si la eliminación falla (rollback best-effort)', async () => {
      mockHttpService.delete.mockReturnValue(
        throwError(() => ({ response: { status: 500, data: {} } })),
      );
      // No debe lanzar excepción — es best-effort
      await expect(service.deleteUser('kc-id-123')).resolves.toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FIND KEYCLOAK ID BY EMAIL
  // ─────────────────────────────────────────────────────────────
  describe('findKeycloakIdByEmail', () => {
    beforeEach(() => {
      mockHttpService.post.mockReturnValueOnce(of(axiosResponse({ access_token: ADMIN_TOKEN })));
    });

    it('debe retornar el keycloakId del usuario encontrado', async () => {
      mockHttpService.get.mockReturnValue(
        of(axiosResponse([{ id: 'found-kc-id', username: 'testuser' }])),
      );
      const result = await service.findKeycloakIdByEmail('test@test.com');
      expect(result).toBe('found-kc-id');
    });

    it('debe lanzar NotFoundException si no existe usuario con ese email', async () => {
      mockHttpService.get.mockReturnValue(of(axiosResponse([])));
      await expect(service.findKeycloakIdByEmail('noexiste@test.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar InternalServerErrorException en error de red', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => ({ response: { status: 500, data: {} } })),
      );
      await expect(service.findKeycloakIdByEmail('test@test.com')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SEND RESET PASSWORD EMAIL
  // ─────────────────────────────────────────────────────────────
  describe('sendResetPasswordEmail', () => {
    beforeEach(() => {
      mockHttpService.post.mockReturnValueOnce(of(axiosResponse({ access_token: ADMIN_TOKEN })));
    });

    it('debe enviar el email de reset sin lanzar excepción', async () => {
      mockHttpService.put.mockReturnValue(of(axiosResponse({})));
      await expect(service.sendResetPasswordEmail('kc-id-123')).resolves.toBeUndefined();
      expect(mockHttpService.put).toHaveBeenCalledTimes(1);
    });

    it('debe lanzar InternalServerErrorException si Keycloak falla', async () => {
      mockHttpService.put.mockReturnValue(
        throwError(() => ({ response: { status: 500, data: {} } })),
      );
      await expect(service.sendResetPasswordEmail('kc-id-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
