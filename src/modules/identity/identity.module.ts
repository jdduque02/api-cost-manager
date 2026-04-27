import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { FinancialProfileController } from '@identity/controller/financial-profile.controller';
import { FinancialProfileService } from '@identity/service/financial-profile.service';
import { UserController } from './controller/user.controller';
import { UserService } from './service/user.service';
import { AppUser } from './entities/app-user.entity';
import { FinancialProfile } from './entities/financial-profile.entity';
import { UserRepository } from './repositories/app-user.repositories';
import { FinancialProfileRepository } from './repositories/financial-profile.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppUser, FinancialProfile]),
    HttpModule,
    AuthModule,
  ],
  controllers: [FinancialProfileController, UserController],
  providers: [
    UserRepository,
    FinancialProfileRepository,
    FinancialProfileService,
    UserService,
  ],
})
export class IdentityModule {}
