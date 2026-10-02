import { Capacitor } from '@capacitor/core';

export type DeviceType = 'android' | 'ios' | 'desktop';

/**
 * Detects whether the current device is Android, iOS (iPhone/iPad/iPod), or Desktop.
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }

  // 1. If running inside Capacitor native Android app
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return 'android';
  }

  // 2. If running inside Capacitor native iOS app
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    return 'ios';
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const uaLower = userAgent.toLowerCase();

  // Detect Android
  if (/android/.test(uaLower)) {
    return 'android';
  }

  // Detect iOS (iPhone, iPad, iPod)
  // iPad on iOS 13+ can report as MacIntel with touch points
  const isIOSPlatform = /iphone|ipad|ipod/.test(uaLower) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOSPlatform) {
    return 'ios';
  }

  return 'desktop';
}

/**
 * Checks if the current client is running inside a Capacitor native app.
 */
export function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

/**
 * Checks if the current browser is running in standalone PWA mode (added to home screen).
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Helper to check specifically if the user is on Android.
 */
export function isAndroidUser(): boolean {
  return detectDeviceType() === 'android';
}

/**
 * Helper to check specifically if the user is on iPhone / iPad.
 */
export function isIOSUser(): boolean {
  return detectDeviceType() === 'ios';
}
