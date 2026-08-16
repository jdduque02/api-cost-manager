import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { render } from '@react-email/render';
import { AuthGuard } from '@auth/guards/auth.guard';
import { AdminGuard } from '@auth/guards/admin.guard';
import { EmailTemplate } from '../entities/email-template.entity';
import {
  DEFAULT_OTP_SUBJECT,
  OTP_EMAIL_TEMPLATE_KEY,
} from '../service/mail.service';
import OtpPasswordResetEmail from '../templates/otp-password-reset';
import {
  EmailTemplateResponseDto,
  UpdateEmailTemplateDto,
} from '../dto/update-email-template.dto';

@ApiTags('mail')
@UseGuards(AuthGuard)
@Controller('email-templates')
export class MailTemplateController {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
  ) {}

  @Get(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Obtener plantilla de correo. Devuelve la personalizada si existe; si no, la por defecto (react.email) con is_default=true.',
  })
  @ApiParam({ name: 'key', example: OTP_EMAIL_TEMPLATE_KEY })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plantilla de correo.',
    type: EmailTemplateResponseDto,
  })
  async findOne(@Param('key') key: string) {
    const stored = await this.templateRepo.findOne({ where: { key } });
    if (stored) {
      return new EmailTemplateResponseDto({
        key: stored.key,
        subject: stored.subject,
        html_body: stored.html_body,
        updated_at: stored.updated_at,
      });
    }

    if (key === OTP_EMAIL_TEMPLATE_KEY) {
      const html = await render(OtpPasswordResetEmail({ otpCode: '123456' }));
      return {
        key,
        subject: DEFAULT_OTP_SUBJECT,
        html_body: html,
        is_default: true,
        updated_at: null,
      };
    }

    throw new NotFoundException(`Plantilla de correo "${key}" no encontrada.`);
  }

  @Put(':key')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Guardar (crear o actualizar) una plantilla de correo personalizada (admin).',
  })
  @ApiParam({ name: 'key', example: OTP_EMAIL_TEMPLATE_KEY })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plantilla guardada.',
    type: EmailTemplateResponseDto,
  })
  async upsert(@Param('key') key: string, @Body() dto: UpdateEmailTemplateDto) {
    const existing = await this.templateRepo.findOne({ where: { key } });
    if (existing) {
      existing.subject = dto.subject;
      existing.html_body = dto.html_body;
      existing.updated_at = new Date();
      await this.templateRepo.save(existing);
      return new EmailTemplateResponseDto({ ...existing, key });
    }

    const created = await this.templateRepo.save(
      this.templateRepo.create({
        key,
        subject: dto.subject,
        html_body: dto.html_body,
      }),
    );
    return new EmailTemplateResponseDto({
      key: created.key,
      subject: created.subject,
      html_body: created.html_body,
      updated_at: created.updated_at,
    });
  }
}
