import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '@config/database.config';
import { IdentityModule } from '@identity/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: '.env', 
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync(databaseConfig),
    IdentityModule
  ],
})
export class AppModule {}
