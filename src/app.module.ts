import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { databaseConfig } from '@config/database.config';
import { IdentityModule } from '@identity/identity.module';
import { SharedModule } from '@shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { ResponseInterceptor } from '@shared/interceptors/response.interceptor';
import { ErrorsInterceptor } from '@shared/interceptors/error.interceptor';
import { HttpExceptionFilter } from '@shared/filters/http-exception.filter';

// Keycloak y Cache (Redis)
import { KeycloakConnectModule } from 'nest-keycloak-connect';
import { getKeycloakConfig } from '@config/keycloak.config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisConfig } from '@config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: '.env', 
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync(databaseConfig),
    SharedModule,
    IdentityModule,
    AuthModule,
    KeycloakConnectModule.registerAsync({
      useFactory: getKeycloakConfig,
      inject: [ConfigService],
    }),
    CacheModule.registerAsync(redisConfig),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorsInterceptor,
    },
  ],
})
export class AppModule {}
