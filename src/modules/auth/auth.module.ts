import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { KeycloakAdminService } from './service/keycloak-admin.service';

@Module({
  imports: [HttpModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, KeycloakAdminService],
  exports: [AuthService, AuthGuard, KeycloakAdminService],
})
export class AuthModule {}
