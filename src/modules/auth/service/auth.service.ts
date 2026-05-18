import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from '@auth/dto/login.dto';
import { RefreshTokenDto } from '@auth/dto/refresh-token.dto';
import { KeycloakAdminService } from '@auth/service/keycloak-admin.service';
import { IntrospectResponse } from '@auth/interfaces/IntrospectResponse.dto';
import { KeycloakTokenResponse } from '@auth/interfaces/KeycloakTokenResponse.dto';
import { UserRepository } from '@identity/repositories/app-user.repositories';



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
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: dto.username,
      password: dto.password,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<KeycloakTokenResponse>(this.tokenUrl, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      this.logger.log(`Login exitoso para: ${dto.username}`);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 400) {
        throw new UnauthorizedException('Credenciales inválidas.');
      }
      this.logger.error('[login]', error?.response?.data);
      throw new InternalServerErrorException('Error al autenticar con Keycloak.');
    }
  }
  async refresh(refreshTokenDto: RefreshTokenDto): Promise<KeycloakTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshTokenDto.refresh_token,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<KeycloakTokenResponse>(this.tokenUrl, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 400 || status === 401) {
        throw new UnauthorizedException('Sesión expirada o token inválido.');
      }
      this.logger.error('[refresh]', error?.response?.data);
      throw new InternalServerErrorException('Error al renovar la sesión.');
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
      throw new InternalServerErrorException('Error al cerrar sesión.');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // FORGOT PASSWORD — envía email de recuperación via Keycloak
  // ─────────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    // Busca el keycloak_id por email en Keycloak Admin API
    const keycloakId = await this.keycloakAdminService.findKeycloakIdByEmail(email);
    // Dispara la acción UPDATE_PASSWORD → Keycloak envía el email
    await this.keycloakAdminService.sendResetPasswordEmail(keycloakId);
    this.logger.log(`Email de recuperación enviado a: ${email}`);
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

    try {
      const response = await firstValueFrom(
        this.httpService.post<Record<string, any>>(url, body.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const data = response.data;

      if (!data.active) {
        throw new UnauthorizedException('El token ha expirado o no es válido.');
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresInSeconds = data.exp ? data.exp - now : undefined;

      const {id:userId} = await this.userRepository.findByUsername(data.preferred_username);

      return {
        active: true,
        exp: data.exp,
        iat: data.iat,
        sub: data.sub,
        username: data.preferred_username,
        email: data.email,
        realm_access: data.realm_access,
        expires_in_seconds: expiresInSeconds,
        userId: Number.parseInt(userId, 10),
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('[introspect]', error?.response?.data);
      throw new InternalServerErrorException('Error al validar el token con Keycloak.');
    }
  }
}
