'use client'
import { useRef, useEffect, useState } from 'react'

interface Props {
  activeIndex: number
  children: React.ReactNode[]
}

export default function AnimatedTabs({ activeIndex, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasTransitioned, setHasTransitioned] = useState(false)

  // After first render, enable transitions
  useEffect(() => {
    requestAnimationFrame(() => setHasTransitioned(true))
  }, [])

  const count = children.length
  const offset = -(activeIndex * (100 / count))

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          width: `${count * 100}%`,
          height: '100%',
          transform: `translateX(${offset}%)`,
          transition: hasTransitioned ? 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          willChange: 'transform',
        }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            style={{
              width: `${100 / count}%`,
              height: '100%',
              flexShrink: 0,
              overflow: 'hidden',
              visibility: Math.abs(i - activeIndex) <= 1 ? 'visible' : 'hidden',
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
