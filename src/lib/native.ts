import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function apiBase(): string {
  const base = import.meta.env.VITE_API_BASE as string | undefined
  return (base || '').replace(/\/$/, '')
}

/** Prefix API paths when the iOS app is talking to a deployed Netlify backend. */
export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path
  const base = apiBase()
  return base ? `${base}${path}` : path
}

export async function initNativeShell() {
  if (!isNativeApp()) return
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await SplashScreen.hide()
  } catch {
    /* plugins may be unavailable in browser */
  }
}

export async function pickLicencePhoto(): Promise<{
  fileName: string
  contentType: string
  dataUrl: string
} | null> {
  if (!isNativeApp()) return null

  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
    promptLabelHeader: 'Attach licence',
    promptLabelPhoto: 'Photo library',
    promptLabelPicture: 'Take photo',
  })

  if (!photo.dataUrl) return null

  const contentType = photo.format === 'png' ? 'image/png' : 'image/jpeg'
  const ext = photo.format === 'png' ? 'png' : 'jpg'
  return {
    fileName: `licence-${Date.now()}.${ext}`,
    contentType,
    dataUrl: photo.dataUrl,
  }
}
