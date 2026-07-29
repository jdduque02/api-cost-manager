import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { UserRepository } from '@identity/repositories/app-user.repositories';
import { AppUser } from '@identity/entities/app-user.entity';
import { UserQueryDto } from '@identity/dto/user/user-query.dto';

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
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }) as AppUser;

// Builder de QueryBuilder encadenable
const buildQb = (result: [AppUser[], number]) => {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  };
  return qb;
};

const mockTypeOrmRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  merge: jest.fn(),
  softRemove: jest.fn(),
  restore: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: getRepositoryToken(AppUser), useValue: mockTypeOrmRepo },
      ],
    }).compile();

    repo = module.get<UserRepository>(UserRepository);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────
  describe('create', () => {
    it('debe crear y guardar un usuario exitosamente', async () => {
      const user = buildUser();
      mockTypeOrmRepo.create.mockReturnValue(user);
      mockTypeOrmRepo.save.mockResolvedValue(user);

      const result = await repo.create({ username: 'testuser', email: 'test@test.com', external_id: 'kc-uuid' });
      expect(mockTypeOrmRepo.create).toHaveBeenCalledTimes(1);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledTimes(1);
      expect(result.username).toBe('testuser');
    });

    it('debe lanzar ConflictException si hay violación de unicidad (código 23505)', async () => {
      const pgError = Object.assign(
        Object.create(QueryFailedError.prototype),
        {
          message: 'duplicate key value violates unique constraint',
          code: '23505',
          detail: 'Key (email)=(test@test.com) already exists.',
        },
      );
      mockTypeOrmRepo.create.mockReturnValue(buildUser());
      mockTypeOrmRepo.save.mockRejectedValue(pgError);

      await expect(
        repo.create({ username: 'testuser', email: 'test@test.com', external_id: 'kc-uuid' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FIND BY ID
  // ─────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('debe retornar el usuario si existe', async () => {
      const user = buildUser();
      mockTypeOrmRepo.findOne.mockResolvedValue(user);

      const result = await repo.findById('1');
      expect(result.id).toBe('1');
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repo.findById('99')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // FIND ALL (QueryBuilder)
  // ─────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('debe retornar lista paginada sin filtro de búsqueda', async () => {
      const users = [buildUser()];
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(buildQb([users, 1]));

      const query: UserQueryDto = { page: 1, limit: 10 };
      const result = await repo.findAll(query);
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('debe aplicar ILIKE cuando se provee search', async () => {
      const users = [buildUser()];
      const qb = buildQb([users, 1]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      const query: UserQueryDto = { search: 'test', page: 1, limit: 10 };
      await repo.findAll(query);
      expect(qb.andWhere).toHaveBeenCalledTimes(1);
    });

    it('debe retornar lista vacía si no hay resultados', async () => {
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(buildQb([[], 0]));

      const result = await repo.findAll({ page: 1, limit: 10 });
      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────
  describe('update', () => {
    it('debe actualizar el usuario y retornar la entidad actualizada', async () => {
      const user = buildUser();
      const updated = buildUser({ username: 'newname' });
      mockTypeOrmRepo.findOne.mockResolvedValue(user);
      mockTypeOrmRepo.merge.mockReturnValue(updated);
      mockTypeOrmRepo.save.mockResolvedValue(updated);

      const result = await repo.update(1, { username: 'newname' } as any);
      expect(result.username).toBe('newname');
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);
      await expect(repo.update(99, {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});
