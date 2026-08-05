import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { OwnershipGuard } from './guards/ownership.guard';
import { IpBlockGuard } from './guards/ip-block.guard';
import { KeycloakAdminService } from './service/keycloak-admin.service';
import { IdentityModule } from '@identity/identity.module';

@Module({
  imports: [HttpModule, forwardRef(() => IdentityModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    OwnershipGuard,
    IpBlockGuard,
    KeycloakAdminService,
  ],
  exports: [
    AuthService,
    AuthGuard,
    OwnershipGuard,
    IpBlockGuard,
    KeycloakAdminService,
  ],
})
export class AuthModule {}
