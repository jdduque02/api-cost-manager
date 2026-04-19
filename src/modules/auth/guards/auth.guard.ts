import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '@auth/service/auth.service';
import { extractBearerToken } from '@shared/helpers/bearer-token.helper';

@Injectable()
export class IntrospectGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers['authorization'];

    const token = extractBearerToken(authorization);
    const result = await this.authService.introspect(token);

    if (!result.active) {
      throw new UnauthorizedException('El token ha expirado o fue revocado.');
    }

    // Adjunta el payload del token al request para uso posterior
    (request as Request & { user: typeof result }).user = result;

    return true;
  }
}
