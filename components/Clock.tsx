'use client'
import { useState, useEffect } from 'react'

export default function Clock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="text-right select-none flex-shrink-0">
      <div className="text-[42px] font-bold text-white tabular-nums tracking-tight leading-none">{timeStr}</div>
      <div className="text-xs text-[#5a5a80] mt-1.5 tracking-widest uppercase">{dateStr}</div>
    </div>
  )
}
