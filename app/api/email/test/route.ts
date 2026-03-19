import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { memberId } = await req.json() as { memberId: string }

  const member = await prisma.familyMember.findUnique({ where: { id: memberId } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (!member.email) return NextResponse.json({ error: 'No email address set for this member' }, { status: 400 })

  try {
    const familyName = process.env.NEXT_PUBLIC_FAMILY_NAME || 'Family Dashboard'
    await sendEmail(
      member.email,
      `Test from ${familyName}`,
      `<div style="font-family:sans-serif;padding:20px;background:#0a0a18;color:#fff;border-radius:12px;">
        <h2 style="color:#3b82f6;">${familyName}</h2>
        <p>Hi ${member.name}! This is a test email from your Family Dashboard.</p>
        <p style="color:#6a6d8a;font-size:12px;">If you received this, email notifications are working correctly.</p>
      </div>`,
    )
    return NextResponse.json({ ok: true, message: `Test email sent to ${member.email}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
