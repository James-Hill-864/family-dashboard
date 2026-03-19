'use client'
import { useState, useEffect } from 'react'

const NIGHT_START = 22 // 10pm
const NIGHT_END = 6   // 6am

export default function NightDimmer() {
  const [dimLevel, setDimLevel] = useState(0)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('nightDimmerEnabled')
    if (stored === 'false') setEnabled(false)
  }, [])

  useEffect(() => {
    const onToggle = () => {
      const stored = localStorage.getItem('nightDimmerEnabled')
      setEnabled(stored !== 'false')
    }
    window.addEventListener('nightdimmer-toggle', onToggle)
    return () => window.removeEventListener('nightdimmer-toggle', onToggle)
  }, [])

  useEffect(() => {
    if (!enabled) { setDimLevel(0); return }
    const check = () => {
      const hour = new Date().getHours()
      if (hour >= NIGHT_START || hour < NIGHT_END) {
        setDimLevel(0.5)
      } else {
        setDimLevel(0)
      }
    }
    check()
    const iv = setInterval(check, 60_000)
    return () => clearInterval(iv)
  }, [enabled])

  if (dimLevel === 0) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: `rgba(0,0,0,${dimLevel})`,
        pointerEvents: 'none',
        transition: 'opacity 2s ease-in-out',
      }}
    />
  )
}
