'use client'
import { useState } from 'react'

export default function CameraPanel() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-xl font-semibold"
        style={{ height: '32px', padding: '0 12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', fontSize: '12px' }}>
        📷 Cameras
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="rounded-3xl p-6 w-full max-w-2xl" style={{ background: '#0a0a18', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold" style={{ fontSize: '18px' }}>Camera Feeds</h3>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-3)', fontSize: '24px', background: 'transparent' }}>×</button>
            </div>
            <div className="rounded-2xl p-6 flex flex-col items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '48px' }}>📷</div>
              <div className="text-white font-semibold" style={{ fontSize: '16px' }}>Nest Cameras</div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6 }}>
                Configure Google Device Access in Settings to enable camera feeds.<br />
                Requires NEST_PROJECT_ID, GOOGLE_OAUTH_CLIENT_ID, and GOOGLE_OAUTH_CLIENT_SECRET in .env
              </div>
              <div className="rounded-xl p-3 w-full" style={{ background: 'rgba(0,0,0,0.3)', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-3)' }}>
                <div>1. Go to console.nest.com → Device Access ($5 fee)</div>
                <div>2. Create Google Cloud project</div>
                <div>3. Enable Smart Device Management API</div>
                <div>4. Create OAuth2 credentials</div>
                <div>5. Add credentials to .env file</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
