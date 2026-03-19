export default function InstallPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080b12', color: '#fff', padding: '24px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 80, height: 80, background: '#1e3a8a', borderRadius: 20, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700 }}>HF</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Install Hill Family Dashboard</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Add to your home screen for the best experience — full screen, no browser chrome.</p>
        </div>

        {/* iPhone Instructions */}
        <div style={{ background: '#0f1729', border: '1px solid #1e293b', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🍎</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>iPhone / iPad</h2>
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 14, lineHeight: 2 }}>
            <li>Open this page in <strong style={{ color: '#fff' }}>Safari</strong> (not Chrome)</li>
            <li>Tap the <strong style={{ color: '#fff' }}>Share button</strong> <span style={{ fontSize: 16 }}>⬆️</span> at the bottom of the screen</li>
            <li>Scroll down and tap <strong style={{ color: '#fff' }}>&ldquo;Add to Home Screen&rdquo;</strong></li>
            <li>Tap <strong style={{ color: '#fff' }}>&ldquo;Add&rdquo;</strong> in the top right corner</li>
            <li>Open the <strong style={{ color: '#fff' }}>Hill Family</strong> app from your home screen</li>
          </ol>
        </div>

        {/* Android Instructions */}
        <div style={{ background: '#0f1729', border: '1px solid #1e293b', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🤖</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Android</h2>
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 14, lineHeight: 2 }}>
            <li>Open this page in <strong style={{ color: '#fff' }}>Chrome</strong></li>
            <li>Tap the <strong style={{ color: '#fff' }}>three-dot menu</strong> ⋮ in the top right</li>
            <li>Tap <strong style={{ color: '#fff' }}>&ldquo;Add to Home screen&rdquo;</strong></li>
            <li>Tap <strong style={{ color: '#fff' }}>&ldquo;Add&rdquo;</strong> on the prompt</li>
            <li>Open the <strong style={{ color: '#fff' }}>Hill Family</strong> app from your home screen</li>
          </ol>
        </div>

        {/* Access URL */}
        <div style={{ background: '#0f1729', border: '1px solid #1e293b', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dashboard URL (home WiFi only)</div>
          <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', fontSize: 14, color: '#60a5fa' }}>
            http://192.168.86.44:3000/mobile
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, color: '#4b5563', fontSize: 12 }}>
          The dashboard works on your home WiFi network.
        </div>
      </div>
    </div>
  )
}
