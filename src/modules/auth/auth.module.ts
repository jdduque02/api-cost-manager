import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { IntrospectGuard } from './guards/auth.guard';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    HttpModule,
    IdentityModule, // provee KeycloakAdminService (exportado)
  ],
  controllers: [AuthController],
  providers: [AuthService, IntrospectGuard],
  exports: [AuthService, IntrospectGuard],
})
export class AuthModule {}
