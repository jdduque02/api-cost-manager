import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Filtro global que captura excepciones lanzadas por Guards, Pipes y Controllers
 * y las formatea con la misma estructura que ErrorsInterceptor.
 *
 * Los Guards lanzan excepciones ANTES de que los interceptores puedan captularlas,
 * por lo que este filtro garantiza un formato de error consistente en toda la app.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const responseData = exception.getResponse();
    const timestamp = new Date().toISOString();
    const path = request.originalUrl;

    // Si el cuerpo ya fue formateado por ErrorsInterceptor, se pasa directamente
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'error' in responseData &&
      'timestamp' in responseData
    ) {
      response.status(status).json(responseData);
      return;
    }

    let error = exception.name.replace('Exception', '');
    let message = 'Error inesperado.';
    let details: unknown[] = [];

    if (typeof responseData === 'string') {
      message = responseData;
    } else if (typeof responseData === 'object' && responseData !== null) {
      const resp = responseData as { message?: string | string[]; error?: string };
      if (Array.isArray(resp.message)) {
        // Errores de validación (class-validator)
        message = 'Datos de entrada inválidos.';
        details = resp.message;
      } else {
        message = resp.message ?? message;
      }
      error = resp.error ?? error;
    }

    const body: Record<string, unknown> = {
      status,
      error,
      message,
      details,
      timestamp,
      path,
    };

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      body['trace_id'] = uuidv4();
    }

    response.status(status).json(body);
  }
}
