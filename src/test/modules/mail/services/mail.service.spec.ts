import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { EmailTemplate } from '@mail/entities/email-template.entity';
import {
  DEFAULT_OTP_SUBJECT,
  MailService,
  OTP_EMAIL_TEMPLATE_KEY,
} from '@mail/service/mail.service';

type TemplateProps = {
  name?: string;
  otpCode?: string;
  year?: string;
};

jest.mock('@react-email/render', () => ({
  render: jest.fn(),
}));

jest.mock('@mail/templates/otp-password-reset', () => ({
  __esModule: true,
  default: (props: TemplateProps) => props,
}));

const mockRender = render as jest.MockedFunction<
  (element: TemplateProps) => Promise<string>
>;

type MockTemplateRepo = {
  findOne: jest.Mock<any, any>;
  save: jest.Mock<any, any>;
  create: jest.Mock<any, any>;
};

type SendPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const mockTemplate = (html: string): EmailTemplate =>
  ({
    key: OTP_EMAIL_TEMPLATE_KEY,
    subject: DEFAULT_OTP_SUBJECT,
    html_body: html,
  }) as unknown as EmailTemplate;

describe('MailService', () => {
  let service: MailService;
  let templateRepo: MockTemplateRepo;

  const configMock = {
    get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    templateRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity: EmailTemplate) => Promise.resolve(entity)),
      create: jest.fn((entity: Partial<EmailTemplate>) => entity),
    };

    mockRender.mockImplementation((props: TemplateProps) =>
      Promise.resolve(
        `<html>OTP=${props.otpCode ?? ''}|NAME=${props.name ?? ''}|YEAR=${props.year ?? ''}</html>`,
      ),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: configMock },
        { provide: getRepositoryToken(EmailTemplate), useValue: templateRepo },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  describe('onApplicationBootstrap', () => {
    it('crea la plantilla por defecto con marcadores cuando no existe', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await service.onApplicationBootstrap();

      expect(mockRender).toHaveBeenCalledWith({
        name: '{{name}}',
        otpCode: '{{otp}}',
        year: '{{year}}',
      });
      const savedCall = (templateRepo.save.mock.calls[0] as EmailTemplate[])[0];
      expect(savedCall.html_body).toContain('{{otp}}');
      expect(savedCall.html_body).toContain('{{name}}');
      expect(savedCall.html_body).toContain('{{year}}');
    });

    it('repara una plantilla previa sin marcador {{otp}}', async () => {
      templateRepo.findOne.mockResolvedValue(
        mockTemplate('<html>codigo 123456</html>'),
      );

      await service.onApplicationBootstrap();

      const savedCall = (templateRepo.save.mock.calls[0] as EmailTemplate[])[0];
      expect(savedCall.html_body).toContain('{{otp}}');
    });

    it('no sobrescribe una plantilla que ya tiene el marcador {{otp}}', async () => {
      templateRepo.findOne.mockResolvedValue(
        mockTemplate('<html>{{otp}}</html>'),
      );

      await service.onApplicationBootstrap();

      expect(templateRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('sendOtp', () => {
    it('sustituye los marcadores de la plantilla personalizada por el código real', async () => {
      templateRepo.findOne.mockResolvedValue(
        mockTemplate('<html>otp={{otp}}|name={{name}}|year={{year}}</html>'),
      );
      const sendSpy = jest
        .spyOn(
          service as unknown as { send: (p: SendPayload) => Promise<void> },
          'send',
        )
        .mockResolvedValue(undefined);

      await service.sendOtp('user@test.com', '482913', 'juan');

      expect(mockRender).not.toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalledWith({
        to: 'user@test.com',
        subject: DEFAULT_OTP_SUBJECT,
        html: '<html>otp=482913|name=juan|year=2026</html>',
        text: 'Su código de recuperación es 482913',
      });
    });

    it('usa la react-email con el código real cuando la plantilla no tiene {{otp}}', async () => {
      templateRepo.findOne.mockResolvedValue(
        mockTemplate('<html>codigo fijo 123456</html>'),
      );
      const sendSpy = jest
        .spyOn(
          service as unknown as { send: (p: SendPayload) => Promise<void> },
          'send',
        )
        .mockResolvedValue(undefined);

      await service.sendOtp('user@test.com', '135790', 'maria');

      expect(mockRender).toHaveBeenCalledWith({
        name: 'maria',
        otpCode: '135790',
        year: '2026',
      });
      expect(sendSpy).toHaveBeenCalledWith({
        to: 'user@test.com',
        subject: DEFAULT_OTP_SUBJECT,
        html: '<html>OTP=135790|NAME=maria|YEAR=2026</html>',
        text: 'Su código de recuperación es 135790',
      });
    });

    it('usa la react-email con el código real cuando no hay plantilla personalizada', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      const sendSpy = jest
        .spyOn(
          service as unknown as { send: (p: SendPayload) => Promise<void> },
          'send',
        )
        .mockResolvedValue(undefined);

      await service.sendOtp('user@test.com', '246801');

      expect(mockRender).toHaveBeenCalledWith({
        name: undefined,
        otpCode: '246801',
        year: '2026',
      });
      expect(sendSpy).toHaveBeenCalledWith({
        to: 'user@test.com',
        subject: DEFAULT_OTP_SUBJECT,
        html: '<html>OTP=246801|NAME=|YEAR=2026</html>',
        text: 'Su código de recuperación es 246801',
      });
    });
  });
});
