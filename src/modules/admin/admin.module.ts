import { Module } from '@nestjs/common';
import { AuthModule } from '@auth/auth.module';
import { AdminLogController } from '@admin/controller/admin-log.controller';
import { AdminLogService } from '@admin/service/admin-log.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminLogController],
  providers: [AdminLogService],
  exports: [AdminLogService],
})
export class AdminModule {}
