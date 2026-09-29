import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.altech.stockwise',
  appName: 'ALTECH StockWise',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#0B1220'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: '#0B1220',
      androidScaleType: 'CENTER',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#0B1220'
    }
  }
};

export default config;
