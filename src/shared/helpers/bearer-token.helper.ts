import { UnauthorizedException } from '@nestjs/common';

/**
 * Extrae el Bearer token del header Authorization.
 * Lanza UnauthorizedException si el header está ausente o mal formado.
 */
export function extractBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthorizedException(
      'Se requiere un Bearer token en el header Authorization.',
    );
  }
  return authorization.slice(7);
}
