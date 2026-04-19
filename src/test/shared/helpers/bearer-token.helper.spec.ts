import { UnauthorizedException } from '@nestjs/common';
import { extractBearerToken } from '@shared/helpers/bearer-token.helper';

describe('extractBearerToken', () => {
  it('should extract the token from a valid Bearer string', () => {
    const authHeader = 'Bearer my-secret-token';
    const result = extractBearerToken(authHeader);
    expect(result).toBe('my-secret-token');
  });

  it('should throw UnauthorizedException if header is undefined', () => {
    expect(() => extractBearerToken(undefined)).toThrow(UnauthorizedException);
    expect(() => extractBearerToken(undefined)).toThrow('Se requiere un Bearer token en el header Authorization.');
  });

  it('should throw UnauthorizedException if header does not start with Bearer', () => {
    const authHeader = 'Basic dXNlcjpwYXNz';
    expect(() => extractBearerToken(authHeader)).toThrow(UnauthorizedException);
  });

  it('should return an empty string if header is just "Bearer "', () => {
    const authHeader = 'Bearer ';
    // The helper only checks startsWith('Bearer ') and then slices.
    const result = extractBearerToken(authHeader);
    expect(result).toBe('');
  });
});