import { readJson, writeJson } from '../lib/storage';
import { loadAdminToken, persistAdminToken } from './adminAuth';
import type { SupportedLocale } from '../i18n';

// Admin dashboard is dark-mode only.
export type Theme = 'dark';

export type AdminUiPrefs = {
  apiBaseUrl: string;
  theme: Theme;
  rememberAdminToken: boolean;
  sidebarCollapsed: boolean;
  locale: SupportedLocale;
};

const STORAGE_KEY_V1 = 'mcp-nexus.adminUiPrefs.v1';
const STORAGE_KEY_V2 = 'mcp-nexus.adminUiPrefs.v2';

export function loadPrefs(defaults: Partial<AdminUiPrefs> = {}): AdminUiPrefs {
  const savedV2 = readJson<Partial<AdminUiPrefs>>(STORAGE_KEY_V2) ?? null;
  const savedV1 = savedV2 ? null : (readJson<any>(STORAGE_KEY_V1) ?? null);

  const apiBaseUrl =
    typeof savedV2?.apiBaseUrl === 'string'
      ? savedV2.apiBaseUrl
      : typeof savedV1?.apiBaseUrl === 'string'
        ? savedV1.apiBaseUrl
        : typeof defaults.apiBaseUrl === 'string'
          ? defaults.apiBaseUrl
          : '';

  // Ignore stored theme preferences (including legacy `theme: "light"`).
  const theme: Theme = 'dark';

  const rememberAdminToken =
    typeof savedV2?.rememberAdminToken === 'boolean'
      ? savedV2.rememberAdminToken
      : typeof defaults.rememberAdminToken === 'boolean'
        ? defaults.rememberAdminToken
        : false;

  const sidebarCollapsed =
    typeof savedV2?.sidebarCollapsed === 'boolean'
      ? savedV2.sidebarCollapsed
      : typeof defaults.sidebarCollapsed === 'boolean'
        ? defaults.sidebarCollapsed
        : false;

  const locale: SupportedLocale =
    savedV2?.locale === 'en' || savedV2?.locale === 'zh-CN'
      ? savedV2.locale
      : defaults.locale === 'en' || defaults.locale === 'zh-CN'
        ? defaults.locale
        : inferLocale();

  const legacyAdminToken = typeof savedV1?.adminToken === 'string' ? savedV1.adminToken : '';
  if (legacyAdminToken.trim() && !loadAdminToken().trim()) {
    persistAdminToken(legacyAdminToken, true);
  }

  return { apiBaseUrl, theme, rememberAdminToken, sidebarCollapsed, locale };
}

export function savePrefs(next: AdminUiPrefs): void {
  writeJson(STORAGE_KEY_V2, next);
}

function inferLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('mcp-nexus.locale');
  if (stored === 'zh-CN') return 'zh-CN';
  if (stored === 'en') return 'en';
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  if (browserLang.startsWith('zh')) return 'zh-CN';
  return 'en';
}
