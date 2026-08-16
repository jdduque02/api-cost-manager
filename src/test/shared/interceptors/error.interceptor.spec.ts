import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { ErrorsInterceptor } from '@shared/interceptors/error.interceptor';
import { LoggingService } from '@shared/services/logging.service';
import { I18nService } from 'nestjs-i18n';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'trace-xyz'),
}));

class StringResponseHttpException extends HttpException {
  constructor() {
    super('no usado', HttpStatus.BAD_REQUEST);
  }
  override getResponse(): string {
    return 'Mensaje crudo';
  }
}

describe('ErrorsInterceptor', () => {
  const buildContext = (path = '/auth/login'): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ originalUrl: path }),
      }),
    }) as unknown as ExecutionContext;

  const loggingService = {
    sendLog: jest.fn().mockResolvedValue(undefined) as jest.Mock<
      Promise<void>,
      [unknown, string, string]
    >,
  };

  const mockI18nService = {
    t: jest.fn((key: string) => `[${key}]`),
  };

  const createInterceptor = (): ErrorsInterceptor =>
    new ErrorsInterceptor(
      loggingService as unknown as LoggingService,
      mockI18nService as unknown as I18nService,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe transformar HttpException no-500 y loggear WARNING', async () => {
    const interceptor = createInterceptor();
    const context = buildContext('/auth/refresh');
    const sourceError = new HttpException(
      'Token inválido',
      HttpStatus.UNAUTHORIZED,
    );
    const next: CallHandler = { handle: () => throwError(() => sourceError) };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: {
        status: HttpStatus.UNAUTHORIZED,
        message: 'Token inválido',
        path: '/auth/refresh',
      },
      status: HttpStatus.UNAUTHORIZED,
    });

    expect(loggingService.sendLog).toHaveBeenCalledTimes(1);
    expect(loggingService.sendLog.mock.calls[0][1]).toBe('WARNING');
    expect(loggingService.sendLog.mock.calls[0][2]).toBe('ErrorsInterceptor');
  });

  it('debe transformar errores no HttpException a InternalServerErrorException con trace_id', async () => {
    const interceptor = createInterceptor();
    const context = buildContext('/user/1');
    const next: CallHandler = {
      handle: () => throwError(() => new Error('db down')),
    };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        path: '/user/1',
        trace_id: 'trace-xyz',
      },
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });

    expect(loggingService.sendLog).toHaveBeenCalledTimes(1);
    expect(loggingService.sendLog.mock.calls[0][1]).toBe('ERROR');
  });

  it('debe extraer details cuando responseData contiene details[]', async () => {
    const interceptor = createInterceptor();
    const context = buildContext('/user');
    const sourceError = new HttpException(
      { message: 'Error de validación', details: ['campo requerido'] },
      HttpStatus.BAD_REQUEST,
    );
    const next: CallHandler = { handle: () => throwError(() => sourceError) };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: {
        status: HttpStatus.BAD_REQUEST,
        details: ['campo requerido'],
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('debe usar message crudo cuando responseData es un string', async () => {
    const interceptor = createInterceptor();
    const context = buildContext('/raw');
    const next: CallHandler = {
      handle: () => throwError(() => new StringResponseHttpException()),
    };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Mensaje crudo',
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('debe conservar el mensaje por defecto cuando message no es string', async () => {
    const interceptor = createInterceptor();
    const context = buildContext('/array-message');
    const sourceError = new HttpException(
      { message: ['campo requerido'] },
      HttpStatus.BAD_REQUEST,
    );
    const next: CallHandler = { handle: () => throwError(() => sourceError) };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: {
        status: HttpStatus.BAD_REQUEST,
        message: '[shared.UNEXPECTED_SERVER]',
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('debe usar [] cuando details no es un array', async () => {
    const interceptor = createInterceptor();
    const context = buildContext('/details');
    const sourceError = new HttpException(
      { message: 'validación', details: 'oops' },
      HttpStatus.BAD_REQUEST,
    );
    const next: CallHandler = { handle: () => throwError(() => sourceError) };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: {
        status: HttpStatus.BAD_REQUEST,
        message: 'validación',
        details: [],
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('debe ignorar responseData sin message', async () => {
    const interceptor = createInterceptor();
    const context = buildContext('/no-message');
    const sourceError = new HttpException(
      { statusCode: 400, error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    const next: CallHandler = { handle: () => throwError(() => sourceError) };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: {
        status: HttpStatus.BAD_REQUEST,
        message: '[shared.UNEXPECTED_SERVER]',
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('debe tratar errores no-objeto como errores internos', async () => {
    const interceptor = createInterceptor();
    const context = buildContext('/primitive');
    const next: CallHandler = { handle: () => throwError(() => 42) };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        trace_id: 'trace-xyz',
      },
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it('debe ignorar un stack que no es string', async () => {
    const interceptor = createInterceptor();
    const context = buildContext('/bad-stack');
    const next: CallHandler = {
      handle: () => throwError(() => ({ stack: 42 })),
    };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toMatchObject({
      response: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        trace_id: 'trace-xyz',
      },
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });
});
