import { Module } from '@nestjs/common';
import { FinancialProfileController } from '@identity/controller/financial-profile.controller';
import { FinancialProfileService } from '@identity/service/financial-profile.service';
import { UserController } from './controller/user.controller';
import { UserService } from './service/user.service';

@Module({
  controllers: [FinancialProfileController, UserController],
  providers: [FinancialProfileService, UserService],
})
export class IdentityModule {}
