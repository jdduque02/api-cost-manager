import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { ErrorsInterceptor } from '@shared/interceptors/error.interceptor';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'trace-xyz'),
}));

describe('ErrorsInterceptor', () => {
  const buildContext = (path = '/auth/login'): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ originalUrl: path }),
      }),
    }) as unknown as ExecutionContext;

  const loggingService = {
    sendLog: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe transformar HttpException no-500 y loggear WARNING', async () => {
    const interceptor = new ErrorsInterceptor(loggingService as any);
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
    const interceptor = new ErrorsInterceptor(loggingService as any);
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
    const interceptor = new ErrorsInterceptor(loggingService as any);
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
});
