import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponseDto } from '@shared/dto/api-response.dto';

/**
 * Guard de tipo para verificar si es una respuesta API válida según ApiResponseDto
 */
function isApiResponseDto(data: unknown): data is ApiResponseDto {
  return (
    data !== null &&
    typeof data === 'object' &&
    'status' in data &&
    typeof (data as Record<string, unknown>).status === 'boolean' &&
    'message' in data &&
    typeof (data as Record<string, unknown>).message === 'string' &&
    'data' in data && Array.isArray((data as Record<string, unknown>).data) &&
    'timestamp' in data
  );
}

@Injectable()
export class ResponseInterceptor<TData = unknown>
  implements NestInterceptor<TData, ApiResponseDto<TData>>
{
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler<TData>): Observable<ApiResponseDto<TData>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data: TData): ApiResponseDto<TData> => {
        const transformedResponse = this.transformResponse(data, response);
        this.logResponse(request, response, startTime, transformedResponse);
        return transformedResponse;
      }),
      catchError((error: unknown) => {
        // En caso de error, el error.interceptor.ts se encargará (o los ExceptionFilters)
        throw error;
      }),
    );
  }

  private transformResponse(data: TData, response: Response): ApiResponseDto<any> {
    // Si ya tiene la estructura del ApiResponseDto
    if (isApiResponseDto(data)) {
      return data;
    }

    // Adaptar los datos para enviarlos como arreglo como dicta el ApiResponseDto
    const arrayData = Array.isArray(data) ? data : data ? [data] : [];
    
    // Obtener mensaje basado en el status code de HTTP
    const message = this.getSuccessMessageByStatus(response.statusCode);

    return ApiResponseDto.success(arrayData, message);
  }

  private getSuccessMessageByStatus(status: number): string {
    const statusMessages: Partial<Record<number, string>> = {
      [HttpStatus.OK]: 'Operación exitosa',
      [HttpStatus.CREATED]: 'Recurso creado exitosamente',
      [HttpStatus.ACCEPTED]: 'Solicitud aceptada',
      [HttpStatus.NO_CONTENT]: 'Operación completada sin contenido',
      [HttpStatus.PARTIAL_CONTENT]: 'Contenido parcial obtenido',
    };

    return statusMessages[status] ?? 'Operación exitosa';
  }

  private logResponse(
    request: Request,
    response: Response,
    startTime: number,
    apiResponse: ApiResponseDto<any>,
  ): void {
    const duration = Date.now() - startTime;
    const logMessage = `${request.method} ${request.url} - Status HTTP: ${response.statusCode} - ${duration}ms`;

    if (apiResponse.status) {
      this.logger.log(`${logMessage}`);
    } else {
      this.logger.warn(`${logMessage} - Error: ${apiResponse.message}`);
    }
  }
}
