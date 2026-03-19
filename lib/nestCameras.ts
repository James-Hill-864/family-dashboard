// Nest Camera integration via Google Device Access API
// Requires GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, NEST_PROJECT_ID in .env

const NEST_PROJECT_ID = process.env.NEST_PROJECT_ID
const DEVICE_ACCESS_BASE = 'https://smartdevicemanagement.googleapis.com/v1'

export interface NestCamera {
  id: string
  name: string
  displayName: string
  streamUrl?: string
  motionDetected?: boolean
  lastMotion?: string
}

export async function listCameras(accessToken: string): Promise<NestCamera[]> {
  if (!NEST_PROJECT_ID || NEST_PROJECT_ID === 'placeholder') return []
  try {
    const res = await fetch(
      `${DEVICE_ACCESS_BASE}/enterprises/${NEST_PROJECT_ID}/devices`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    interface NestDevice {
      name: string; type?: string
      traits?: Record<string, Record<string, string>>
    }
    return (data.devices || [])
      .filter((d: NestDevice) => d.type?.includes('CAMERA'))
      .map((d: NestDevice) => ({
        id: d.name,
        name: d.name.split('/').pop() || 'Camera',
        displayName: d.traits?.['sdm.devices.traits.Info']?.customName || 'Camera',
        motionDetected: false,
        lastMotion: d.traits?.['sdm.devices.traits.CameraMotion']?.lastMotionEventTime,
      }))
  } catch {
    return []
  }
}

export async function getCameraStream(cameraId: string, accessToken: string): Promise<string | null> {
  if (!NEST_PROJECT_ID || NEST_PROJECT_ID === 'placeholder') return null
  try {
    const res = await fetch(
      `${DEVICE_ACCESS_BASE}/enterprises/${NEST_PROJECT_ID}/devices/${cameraId}:executeCommand`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'sdm.devices.commands.CameraLiveStream.GenerateRtspStream', params: {} }),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.results?.streamUrls?.rtspUrl || null
  } catch {
    return null
  }
}
