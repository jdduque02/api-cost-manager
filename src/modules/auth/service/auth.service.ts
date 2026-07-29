import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from '@auth/dto/login.dto';
import { RefreshTokenDto } from '@auth/dto/refresh-token.dto';
import { ChangePasswordDto } from '@auth/dto/change-password.dto';
import { SessionResponseDto } from '@auth/dto/session-response.dto';
import { EventResponseDto } from '@auth/dto/event-response.dto';
import { KeycloakAdminService } from '@auth/service/keycloak-admin.service';
import { IntrospectResponse } from '@auth/interfaces/IntrospectResponse.dto';
import { KeycloakTokenResponse } from '@auth/interfaces/KeycloakTokenResponse.dto';
import { UserRepository } from '@identity/repositories/app-user.repositories';
import { EncryptionService } from '@shared/services/encryption.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly baseUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly keycloakAdminService: KeycloakAdminService,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
    @Inject(I18nService) private readonly i18n: I18nService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.baseUrl = this.configService.get<string>('KEYCLOAK_URL')!;
    this.realm = this.configService.get<string>('KEYCLOAK_REALM')!;
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>('KEYCLOAK_SECRET')!;
  }

  private get tokenUrl(): string {
    return `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;
  }

  // ─────────────────────────────────────────────────────────────
  // LOGIN — Resource Owner Password Credentials (ROPC)
  // ─────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<KeycloakTokenResponse> {
    if (!this.encryptionService.isEncrypted(dto.password)) {
      throw new BadRequestException(
        this.i18n.t('auth.CREDENTIALS_INVALID') + ' La contraseña debe estar encriptada con AES-256-GCM. Usa POST /auth/encrypt.',
      );
    }

    const password = this.encryptionService.decrypt(dto.password, 'identity');

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: dto.username,
      password,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<KeycloakTokenResponse>(
          this.tokenUrl,
          body.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );
      this.logger.log(`Login exitoso para: ${dto.username}`);

      const user = await this.userRepository.findByUsername(dto.username);
      const data = response.data;
      data.userId = Number.parseInt(user.id, 10);

      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 400) {
        throw new UnauthorizedException(this.i18n.t('auth.CREDENTIALS_INVALID'));
      }
      this.logger.error('[login]', error?.response?.data);
      throw new InternalServerErrorException(
        this.i18n.t('auth.KEYCLOAK_AUTH_ERROR'),
      );
    }
  }
  async refresh(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<KeycloakTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshTokenDto.refresh_token,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<KeycloakTokenResponse>(
          this.tokenUrl,
          body.toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 400 || status === 401) {
        throw new UnauthorizedException(this.i18n.t('auth.SESSION_EXPIRED'));
      }
      this.logger.error('[refresh]', error?.response?.data);
      throw new InternalServerErrorException(this.i18n.t('auth.REFRESH_ERROR'));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LOGOUT — revoca el refresh token en Keycloak
  // ─────────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<void> {
    const url = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/logout`;
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    try {
      await firstValueFrom(
        this.httpService.post(url, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      this.logger.log('Sesión cerrada en Keycloak.');
    } catch (error: any) {
      this.logger.error('[logout]', error?.response?.data);
      throw new InternalServerErrorException(this.i18n.t('auth.LOGOUT_ERROR'));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // FORGOT PASSWORD — envía email de recuperación via Keycloak
  // ─────────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    // Busca el keycloak_id por email en Keycloak Admin API
    const keycloakId =
      await this.keycloakAdminService.findKeycloakIdByEmail(email);
    // Dispara la acción UPDATE_PASSWORD → Keycloak envía el email
    await this.keycloakAdminService.sendResetPasswordEmail(keycloakId);
    this.logger.log(`Email de recuperación enviado a: ${email}`);
  }

  // ─────────────────────────────────────────────────────────────
  // ENCRYPT — encripta una contraseña con AES-256-GCM
  // ─────────────────────────────────────────────────────────────

  encryptPassword(plainPassword: string): string {
    try {
      return this.encryptionService.encrypt(plainPassword, 'identity');
    } catch (error) {
      this.logger.error('[encrypt]', (error as Error).message);
      throw new BadRequestException(this.i18n.t('auth.ENCRYPT_ERROR'));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // INTROSPECT — valida vigencia del access_token contra Keycloak
  // ─────────────────────────────────────────────────────────────

  async introspect(accessToken: string): Promise<IntrospectResponse> {
    const url = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token/introspect`;
    const body = new URLSearchParams({
      token: accessToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    let data: Record<string, any>;

    try {
      const response = await firstValueFrom(
        this.httpService.post<Record<string, any>>(url, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      data = response.data;
    } catch (error: any) {
      const kcData = error?.response?.data;
      const errMsg = kcData
        ? JSON.stringify(kcData)
        : error?.message || String(error);
      this.logger.error('[introspect] Keycloak error:', errMsg);
      throw new InternalServerErrorException(
        this.i18n.t('auth.KEYCLOAK_INTROSPECT_ERROR'),
      );
    }

    if (!data.active) {
      throw new UnauthorizedException(this.i18n.t('auth.TOKEN_EXPIRED'));
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = data.exp ? data.exp - now : undefined;

    const user = await this.userRepository.findByUsername(data.preferred_username);

    return {
      active: true,
      exp: data.exp,
      iat: data.iat,
      sub: data.sub,
      username: data.preferred_username,
      email: data.email,
      realm_access: data.realm_access,
      expires_in_seconds: expiresInSeconds,
      userId: Number.parseInt(user.id, 10),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CHANGE PASSWORD — cambia la contraseña del usuario autenticado
  // ─────────────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user.external_id) {
      throw new InternalServerErrorException(
        this.i18n.t('auth.KEYCLOAK_ID_MISSING'),
      );
    }

    await this.keycloakAdminService.changePassword(
      user.external_id,
      dto.newPassword,
    );
    this.logger.log(`Contrasena cambiada para usuario: ${userId}`);
  }

  // ─────────────────────────────────────────────────────────────
  // GET ACTIVE SESSIONS — lista las sesiones activas en Keycloak
  // ─────────────────────────────────────────────────────────────

  async getActiveSessions(userId: string): Promise<SessionResponseDto[]> {
    const user = await this.userRepository.findById(userId);

    if (!user.external_id) {
      throw new InternalServerErrorException(
        this.i18n.t('auth.KEYCLOAK_ID_MISSING'),
      );
    }

    const sessions = await this.keycloakAdminService.getUserSessions(
      user.external_id,
    );

    return sessions.map(
      (s: any) =>
        new SessionResponseDto({
          id: s.id,
          ipAddress: s.ipAddress,
          browser: s.clients?.join(', ') ?? '',
          start: s.start,
          lastAccess: s.lastAccess,
        }),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // REVOKE SESSION — cierra una sesión específica
  // ─────────────────────────────────────────────────────────────

  async revokeSession(sessionId: string): Promise<void> {
    await this.keycloakAdminService.revokeSession(sessionId);
    this.logger.log(`Sesion revocada: ${sessionId}`);
  }

  // ─────────────────────────────────────────────────────────────
  // GET ACCESS HISTORY — obtiene eventos de acceso desde Keycloak
  // ─────────────────────────────────────────────────────────────

  async getAccessHistory(userId: string): Promise<EventResponseDto[]> {
    const user = await this.userRepository.findById(userId);

    if (!user.external_id) {
      throw new InternalServerErrorException(
        this.i18n.t('auth.KEYCLOAK_ID_MISSING'),
      );
    }

    const events = await this.keycloakAdminService.getUserEvents(
      user.external_id,
    );

    return events.map(
      (e: any) =>
        new EventResponseDto({
          type: e.type,
          ipAddress: e.ipAddress,
          time: e.time,
          error: e.error ?? null,
          details: e.details ?? {},
        }),
    );
  }
}
