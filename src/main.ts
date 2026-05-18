import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { getHelmetConfig } from '@config/helmet.config';
import { getCorsConfig } from '@config/cors.config';
import { getSwaggerConfig } from '@config/swagger.config';
import { ValidationPipe } from '@nestjs/common';

import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { getRabbitMQConfig } from '@config/rabbitmq.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Registrar adaptador Socket.io
  app.useWebSocketAdapter(new IoAdapter(app));

  app.connectMicroservice(getRabbitMQConfig(configService));

  // Pipe global de validación: aplica class-validator en todos los DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // --- Security setup ---
  // Helmet helps protect your app from some well-known web vulnerabilities by setting HTTP headers appropriately
  app.use(helmet(getHelmetConfig()));
  app.enableCors(getCorsConfig(configService));
  // CSRF protection using double submit cookie pattern
  // Needs cookie-parser to read the cookies
  const cookieSecret = configService.get<string>('COOKIE_SECRET');
  if (!cookieSecret) throw new Error('COOKIE_SECRET env var no está definida.');
  app.use(cookieParser(cookieSecret));

  // Global Prefix for all routes (e.g., /api/v1)
  const apiVersion = configService.get<string>('VERSION') ?? '1';
  const globalPrefix = `api/v${apiVersion}`;
  app.setGlobalPrefix(globalPrefix);

  const config = getSwaggerConfig(configService);

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`api/v${configService.get<string>('VERSION')}/docs`, app, documentFactory);

  // Using port from environment variable or 3000 as fallback
  const port = configService.get<number>('PORT') ?? 3000;
  await app.startAllMicroservices();
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api/v${configService.get<string>('VERSION')}`);
  console.log(`Swagger Docs available at: http://localhost:${port}/api/v${configService.get<string>('VERSION')}/docs`);
  console.log('RabbitMQ transport connected and listening for messages.');
}
bootstrap();
