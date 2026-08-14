import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EmailTemplate } from './entities/email-template.entity';
import { MailService } from './service/mail.service';
import { MailTemplateController } from './controller/mail-template.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailTemplate]),
    forwardRef(() => AuthModule),
  ],
  controllers: [MailTemplateController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
