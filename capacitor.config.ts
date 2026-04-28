import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7cbf6140856746c7888328d929a2bdd4',
  appName: 'nukuconnect',
  webDir: 'dist',
  server: {
    url: 'https://7cbf6140-8567-46c7-8883-28d929a2bdd4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
