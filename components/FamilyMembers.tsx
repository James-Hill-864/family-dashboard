'use client'
import { useState, useEffect } from 'react'

interface Member { id: string; name: string; color: string; emoji: string; role: string }
interface Props {
  onSettingsOpen?: () => void
  onFilterChange?: (memberIds: string[]) => void
}

export default function FamilyMembers({ onSettingsOpen, onFilterChange }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set())
  const [avatarTs] = useState(() => Date.now())

  useEffect(() => {
    fetch('/api/members').then(r => r.json()).then(setMembers)
  }, [])

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      onFilterChange?.(next)
      return next
    })
  }

  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        {members.map(m => {
          const isActive = activeFilters.includes(m.id)
          const hasError = avatarErrors.has(m.id)
          return (
            <div key={m.id} className="flex flex-col items-center gap-0.5">
              <button
                onClick={() => toggleFilter(m.id)}
                onDoubleClick={onSettingsOpen}
                title={`${m.name} — tap to filter calendar`}
                style={{
                  width: '52px', height: '52px', borderRadius: '50%', padding: 0,
                  border: isActive ? '3px solid #fff' : '2px solid transparent',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 0 12px rgba(255,255,255,0.4)' : '0 2px 8px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                  background: m.color + '22',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {!hasError ? (
                  <img
                    src={`/api/avatars/${m.id}?t=${avatarTs}`}
                    alt={m.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={() => setAvatarErrors(prev => { const next = new Set(prev); next.add(m.id); return next })}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-full"
                    style={{ background: m.color, fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                    {getInitial(m.name)}
                  </div>
                )}
              </button>
              <span style={{ fontSize: '9px', color: isActive ? '#fff' : 'var(--text-3)', fontWeight: isActive ? 700 : 500, maxWidth: '52px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name.split(' ')[0]}
              </span>
            </div>
          )
        })}
      </div>
      {activeFilters.length > 0 && (
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
          Showing: {members.filter(m => activeFilters.includes(m.id)).map(m => m.name.split(' ')[0]).join(', ')}
        </div>
      )}
    </div>
  )
}
