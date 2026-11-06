import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.masiri.app',
  appName: 'THE APOSTLES',
  webDir: 'dist',
  server: {
    url: 'https://theapostles0.vercel.app',
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#76243A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      backgroundColor: '#76243A',
    },
    App: {
      launchAutoLoad: true,
    },
  },
};

export default config;
