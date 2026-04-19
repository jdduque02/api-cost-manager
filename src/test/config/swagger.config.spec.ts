import { ConfigService } from '@nestjs/config';
import { getSwaggerConfig } from '@config/swagger.config';

describe('getSwaggerConfig', () => {
  const buildConfig = (env: Record<string, string | undefined>) => {
    const mockConfigService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;
    return getSwaggerConfig(mockConfigService);
  };

  it('debe incluir el environment en el título', () => {
    const config = buildConfig({ NODE_ENV: 'DEV', VERSION: '1' });
    expect(config.info.title).toContain('DEV');
  });

  it('debe usar "LOCAL" como entorno por defecto si NODE_ENV no está definido', () => {
    const config = buildConfig({ NODE_ENV: undefined, VERSION: '1' });
    expect(config.info.title).toContain('LOCAL');
  });

  it('debe usar "1" como versión por defecto si VERSION no está definida', () => {
    const config = buildConfig({ NODE_ENV: 'DEV', VERSION: undefined });
    expect(config.info.version).toBe('1');
  });

  it('debe incluir la versión del entorno en info.version', () => {
    const config = buildConfig({ NODE_ENV: 'PROD', VERSION: '3' });
    expect(config.info.version).toBe('3');
  });

  it('debe registrar el esquema BearerAuth', () => {
    const config = buildConfig({ NODE_ENV: 'DEV', VERSION: '1' });
    const schemes = (config as any).components?.securitySchemes;
    expect(schemes).toBeDefined();
    expect(Object.keys(schemes)).toContain('bearer');
  });

  it('debe tener tags "costs" e "identity"', () => {
    const config = buildConfig({ NODE_ENV: 'DEV', VERSION: '1' });
    const tagNames = (config.tags ?? []).map((t) => t.name);
    expect(tagNames).toContain('costs');
    expect(tagNames).toContain('identity');
  });
});
