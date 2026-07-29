import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USER'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_NAME'),
    entities: [__dirname + '/**/*.entity.{js,ts}'],
    autoLoadEntities: true,
    synchronize: configService.get<string>('NODE_ENV') !== 'PROD',
    migrationsRun: true,
    migrations: [__dirname + '/../../migrations/*.{js,ts}'],
    // Pool explícito: evita DeprecationWarning de pg al reutilizar
    // el mismo cliente mientras ejecuta otra query (pg@9 lo eliminará)
    extra: {
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
  }),
  inject: [ConfigService],
};
