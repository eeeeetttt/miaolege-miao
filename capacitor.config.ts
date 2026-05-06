import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jinhuohuo.app',
  appName: '金火伙',
  webDir: '.next/server/app',
  server: {
    androidScheme: 'https',
    hostname: 'jinhuohuo.coze.site'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff'
    }
  }
};

export default config;
