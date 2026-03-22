'use client'
import { useState, useCallback } from 'react'

type RightTab = 'today' | 'meals' | 'smarthome' | 'cameras'

interface LayoutPrefs {
  tabOrder: RightTab[]
}

const DEFAULT_ORDER: RightTab[] = ['today', 'meals', 'smarthome', 'cameras']
const STORAGE_KEY = 'layoutPrefs'

function loadPrefs(): LayoutPrefs {
  if (typeof window === 'undefined') return { tabOrder: DEFAULT_ORDER }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LayoutPrefs>
      if (Array.isArray(parsed.tabOrder) && parsed.tabOrder.length === DEFAULT_ORDER.length) {
        return { tabOrder: parsed.tabOrder }
      }
    }
  } catch {}
  return { tabOrder: DEFAULT_ORDER }
}

export function useLayoutPrefs() {
  const [prefs, setPrefs] = useState<LayoutPrefs>(loadPrefs)

  const reorderTabs = useCallback((from: number, to: number) => {
    setPrefs(prev => {
      const newOrder = [...prev.tabOrder]
      const [moved] = newOrder.splice(from, 1)
      newOrder.splice(to, 0, moved)
      const next = { ...prev, tabOrder: newOrder }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const resetOrder = useCallback(() => {
    const next = { tabOrder: DEFAULT_ORDER }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setPrefs(next)
  }, [])

  return { tabOrder: prefs.tabOrder, reorderTabs, resetOrder }
}
