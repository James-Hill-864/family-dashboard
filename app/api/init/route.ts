import { NextResponse } from 'next/server'
import { initScheduler } from '@/lib/scheduler'

let started = false

export async function GET() {
  if (!started) {
    initScheduler()
    started = true
  }
  return NextResponse.json({ ok: true })
}
