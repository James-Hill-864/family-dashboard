import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/members/reorder
 * Body: { ids: string[] } — ordered list of member IDs
 */
export async function POST(req: NextRequest) {
  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: 'ids must be an array' }, { status: 400 })
  }

  for (let i = 0; i < ids.length; i++) {
    await prisma.familyMember.update({
      where: { id: ids[i] },
      data: { sortOrder: i },
    })
  }

  return NextResponse.json({ ok: true })
}
