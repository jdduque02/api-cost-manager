import { getI18nConfig } from '@config/i18n.config';

describe('getI18nConfig', () => {
  it('retorna la configuración de i18n', () => {
    const config = getI18nConfig();
    expect(config.fallbackLanguage).toBe('es');
    expect(config.resolvers).toHaveLength(2);
    expect(config.loaderOptions).toMatchObject({ watch: true });
  });
});
