import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => IdentityModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
