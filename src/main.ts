import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { getHelmetConfig } from '@config/helmet.config';
import { getCorsConfig } from '@config/cors.config';
import { getSwaggerConfig } from '@config/swagger.config';

import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // --- Security setup ---
  // Helmet helps protect your app from some well-known web vulnerabilities by setting HTTP headers appropriately
  app.use(helmet(getHelmetConfig()));
  app.enableCors(getCorsConfig(configService));
  // CSRF protection using double submit cookie pattern
  // Needs cookie-parser to read the cookies
  app.use(cookieParser(configService.get<string>('COOKIE_SECRET') || 'my-super-secret'));
  
  const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => configService.get<string>('CSRF_SECRET') || 'csrf-super-secret',
    cookieName: 'x-csrf-token',
    cookieOptions: {
      sameSite: 'lax',
      secure: configService.get<string>('NODE_ENV') === 'production',
    },
    // In csrf-csrf v4, getSessionIdentifier is required. If not using express-session, we can return a random string or the csrf token cookie itself.
    // Or we simply return a default string for stateless APIs.
    getSessionIdentifier: (req) => req?.cookies?.['x-csrf-token'] || 'stateless-session',
    // Define which methods are ignored from CSRF protection
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  });
  
  app.use(doubleCsrfProtection);

  // --- Swagger/OpenAPI setup ---
  const config = getSwaggerConfig(configService);

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`api/v${configService.get<string>('VERSION')}/docs`, app, documentFactory);

  // Using port from environment variable or 3000 as fallback
  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger Docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
