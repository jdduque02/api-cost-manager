import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import { EmailTemplate } from '../entities/email-template.entity';
import OtpPasswordResetEmail from '../templates/otp-password-reset';

export const OTP_EMAIL_TEMPLATE_KEY = 'otp_password_reset';
export const DEFAULT_OTP_SUBJECT = 'Tu código de recuperación de contraseña';

/**
 * Servicio de correo basado en Nodemailer + plantillas react-email.
 * Si `MAIL_ENABLED=false` (o no hay host configurado), el envío se registra
 * en logs y no se hace (útil en desarrollo sin SMTP).
 * Permite personalizar la plantilla OTP desde mail.email_template (key
 * `otp_password_reset`): el HTML guardado puede usar los marcadores
 * {{otp}}, {{name}} y {{year}}.
 */
@Injectable()
export class MailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailTemplate)
    private readonly templateRepo: Repository<EmailTemplate>,
  ) {
    const enabled =
      this.configService.get<string>('MAIL_ENABLED', 'false') === 'true';
    const host = this.configService.get<string>('MAIL_HOST');
    if (!enabled || !host) {
      this.logger.warn(
        'Correo deshabilitado (MAIL_ENABLED=false o MAIL_HOST vacío). Los emails se registran en logs.',
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get<string>('MAIL_PORT', '465')),
      secure: this.configService.get<string>('MAIL_SECURE', 'true') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USER', ''),
        pass: this.configService.get<string>('MAIL_PASS', ''),
      },
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      const existing = await this.templateRepo.findOne({
        where: { key: OTP_EMAIL_TEMPLATE_KEY },
      });
      if (existing) return;
      const html = await render(
        OtpPasswordResetEmail({ name: 'usuario', otpCode: '123456' }),
      );
      await this.templateRepo.save(
        this.templateRepo.create({
          key: OTP_EMAIL_TEMPLATE_KEY,
          subject: DEFAULT_OTP_SUBJECT,
          html_body: html,
        }),
      );
      this.logger.log(
        `Plantilla por defecto "${OTP_EMAIL_TEMPLATE_KEY}" creada en mail.email_template.`,
      );
    } catch (error) {
      this.logger.error('No se pudo crear la plantilla por defecto', error as Error);
    }
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  private get from(): string {
    return (
      this.configService.get<string>('MAIL_FROM') ??
      'Cost Manager <no-reply@cost-manager.local>'
    );
  }

  /**
   * Envía el correo OTP de recuperación de contraseña. Usa la plantilla
   * personalizada (mail.email_template) si existe; si no, la react-email.
   */
  async sendOtp(to: string, code: string, name?: string): Promise<void> {
    let subject = DEFAULT_OTP_SUBJECT;
    let html: string;

    const custom = await this.templateRepo.findOne({
      where: { key: OTP_EMAIL_TEMPLATE_KEY },
    });
    if (custom) {
      const year = String(new Date().getFullYear());
      html = custom.html_body
        .replace(/{{otp}}/g, code)
        .replace(/{{name}}/g, name ?? '')
        .replace(/{{year}}/g, year);
      subject = custom.subject || subject;
    } else {
      html = await render(
        OtpPasswordResetEmail({
          name,
          otpCode: code,
        }),
      );
    }

    await this.send({ to, subject, html });
  }

  private async send(payload: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[mail][mock] Para=${payload.to} | Asunto="${payload.subject}" | Código OTP incluido en el HTML`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: `Su código de recuperación es ${payload.html.match(/\d{6}/)?.[0] ?? ''}`,
      });
      this.logger.log(`Correo enviado a ${payload.to}: "${payload.subject}"`);
    } catch (error) {
      this.logger.error(
        `Error enviando correo a ${payload.to}`,
        error as Error,
      );
      throw error;
    }
  }
}
