import { ExecutionContext } from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';
import { ResponseInterceptor } from '@shared/interceptors/response.interceptor';

describe('ResponseInterceptor', () => {
  const buildContext = (statusCode = 200): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/users' }),
        getResponse: () => ({ statusCode }),
      }),
    }) as unknown as ExecutionContext;

  it('debe transformar objeto plano a ApiResponseDto con data como array', async () => {
    const interceptor = new ResponseInterceptor();
    const context = buildContext(200);
    const next = { handle: () => of({ id: 1, username: 'juan' }) };

    const result = await firstValueFrom(interceptor.intercept(context, next as any));

    expect(result.status).toBe(true);
    expect(result.message).toBe('Operación exitosa');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data[0]).toEqual({ id: 1, username: 'juan' });
    expect(result.timestamp).toBeDefined();
  });

  it('debe mantener la respuesta si ya tiene formato ApiResponseDto', async () => {
    const interceptor = new ResponseInterceptor();
    const context = buildContext(200);
    const dto = {
      status: true,
      message: 'Ya formateado',
      data: [{ ok: true }],
      timestamp: new Date(),
    };
    const next = { handle: () => of(dto) };

    const result = await firstValueFrom(interceptor.intercept(context, next as any));
    expect(result).toBe(dto);
  });

  it('debe mapear null a data vacío', async () => {
    const interceptor = new ResponseInterceptor();
    const context = buildContext(204);
    const next = { handle: () => of(null) };

    const result = await firstValueFrom(interceptor.intercept(context, next as any));

    expect(result.status).toBe(true);
    expect(result.message).toBe('Operación completada sin contenido');
    expect(result.data).toEqual([]);
  });

  it('debe propagar errores sin transformarlos', async () => {
    const interceptor = new ResponseInterceptor();
    const context = buildContext(200);
    const next = { handle: () => throwError(() => new Error('boom')) };

    await expect(firstValueFrom(interceptor.intercept(context, next as any))).rejects.toThrow('boom');
  });
});
