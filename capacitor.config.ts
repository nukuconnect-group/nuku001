import type { CapacitorConfig } from '@capacitor/cli';

// Le live-reload pointe vers le sandbox Lovable : uniquement en développement.
// Pour un build de production (AAB/APK Play Store), NE PAS définir CAP_LIVE_RELOAD.
const liveReload = process.env.CAP_LIVE_RELOAD === '1';

const config: CapacitorConfig = {
  appId: 'app.lovable.7cbf6140856746c7888328d929a2bdd4',
  appName: 'nukuconnect',
  webDir: 'dist',
  ...(liveReload
    ? {
        server: {
          url: 'https://7cbf6140-8567-46c7-8883-28d929a2bdd4.lovableproject.com?forceHideBadge=true',
          cleartext: true,
        },
      }
    : {}),
  android: {
    allowMixedContent: true,
  },
};

export default config;
