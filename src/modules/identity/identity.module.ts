import { Module } from '@nestjs/common';
import { IdentityController } from '@identity/controller/identity.controller';
import { IdentityService } from '@identity/service/identity.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}
