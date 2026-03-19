import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const packages = await prisma.package.findMany({
    orderBy: [{ delivered: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(packages)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const pkg = await prisma.package.create({ data: body })
  return NextResponse.json(pkg, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (id) {
    await prisma.package.delete({ where: { id } })
  } else {
    // Delete all delivered packages
    await prisma.package.deleteMany({ where: { delivered: true } })
  }
  return new NextResponse(null, { status: 204 })
}
