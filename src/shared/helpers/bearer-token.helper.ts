import { UnauthorizedException } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';

/**
 * Extrae el Bearer token del header Authorization.
 * Lanza UnauthorizedException si el header está ausente o mal formado.
 */
export function extractBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) {
    const i18n = I18nContext.current();
    throw new UnauthorizedException(
      i18n?.t('shared.BEARER_REQUIRED') ?? 'Se requiere un Bearer token en el header Authorization.',
    );
  }
  return authorization.slice(7);
}
