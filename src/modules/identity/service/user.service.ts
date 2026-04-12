import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UserRepository } from '../repositories/app-user.repositories';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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
