/**
 * StockWise Central Application Configuration
 *
 * To change the Android APK download location, configure VITE_STOCKWISE_ANDROID_APK_URL
 * in your environment or update the fallback below.
 */

// Canonical Production StockWise Deployment URL
export const STOCKWISE_PROD_URL = 'https://stockwise-web-phi.vercel.app';

/**
 * Returns the canonical base application URL.
 * Checks VITE_APP_URL / NEXT_PUBLIC_APP_URL, preventing localhost or 127.0.0.1 from leaking into production invitation links.
 */
export function getAppBaseUrl(): string {
  const envUrl = (
    import.meta.env?.VITE_APP_URL || 
    import.meta.env?.VITE_PUBLIC_APP_URL ||
    import.meta.env?.NEXT_PUBLIC_APP_URL
  ) as string | undefined;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // If in browser on the production Vercel domain, use it directly
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (origin.includes('stockwise-web-phi.vercel.app')) {
      return 'https://stockwise-web-phi.vercel.app';
    }
  }

  return STOCKWISE_PROD_URL;
}

/**
 * Formats a canonical production staff invitation URL:
 * https://stockwise-web-phi.vercel.app/invite/<INVITATION_TOKEN>
 */
export function buildStaffInvitationUrl(token: string): string {
  const cleanToken = (token || '').trim();
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/invite/${cleanToken}`;
}

// Central configuration variable for the StockWise Android APK URL
export const STOCKWISE_ANDROID_APK_URL = 
  (import.meta.env?.VITE_STOCKWISE_ANDROID_APK_URL as string) || 
  'https://stockwise.app/downloads/stockwise.apk';

/**
 * Returns true if a real, valid APK download URL is configured (i.e. not a placeholder).
 */
export function isApkConfigured(): boolean {
  if (!STOCKWISE_ANDROID_APK_URL) return false;
  const url = STOCKWISE_ANDROID_APK_URL.trim();
  if (
    url === '' ||
    url.includes('YOUR-STOCKWISE-DOMAIN.com') ||
    url.includes('YOUR-DOMAIN.com') ||
    url.includes('example.com')
  ) {
    return false;
  }
  return true;
}

/**
 * Android App Package & Deep Link constants
 */
export const ANDROID_PACKAGE_NAME = 'com.altech.stockwise';
export const ANDROID_CUSTOM_SCHEME = 'stockwise';

export function getAndroidDeepLink(token: string): string {
  return `${ANDROID_CUSTOM_SCHEME}://invite/${token}`;
}

export function getAndroidIntentUrl(token: string): string {
  return `intent://invite/${token}#Intent;scheme=${ANDROID_CUSTOM_SCHEME};package=${ANDROID_PACKAGE_NAME};end`;
}
