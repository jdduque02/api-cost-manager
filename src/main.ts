import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { getHelmetConfig } from '@config/helmet.config';
import { getCorsConfig } from '@config/cors.config';
import { getSwaggerConfig } from '@config/swagger.config';
import {
  getSwaggerCustomCss,
  getSwaggerCustomJs,
} from '@config/swagger-ui.config';
import { I18nValidationPipe, I18nValidationExceptionFilter } from 'nestjs-i18n';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { getRabbitMQConfig } from '@config/rabbitmq.config';
/* import { getCsrfProtection } from '@config/csrf.config'; */

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Registrar adaptador Socket.io
  app.useWebSocketAdapter(new IoAdapter(app));

  app.connectMicroservice(getRabbitMQConfig(configService));

  // Pipe global de validación con i18n: traduce mensajes de class-validator automáticamente
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filtro global de errores de validación i18n
  app.useGlobalFilters(new I18nValidationExceptionFilter());

  // --- Security setup ---
  // Helmet helps protect your app from some well-known web vulnerabilities by setting HTTP headers appropriately
  app.use(helmet(getHelmetConfig()));
  app.enableCors(getCorsConfig(configService));
  // CSRF protection using double submit cookie pattern
  // Needs cookie-parser to read the cookies
  const cookieSecret = configService.get<string>('COOKIE_SECRET');
  if (!cookieSecret) throw new Error('COOKIE_SECRET env var no está definida.');
  app.use(cookieParser(cookieSecret));
  // CSRF protection (double-submit cookie). Requires cookie-parser (above).
  // The client must echo the `x-csrf-token` cookie back in the `x-csrf-token`
  // header on state-changing requests (POST/PUT/PATCH/DELETE).
  // app.use(getCsrfProtection(configService));

  // Global Prefix for all routes (e.g., /api/v1)
  const apiVersion = configService.get<string>('VERSION') ?? '1';
  const globalPrefix = `api/v${apiVersion}`;
  app.setGlobalPrefix(globalPrefix);

  // --- Swagger ---
  const config = getSwaggerConfig(configService);
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  const logoCandidates = [
    join(__dirname, '..', 'public', 'logo.svg'),
    join(__dirname, '..', '..', 'public', 'logo.svg'),
  ];
  const logoPath = logoCandidates.find((p) => existsSync(p));
  if (!logoPath) throw new Error('logo.svg not found');
  const logoBase64 = readFileSync(logoPath).toString('base64');

  const swaggerVersion = configService.get<string>('VERSION') ?? '1';
  SwaggerModule.setup(`api/v${swaggerVersion}/docs`, app, documentFactory, {
    customCss: getSwaggerCustomCss(),
    customJs: getSwaggerCustomJs(logoBase64),
    customSiteTitle: 'Cost Manager API Docs',
    customfavIcon: `data:image/svg+xml;base64,${logoBase64}`,
    jsonDocumentUrl: `api/v${swaggerVersion}/docs-json`,
    yamlDocumentUrl: `api/v${swaggerVersion}/docs-yaml`,
  });

  // Using port from environment variable or 3000 as fallback
  const port = configService.get<number>('PORT') ?? 3000;
  await app.startAllMicroservices();
  await app.listen(port);
  console.log(
    `Application is running on: http://localhost:${port}/api/v${swaggerVersion}`,
  );
  console.log(
    `Swagger Docs available at: http://localhost:${port}/api/v${swaggerVersion}/docs`,
  );
  console.log('RabbitMQ transport connected and listening for messages.');
}
bootstrap();
