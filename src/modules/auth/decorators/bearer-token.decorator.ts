import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { extractBearerToken } from '@shared/helpers/bearer-token.helper';

/**
 * Extrae y valida el Bearer token del header Authorization.
 * No es registrado por Swagger como parámetro; se documenta mediante @ApiBearerAuth().
 */
export const BearerToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return extractBearerToken(request.headers['authorization']);
  },
);
