import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { getHelmetConfig } from '@config/helmet.config';
import { getCorsConfig } from '@config/cors.config';
import { getSwaggerConfig } from '@config/swagger.config';

import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { getCsrfProtection } from '@config/csrf.config';

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
  
 
  
  /* app.use(getCsrfProtection(configService)); */

  const config = getSwaggerConfig(configService);

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`api/v${configService.get<string>('VERSION')}/docs`, app, documentFactory);

  // Using port from environment variable or 3000 as fallback
  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api/v${configService.get<string>('VERSION')}`);
  console.log(`Swagger Docs available at: http://localhost:${port}/api/v${configService.get<string>('VERSION')}/docs`);
}
bootstrap();
