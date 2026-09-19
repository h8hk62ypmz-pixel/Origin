import type { CapacitorConfig } from '@capacitor/cli'

const apiHost = (process.env.VITE_API_BASE || '')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')

const config: CapacitorConfig = {
  appId: 'au.com.drivesa.instruct',
  appName: 'DriveSA Instruct',
  webDir: 'dist',
  server: {
    allowNavigation: apiHost ? [apiHost] : [],
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Drive SA Instruct',
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#1B2A24',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F3F0E8',
    },
  },
}

export default config
