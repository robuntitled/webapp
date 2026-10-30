/**
 * Compat: re-export dal source of truth `@/lib/brand`.
 * Preferire `import { BRAND_NAME, SITE_URL } from '@/lib/brand'`.
 */
export {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_SLOGAN,
  BRAND_HOME_SUBTITLE,
  BRAND_DESCRIPTION,
  SITE_URL,
  getSiteUrl,
  brandEmailFrom,
  BRAND_TODO,
  BRAND_ASSETS,
  BRAND_COLORS,
  ROUTES,
} from './index';
