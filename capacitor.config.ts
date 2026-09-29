import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.altech.stockwise',
  appName: 'ALTECH StockWise',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#0B0B0B'
  }
};

export default config;
