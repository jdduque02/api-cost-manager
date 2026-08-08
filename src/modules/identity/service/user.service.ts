import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { plainToInstance } from 'class-transformer';
import { UserRepository } from '@identity/repositories/app-user.repositories';
import { KeycloakAdminService } from '@auth/service/keycloak-admin.service';
import { CreateUserDto } from '@identity/dto/user/create-user.dto';
import { UpdateUserDto } from '@identity/dto/user/update-user.dto';
import { UserQueryDto } from '@identity/dto/user/user-query.dto';
import { UserResponseDto } from '@identity/dto/user/user-response.dto';
import { AppUser } from '@identity/entities/app-user.entity';
import { EncryptionService } from '@shared/services/encryption.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(I18nService) private readonly i18n: I18nService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const keycloakId = await this.keycloakAdminService.createUser({
      username: dto.username,
      email: dto.email,
      password: dto.password,
    });

    try {
      const { password: _pw, ...userPayload } = dto;

      const user = await this.userRepository.create({
        ...userPayload,
        external_id: keycloakId,
      } as any);
      this.logger.log(`Usuario creado y sincronizado con Keycloak: ${user.id}`);
      return this.toDetailDto(user);
    } catch (error) {
      this.logger.error(
        '[createUser] Error al crear usuario; revirtiendo en Keycloak',
        error instanceof Error ? error.stack : undefined,
      );
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

    // 3. Guarda en Redis la representación pública (sin PII sensible)
    if (user) {
      const dto = this.toDetailDto(user);
      const ttl = this.configService.get<number>('USER_CACHE_TTL_MS', 60000);
      await this.cacheManager.set(cacheKey, dto, ttl);
      return dto;
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const { password: _pw, ...updatePayload } = dto;

    // Sincronizar correo con Keycloak si cambió (para que el restablecimiento
    // de contraseña y la identidad del usuario sigan coherentes).
    if (updatePayload.email) {
      const current = await this.userRepository.findById(id);
      if (current.email !== updatePayload.email) {
        await this.keycloakAdminService.updateUser(current.external_id, {
          email: updatePayload.email,
        });
      }
    }

    const user = await this.userRepository.update(id, updatePayload);
    await this.cacheManager.del(`user_${id}`);
    this.logger.log(`Cache invalidado para usuario ID: ${id}`);
    return this.toDetailDto(user);
  }

  async findAllUsers(query: UserQueryDto) {
    const { data, total } = await this.userRepository.findAll(query);
    return { data: data.map((u) => this.toPublicDto(u)), total };
  }

  private toPublicDto(user: AppUser): UserResponseDto {
    return plainToInstance(UserResponseDto, user);
  }

  private toDetailDto(user: AppUser): UserResponseDto {
    const profile = user.financial_profile;
    if (profile?.monthly_income) {
      const decrypted = this.encryptionService.decryptField(
        profile.monthly_income,
        'finance',
      );
      (profile as { monthly_income?: number | null }).monthly_income = decrypted
        ? Number(decrypted)
        : null;
    }
    return plainToInstance(UserResponseDto, user, { groups: ['detail'] });
  }
}
