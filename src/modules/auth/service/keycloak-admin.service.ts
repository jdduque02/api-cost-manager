import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { KeycloakUserRepresentation } from '@identity/interfaces/KeycloakUserRepresentation.dto';

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);

  private readonly baseUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  private static readonly ADMIN_TOKEN_CACHE_KEY = 'keycloak:admin_token';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.baseUrl = this.configService.get<string>('KEYCLOAK_URL')!;
    this.realm = this.configService.get<string>('KEYCLOAK_REALM')!;
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>('KEYCLOAK_SECRET')!;
  }

  private get adminUrl(): string {
    return `${this.baseUrl}/admin/realms/${this.realm}`;
  }

  private async getAdminToken(): Promise<string> {
    const cached = await this.cacheManager.get<string>(KeycloakAdminService.ADMIN_TOKEN_CACHE_KEY);
    if (cached) return cached;

    const url = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ access_token: string; expires_in: number }>(url, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      const expiresIn = response.data.expires_in ?? 60;
      const token = response.data.access_token;
      // Guarda en Redis con TTL = expires_in - 10s de buffer
      await this.cacheManager.set(
        KeycloakAdminService.ADMIN_TOKEN_CACHE_KEY,
        token,
        (expiresIn - 10) * 1000,
      );
      return token;
    } catch (error: any) {
      this.logger.error(
        `[getAdminToken] Status: ${error?.response?.status} | Data: ${JSON.stringify(error?.response?.data)} | Message: ${error?.message}`,
      );
      throw new InternalServerErrorException('No se pudo obtener el token de administracion de Keycloak.');
    }
  }

  async createUser(dto: { username: string; email: string; password: string }): Promise<string> {
    const token = await this.getAdminToken();
    const payload: KeycloakUserRepresentation = {
      username: dto.username,
      email: dto.email,
      enabled: true,
      credentials: [{ type: 'password', value: dto.password, temporary: false }],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.adminUrl}/users`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      const location = response.headers['location'] as string;
      const keycloakId = location.split('/').at(-1) ?? '';
      this.logger.log(`Usuario creado en Keycloak: ${keycloakId}`);
      return keycloakId;
    } catch (error: any) {
      if (error?.response?.status === 409) {
        throw new ConflictException('El usuario ya existe en Keycloak (username o email duplicado).');
      }
      this.logger.error('Error al crear usuario en Keycloak', error?.response?.data);
      throw new InternalServerErrorException('Error al registrar el usuario en Keycloak.');
    }
  }

  async deleteUser(keycloakId: string): Promise<void> {
    const token = await this.getAdminToken();
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.adminUrl}/users/${keycloakId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      this.logger.warn(`Usuario eliminado de Keycloak (rollback): ${keycloakId}`);
    } catch (error: any) {
      this.logger.error(`No se pudo eliminar el usuario de Keycloak: ${keycloakId}`, error?.response?.data);
    }
  }

  async findKeycloakIdByEmail(email: string): Promise<string> {
    const token = await this.getAdminToken();
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ id: string }[]>(`${this.adminUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { email, exact: true },
        }),
      );
      const users = response.data;
      if (!users.length) {
        throw new NotFoundException(`No existe un usuario con el email: ${email}`);
      }
      return users[0].id;
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('[findKeycloakIdByEmail]', error?.response?.data);
      throw new InternalServerErrorException('Error al buscar el usuario en Keycloak.');
    }
  }

  async sendResetPasswordEmail(keycloakId: string): Promise<void> {
    const token = await this.getAdminToken();
    try {
      await firstValueFrom(
        this.httpService.put(
          `${this.adminUrl}/users/${keycloakId}/execute-actions-email`,
          ['UPDATE_PASSWORD'],
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      this.logger.log(`Email de reset de contrasena enviado: ${keycloakId}`);
    } catch (error: any) {
      this.logger.error('[sendResetPasswordEmail]', error?.response?.data);
      throw new InternalServerErrorException('No se pudo enviar el email de recuperacion.');
    }
  }
}
