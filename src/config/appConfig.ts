/**
 * StockWise Central Application Configuration
 *
 * To change the Android APK download location, configure VITE_STOCKWISE_ANDROID_APK_URL
 * in your environment or update the fallback below.
 */

// Central configuration variable for the StockWise Android APK URL
export const STOCKWISE_ANDROID_APK_URL = 
  (import.meta.env?.VITE_STOCKWISE_ANDROID_APK_URL as string) || 
  'https://YOUR-STOCKWISE-DOMAIN.com/downloads/stockwise.apk';

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
