import { Module, forwardRef } from '@nestjs/common';
import { NotificationGateway } from './gateway/notification.gateway';
import { NotificationService } from './service/notification.service';
import { AuthModule } from '@auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
