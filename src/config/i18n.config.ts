import { join } from 'path';
import { I18nOptions } from 'nestjs-i18n';
import { HeaderResolver, AcceptLanguageResolver } from 'nestjs-i18n';

export const getI18nConfig = (): I18nOptions => ({
  fallbackLanguage: 'es',
  resolvers: [
    new HeaderResolver(['x-lang', 'X-Language']),
    new AcceptLanguageResolver(),
  ],
  loaderOptions: {
    path: join(__dirname, '..', 'i18n'),
    watch: true,
  },
});
