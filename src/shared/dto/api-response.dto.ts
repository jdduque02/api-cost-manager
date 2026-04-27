/**
 * Contrato global de respuesta de la API.
 * Todas las respuestas del microservicio deben ajustarse a esta estructura.
 */
export class ApiResponseDto<T = unknown> {
  status: boolean;
  message: string;
  data: T[];
  timestamp: Date;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
  }

  /** Respuesta exitosa */
  static success<T>(data: T[], message = 'Operación exitosa'): ApiResponseDto<T> {
    return new ApiResponseDto<T>({
      status: true,
      message,
      data,
      timestamp: new Date(),
    });
  }

  /** Respuesta de error */
  static error<T = never>(message: string, data: T[] = []): ApiResponseDto<T> {
    return new ApiResponseDto<T>({
      status: false,
      message,
      data,
      timestamp: new Date(),
    });
  }
}
