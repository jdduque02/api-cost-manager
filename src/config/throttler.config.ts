import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

export const getThrottlerConfig = (configService: ConfigService): ThrottlerModuleOptions => {
  const isProd = configService.get<string>('NODE_ENV') === 'PROD';

  return {
    throttlers: [
      {
        name: 'global',
        ttl: configService.get<number>('THROTTLE_TTL_MS', 60_000),
        limit: configService.get<number>('THROTTLE_LIMIT', isProd ? 60 : 120),
      },
      {
        name: 'auth',
        ttl: configService.get<number>('THROTTLE_AUTH_TTL_MS', 60_000),
        limit: configService.get<number>('THROTTLE_AUTH_LIMIT', isProd ? 5 : 10),
      },
    ],
    storage: undefined,
    errorMessage: (context) => {
      const req = context.switchToHttp().getRequest();
      const path = req?.url ?? '';
      if (path.includes('/auth/login')) {
        return 'Demasiados intentos de inicio de sesión. Intente de nuevo más tarde.';
      }
      if (path.includes('/auth/forgot-password')) {
        return 'Demasiadas solicitudes de recuperación de contraseña.';
      }
      return 'Demasiadas solicitudes. Intente de nuevo más tarde.';
    },
  };
};
