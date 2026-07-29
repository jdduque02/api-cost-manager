import { ConfigService } from '@nestjs/config';
import { CorsOptions } from 'cors';

export const getCorsConfig = (configService: ConfigService): CorsOptions => {
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  const isDev = configService.get<string>('NODE_ENV') === 'DEV';
  if (isDev) {
    return {
      origin: '*',
      credentials: true,
      methods,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    };
  }
  return {
    origin: configService
      .get<string>('CORS_ORIGINS')
      ?.split(',')
      .map((o) => o.trim().replace(/\/+$/, '')),
    credentials: true,
    methods,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Referer',
      'User-Agent',
      'Cookie',
      'Set-Cookie',
    ],
  };
};
