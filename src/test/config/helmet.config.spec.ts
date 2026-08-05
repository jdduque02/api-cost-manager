import { getHelmetConfig } from '@config/helmet.config';

describe('getHelmetConfig', () => {
  it('debe retornar un objeto de configuración definido', () => {
    const config = getHelmetConfig();
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('debe tener crossOriginResourcePolicy con policy "cross-origin"', () => {
    const config = getHelmetConfig() as any;
    expect(config.crossOriginResourcePolicy).toEqual({
      policy: 'cross-origin',
    });
  });

  it('debe configurar contentSecurityPolicy con directivas básicas', () => {
    const config = getHelmetConfig() as any;
    const directives = config.contentSecurityPolicy.directives;
    expect(directives.defaultSrc).toContain("'self'");
    expect(directives.scriptSrc).toContain("'self'");
    expect(directives.styleSrc).toContain("'self'");
    expect(directives.imgSrc).toContain("'self'");
  });

  it('debe deshabilitar frameguard (X-Frame-Options: DENY)', () => {
    const config = getHelmetConfig() as any;
    expect(config.frameguard).toEqual({ action: 'deny' });
  });

  it('debe activar hidePoweredBy', () => {
    const config = getHelmetConfig() as any;
    expect(config.hidePoweredBy).toBe(true);
  });

  it('debe configurar HSTS con maxAge de 2 años', () => {
    const config = getHelmetConfig() as any;
    expect(config.hsts.maxAge).toBe(63072000);
    expect(config.hsts.includeSubDomains).toBe(true);
    expect(config.hsts.preload).toBe(true);
  });

  it('debe desactivar dns prefetch', () => {
    const config = getHelmetConfig() as any;
    expect(config.dnsPrefetchControl).toEqual({ allow: false });
  });

  it('debe activar noSniff y xssFilter', () => {
    const config = getHelmetConfig() as any;
    expect(config.noSniff).toBe(true);
    expect(config.xssFilter).toBe(true);
  });

  it('debe configurar referrerPolicy como strict-origin-when-cross-origin', () => {
    const config = getHelmetConfig() as any;
    expect(config.referrerPolicy).toEqual({
      policy: 'strict-origin-when-cross-origin',
    });
  });
});
