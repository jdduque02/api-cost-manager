import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { FinancialProfileController } from '@identity/controller/financial-profile.controller';
import { FinancialProfileService } from '@identity/service/financial-profile.service';
import { UserController } from './controller/user.controller';
import { UserService } from './service/user.service';
import { KeycloakAdminService } from './service/keycloak-admin.service';
import { AppUser } from './entities/app-user.entity';
import { FinancialProfile } from './entities/financial-profile.entity';
import { UserRepository } from './repositories/app-user.repositories';
import { FinancialProfileRepository } from './repositories/financial-profile.repositorie';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppUser, FinancialProfile]),
    HttpModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [FinancialProfileController, UserController],
  providers: [
    UserRepository,
    FinancialProfileRepository,
    FinancialProfileService,
    UserService,
    KeycloakAdminService,
  ],
  exports: [KeycloakAdminService],
})
export class IdentityModule {}
