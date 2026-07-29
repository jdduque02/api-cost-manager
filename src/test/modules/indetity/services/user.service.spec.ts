import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@identity/service/user.service';
import { UserRepository } from '@identity/repositories/app-user.repositories';
import { KeycloakAdminService } from '@auth/service/keycloak-admin.service';
import { CreateUserDto } from '@identity/dto/user/create-user.dto';
import { UpdateUserDto } from '@identity/dto/user/update-user.dto';
import { UserQueryDto } from '@identity/dto/user/user-query.dto';
import { AppUser } from '@identity/entities/app-user.entity';

const mockUserRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByExternalId: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
};

const mockKeycloakAdminService = {
  createUser: jest.fn(),
  deleteUser: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((_key: string, defaultVal?: unknown) => defaultVal),
};

const buildUser = (overrides: Partial<AppUser> = {}): AppUser =>
  ({
    id: '1',
    external_id: 'kc-uuid',
    username: 'testuser',
    email: 'test@test.com',
    locale: 'es-CO',
    timezone: 'America/Bogota',
    metadata: {},
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as AppUser;

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: KeycloakAdminService, useValue: mockKeycloakAdminService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // CREATE USER
  // ─────────────────────────────────────────────────────────────
  describe('createUser', () => {
    const dto: CreateUserDto = {
      username: 'newuser',
      email: 'new@test.com',
      password: 'secret123',
    } as CreateUserDto;

    it('debe crear el usuario en Keycloak y en BD', async () => {
      const user = buildUser({ username: 'newuser', email: 'new@test.com' });
      mockKeycloakAdminService.createUser.mockResolvedValue('kc-new-uuid');
      mockUserRepository.create.mockResolvedValue(user);

      const result = await service.createUser(dto);
      expect(mockKeycloakAdminService.createUser).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
      expect(result.username).toBe('newuser');
    });

    it('debe hacer rollback en Keycloak si falla la BD', async () => {
      mockKeycloakAdminService.createUser.mockResolvedValue('kc-new-uuid');
      mockUserRepository.create.mockRejectedValue(new Error('DB error'));
      mockKeycloakAdminService.deleteUser.mockResolvedValue(undefined);

      await expect(service.createUser(dto)).rejects.toThrow('DB error');
      expect(mockKeycloakAdminService.deleteUser).toHaveBeenCalledWith('kc-new-uuid');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FIND USER
  // ─────────────────────────────────────────────────────────────
  describe('findUser', () => {
    it('debe retornar usuario desde caché si existe', async () => {
      const cached = buildUser();
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.findUser('1');
      expect(result).toEqual(cached);
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('debe consultar BD y guardar en caché si no está cacheado', async () => {
      const user = buildUser();
      mockCacheManager.get.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await service.findUser('1');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
      expect(mockCacheManager.set).toHaveBeenCalledWith('user_1', user, 60000);
      expect(result).toEqual(user);
    });

    it('debe retornar null si el usuario no existe en BD ni caché', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.findUser('99');
      expect(result).toBeNull();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // UPDATE USER
  // ─────────────────────────────────────────────────────────────
  describe('updateUser', () => {
    it('debe actualizar usuario e invalidar caché', async () => {
      const dto: UpdateUserDto = { username: 'updated' } as UpdateUserDto;
      const updated = buildUser({ username: 'updated' });
      mockUserRepository.update.mockResolvedValue(updated);

      const result = await service.updateUser('1', dto);
      expect(mockUserRepository.update).toHaveBeenCalledWith('1', dto);
      expect(mockCacheManager.del).toHaveBeenCalledWith('user_1');
      expect(result.username).toBe('updated');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FIND ALL
  // ─────────────────────────────────────────────────────────────
  describe('findAllUsers', () => {
    it('debe delegar al repositorio con el query dto', async () => {
      const query: UserQueryDto = { page: 1, limit: 10 };
      const users = [buildUser()];
      mockUserRepository.findAll.mockResolvedValue({ data: users, total: 1 });

      const result = await service.findAllUsers(query);
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(query);
      expect(result.total).toBe(1);
    });
  });
});
