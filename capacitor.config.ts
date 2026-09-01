import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mycrew.pickler',
  appName: 'Pickler',
  webDir: 'dist',
  backgroundColor: '#000000',
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#000000',
  },
};

export default config;
