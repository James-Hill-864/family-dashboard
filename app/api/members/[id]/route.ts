import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeMember(member: any) {
  const { googleAccessToken, googleRefreshToken, googleTokenExpiry, ...safe } = member
  safe.googleConnected = !!googleRefreshToken
  return safe
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const member = await prisma.familyMember.update({ where: { id: params.id }, data: body })
  return NextResponse.json(sanitizeMember(member))
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.familyMember.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
