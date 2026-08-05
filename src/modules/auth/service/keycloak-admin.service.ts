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
import { I18nService } from 'nestjs-i18n';
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
    @Inject(I18nService) private readonly i18n: I18nService,
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
    const cached = await this.cacheManager.get<string>(
      KeycloakAdminService.ADMIN_TOKEN_CACHE_KEY,
    );
    if (cached) return cached;

    const url = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;
    this.logger.log(
      `[getAdminToken] URL: ${url} | clientId: ${this.clientId} | clientSecret: ${this.clientSecret ? '****' : 'UNDEFINED'}`,
    );
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ access_token: string; expires_in: number }>(
          url,
          body.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
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
      throw new InternalServerErrorException(
        this.i18n.t('auth.KEYCLOAK_ADMIN_TOKEN_ERROR'),
      );
    }
  }

  async createUser(dto: {
    username: string;
    email: string;
    password: string;
  }): Promise<string> {
    const token = await this.getAdminToken();
    const payload: KeycloakUserRepresentation = {
      username: dto.username,
      email: dto.email,
      enabled: true,
      credentials: [
        { type: 'password', value: dto.password, temporary: false },
      ],
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
        throw new ConflictException(this.i18n.t('auth.USER_EXISTS_KEYCLOAK'));
      }
      if (error?.response?.status === 403) {
        this.logger.error(
          'Keycloak 403 Forbidden — El client no tiene permisos de administrador (realm-admin en realm-management).',
          error?.response?.data,
        );
        throw new InternalServerErrorException(
          this.i18n.t('auth.USER_REGISTER_ERROR'),
        );
      }
      this.logger.error(
        'Error al crear usuario en Keycloak',
        error?.response?.data,
      );
      throw new InternalServerErrorException(
        this.i18n.t('auth.USER_REGISTER_ERROR'),
      );
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
      this.logger.warn(
        `Usuario eliminado de Keycloak (rollback): ${keycloakId}`,
      );
    } catch (error: any) {
      if (error?.response?.status === 403) {
        this.logger.error(
          `Keycloak 403 Forbidden al eliminar usuario ${keycloakId} — Verificar permisos realm-admin.`,
          error?.response?.data,
        );
      } else {
        this.logger.error(
          `No se pudo eliminar el usuario de Keycloak: ${keycloakId}`,
          error?.response?.data,
        );
      }
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
        throw new NotFoundException(
          this.i18n.t('auth.USER_NOT_FOUND_EMAIL', { args: { email } }),
        );
      }
      return users[0].id;
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      if (error?.response?.status === 403) {
        this.logger.error(
          '[findKeycloakIdByEmail] Keycloak 403 Forbidden — Verificar permisos realm-admin.',
          error?.response?.data,
        );
      } else {
        this.logger.error('[findKeycloakIdByEmail]', error?.response?.data);
      }
      throw new InternalServerErrorException(
        this.i18n.t('auth.USER_SEARCH_ERROR'),
      );
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
      if (error?.response?.status === 403) {
        this.logger.error(
          '[sendResetPasswordEmail] Keycloak 403 Forbidden — Verificar permisos realm-admin.',
          error?.response?.data,
        );
      } else {
        this.logger.error('[sendResetPasswordEmail]', error?.response?.data);
      }
      throw new InternalServerErrorException(
        this.i18n.t('auth.PASSWORD_RESET_ERROR'),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // VERIFY PASSWORD — valida credenciales actuales del usuario
  // ─────────────────────────────────────────────────────────────

  async verifyPassword(username: string, password: string): Promise<boolean> {
    const url = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username,
      password,
    });

    try {
      await firstValueFrom(
        this.httpService.post(url, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      return true;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 400) {
        return false;
      }
      this.logger.error('[verifyPassword]', error?.response?.data);
      throw new InternalServerErrorException(
        this.i18n.t('auth.KEYCLOAK_AUTH_ERROR'),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CHANGE PASSWORD — cambia la contraseña de un usuario en Keycloak
  // ─────────────────────────────────────────────────────────────

  async changePassword(keycloakId: string, newPassword: string): Promise<void> {
    const token = await this.getAdminToken();
    try {
      await firstValueFrom(
        this.httpService.put(
          `${this.adminUrl}/users/${keycloakId}/reset-password`,
          { type: 'password', value: newPassword, temporary: false },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      this.logger.log(
        `Contrasena cambiada para usuario Keycloak: ${keycloakId}`,
      );
    } catch (error: any) {
      if (error?.response?.status === 403) {
        this.logger.error(
          '[changePassword] Keycloak 403 Forbidden — Verificar permisos realm-admin.',
          error?.response?.data,
        );
      } else {
        this.logger.error('[changePassword]', error?.response?.data);
      }
      throw new InternalServerErrorException(
        this.i18n.t('auth.PASSWORD_CHANGE_ERROR'),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GET USER SESSIONS — obtiene las sesiones activas de un usuario
  // ─────────────────────────────────────────────────────────────

  async getUserSessions(keycloakId: string): Promise<any[]> {
    const token = await this.getAdminToken();
    try {
      const response = await firstValueFrom(
        this.httpService.get<any[]>(
          `${this.adminUrl}/users/${keycloakId}/sessions`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('[getUserSessions]', error?.response?.data);
      throw new InternalServerErrorException(
        this.i18n.t('auth.SESSIONS_ERROR'),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // REVOKE SESSION — cierra una sesión específica
  // ─────────────────────────────────────────────────────────────

  async revokeSession(sessionId: string): Promise<void> {
    const token = await this.getAdminToken();
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.adminUrl}/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      this.logger.log(`Sesion revocada: ${sessionId}`);
    } catch (error: any) {
      this.logger.error('[revokeSession]', error?.response?.data);
      throw new InternalServerErrorException(
        this.i18n.t('auth.SESSION_REVOKE_ERROR'),
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GET USER EVENTS — obtiene eventos de auditoría de Keycloak
  // ─────────────────────────────────────────────────────────────

  async getUserEvents(keycloakId: string, max = 50): Promise<any[]> {
    const token = await this.getAdminToken();
    try {
      const response = await firstValueFrom(
        this.httpService.get<any[]>(`${this.adminUrl}/events`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { user: keycloakId, max },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('[getUserEvents]', error?.response?.data);
      throw new InternalServerErrorException(this.i18n.t('auth.EVENTS_ERROR'));
    }
  }
}
