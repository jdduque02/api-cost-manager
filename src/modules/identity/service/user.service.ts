import { Injectable, Inject, Logger, ForbiddenException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '@identity/repositories/app-user.repositories';
import { KeycloakAdminService } from '@auth/service/keycloak-admin.service';
import { CreateUserDto } from '@identity/dto/user/create-user.dto';
import { UpdateUserDto } from '@identity/dto/user/update-user.dto';
import { UserQueryDto } from '@identity/dto/user/user-query.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async createUser(dto: CreateUserDto) {
    const keycloakId = await this.keycloakAdminService.createUser({
      username: dto.username,
      email: dto.email,
      password: dto.password,
    });

    // 2. Persistir perfil en BD local; rollback en Keycloak si falla
    try {
      const { password: _pw, ...userPayload } = dto;
      const user = await this.userRepository.create({ ...userPayload, external_id: keycloakId });
      this.logger.log(`Usuario creado y sincronizado con Keycloak: ${user.id}`);
      return user;
    } catch (error) {
      await this.keycloakAdminService.deleteUser(keycloakId);
      throw error;
    }
  }

  async findUser(id: string) {
    const cacheKey = `user_${id}`;

    // 1. Intenta obtener de Redis (caché)
    const cachedUser = await this.cacheManager.get(cacheKey);
    if (cachedUser) {
      this.logger.log(`Usuario obtenido desde Redis Caché: ${id}`);
      return cachedUser;
    }

    // 2. Si no está en caché, consulta PostgreSQL vía el Repositorio
    this.logger.log(`Usuario no encontrado en caché, consultando DB: ${id}`);
    const user = await this.userRepository.findById(id);

    // 3. Guarda en Redis
    if (user) {
      const ttl = this.configService.get<number>('USER_CACHE_TTL_MS', 60000);
      await this.cacheManager.set(cacheKey, user, ttl);
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.userRepository.update(id, dto);
    await this.cacheManager.del(`user_${id}`);
    this.logger.log(`Cache invalidado para usuario ID: ${id}`);
    return user;
  }

  async findAllUsers(query: UserQueryDto) {
    return this.userRepository.findAll(query);
  }

  /**
   * Verifica que el keycloakId del token sea el propietario del userId del path.
   * Lanza ForbiddenException si no coincide.
   */
  async assertOwnership(userId: string, externalId: string | undefined): Promise<void> {
    if (!externalId) throw new ForbiddenException('No se pudo verificar la identidad del solicitante.');
    const user = await this.userRepository.findByExternalId(externalId);
    if (user?.id !== userId) {
      throw new ForbiddenException('No tienes permiso para acceder a este recurso.');
    }
  }
}
