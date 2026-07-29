import { ConfigService } from '@nestjs/config';
import { getCorsConfig } from '@config/cors.config';

describe('getCorsConfig', () => {
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };
  });

  it('should return permissive config for DEV environment', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'DEV';
      return null;
    });

    const config = getCorsConfig(mockConfigService as ConfigService);

    expect(config.origin).toBe('*');
    expect(config.credentials).toBe(true);
    expect(config.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    expect(config.allowedHeaders).toContain('X-CSRF-Token');
    expect(config.allowedHeaders).not.toContain('Cookie');
  });

  it('should return restricted config for PROD environment', () => {
    const origins = 'https://example.com,https://api.example.com';
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'PROD';
      if (key === 'CORS_ORIGINS') return origins;
      return null;
    });

    const config = getCorsConfig(mockConfigService as ConfigService);

    expect(config.origin).toEqual(['https://example.com', 'https://api.example.com']);
    expect(config.credentials).toBe(true);
    expect(config.allowedHeaders).toContain('Cookie');
    expect(config.allowedHeaders).toContain('Set-Cookie');
    expect(config.allowedHeaders).toContain('Authorization');
  });

  it('should handle missing CORS_ORIGINS in non-DEV environment', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'PROD';
      if (key === 'CORS_ORIGINS') return undefined;
      return null;
    });

    const config = getCorsConfig(mockConfigService as ConfigService);
    expect(config.origin).toBeUndefined();
  });
});