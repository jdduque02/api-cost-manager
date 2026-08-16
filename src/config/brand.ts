/**
 * Brand palette — single source of truth for Cost Manager surfaces
 * (Swagger UI, logo, mail templates). Hex values match docs/service-description.md.
 */
export const BRAND_PALETTE = {
  primary: '#0F3D2E',
  accent: '#C4A35A',
  neutralLight: '#F4F1EA',
  neutralDark: '#1A1A1A',
  danger: '#B33A3A',
  white: '#FFFFFF',
  /** Body text on bone — warm muted charcoal */
  bodyMuted: '#4A4A44',
  /** Dividers / borders on bone */
  divider: '#D8D4CC',
  /** Footer / secondary text */
  footerMuted: '#7A766C',
} as const;

export type BrandPalette = typeof BRAND_PALETTE;
