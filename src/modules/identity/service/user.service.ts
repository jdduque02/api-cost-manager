import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UserRepository } from '../repositories/app-user.repositories';
import { KeycloakAdminService } from './keycloak-admin.service';
import { CreateUserDto } from '../dto/user/create-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly keycloakAdminService: KeycloakAdminService,
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
      const user = await this.userRepository.create({ ...userPayload, keycloak_id: keycloakId });
      this.logger.log(`Usuario creado y sincronizado con Keycloak: ${user.id}`);
      return user;
    } catch (error) {
      await this.keycloakAdminService.deleteUser(keycloakId);
      throw error;
    }
  }

  async findUser(id: number) {
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
      await this.cacheManager.set(cacheKey, user, 60000); // 60 segundos
    }

    return user;
  }
}
