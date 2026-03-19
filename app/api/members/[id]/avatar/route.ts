import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData()
    const file = formData.get('photo') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Accepted: jpg, jpeg, png, webp' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const avatarDir = '/data/avatars'
    await mkdir(avatarDir, { recursive: true })
    const filePath = path.join(avatarDir, `${params.id}.jpg`)
    await writeFile(filePath, buffer)

    return NextResponse.json({ url: `/api/avatars/${params.id}` })
  } catch (err) {
    console.error('Avatar upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const filePath = path.join('/data/avatars', `${params.id}.jpg`)
    await unlink(filePath)
  } catch {
    // File may not exist, that's fine
  }
  return NextResponse.json({ ok: true })
}
