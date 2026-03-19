import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, buildAgendaEmail } from '@/lib/email'

/**
 * POST /api/email/agenda { memberId }
 * Sends the daily agenda email to a specific member immediately.
 */
export async function POST(req: NextRequest) {
  const { memberId } = await req.json() as { memberId: string }

  const member = await prisma.familyMember.findUnique({ where: { id: memberId } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (!member.email) return NextResponse.json({ error: 'No email address set' }, { status: 400 })

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const in3Days = new Date(today)
    in3Days.setDate(in3Days.getDate() + 3)

    const allTodayEvents = await prisma.calendarEvent.findMany({
      where: { startTime: { gte: today, lt: tomorrow } },
      include: { member: true },
      orderBy: { startTime: 'asc' },
    })
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: { startTime: { gte: tomorrow, lt: in3Days } },
      include: { member: true },
      orderBy: { startTime: 'asc' },
    })

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const todayMeals = await prisma.mealPlan.findMany({
      where: { weekStart, day: today.getDay() },
    })
    const meals = {
      breakfast: todayMeals.find(m => m.mealType === 'breakfast')?.name,
      lunch: todayMeals.find(m => m.mealType === 'lunch')?.name,
      dinner: todayMeals.find(m => m.mealType === 'dinner')?.name,
    }

    const myEvents = allTodayEvents.filter(e => e.memberId === member.id)
    const myChores = await prisma.todo.findMany({
      where: { assigneeId: member.id, category: 'chore', done: false, dueDate: { gte: today, lt: tomorrow } },
    })

    const html = buildAgendaEmail({
      memberName: member.name,
      date: today,
      allEvents: allTodayEvents.map(e => ({
        title: e.title, startTime: e.startTime, endTime: e.endTime, allDay: e.allDay,
        color: e.color || undefined, memberName: e.member.name,
      })),
      myEvents: myEvents.map(e => ({
        title: e.title, startTime: e.startTime, endTime: e.endTime, allDay: e.allDay,
      })),
      meals,
      myChores: myChores.map(c => ({ title: c.title, assigneeName: member.name })),
      upcomingEvents: upcomingEvents.map(e => ({
        title: e.title, startTime: e.startTime, memberName: e.member.name,
      })),
      dashboardUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://192.168.86.44:3000',
    })

    const familyName = process.env.NEXT_PUBLIC_FAMILY_NAME || 'Hill Family'
    const subject = `📅 ${familyName} - Today's Agenda - ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
    await sendEmail(member.email, subject, html)

    return NextResponse.json({ ok: true, message: `Agenda email sent to ${member.email}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
