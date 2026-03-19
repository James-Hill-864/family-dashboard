import schedule from 'node-schedule'
import { prisma } from './prisma'
import { sendEventReminder, sendChoreReminder, sendWeatherAlert } from './notifications'
import { sendEmail, buildAgendaEmail } from './email'
import { syncAllMembers } from './google-sync'

let initialized = false

const NWS_URL = 'https://api.weather.gov/alerts/active?point=34.9176,-82.2946'

export async function checkWeatherAlerts() {
  try {
    const res = await fetch(NWS_URL, { headers: { 'User-Agent': 'FamilyDashboard/1.0' } })
    if (!res.ok) return []
    const data = await res.json()
    const alerts = data?.features || []
    const newAlerts: { id: string; title: string; description: string }[] = []

    for (const feature of alerts) {
      const id = feature.id as string
      const title = feature.properties?.event as string || 'Weather Alert'
      const description = feature.properties?.description as string || ''

      const existing = await prisma.sentAlert.findUnique({ where: { alertId: id } })
      if (!existing) {
        await prisma.sentAlert.create({ data: { alertId: id, title } })
        await sendWeatherAlert({ title, description })
        newAlerts.push({ id, title, description })
      }
    }
    interface NWSFeature { id: string; properties?: { event?: string; description?: string; severity?: string; urgency?: string } }
    return alerts.map((f: NWSFeature) => ({
      id: f.id,
      title: f.properties?.event || 'Alert',
      description: f.properties?.description || '',
      severity: f.properties?.severity || 'Unknown',
      urgency: f.properties?.urgency || 'Unknown',
    }))
  } catch (err) {
    console.error('[Weather] Alert check failed:', err)
    return []
  }
}

export function initScheduler() {
  if (initialized) return
  initialized = true

  // Every minute: check event reminders
  schedule.scheduleJob('* * * * *', async () => {
    const now = new Date()
    const windowStart = new Date(now.getTime() + 29 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + 31 * 60 * 1000)

    // Check DB reminders
    const reminders = await prisma.reminder.findMany({
      where: { sent: false },
      include: { event: { include: { member: true } } },
    })
    for (const reminder of reminders) {
      const triggerTime = new Date(reminder.event.startTime)
      triggerTime.setMinutes(triggerTime.getMinutes() - reminder.minutesBefore)
      if (triggerTime <= now) {
        await prisma.reminder.update({ where: { id: reminder.id }, data: { sent: true, sentAt: now } })
        console.log(`[Reminder] ${reminder.event.title} for ${reminder.event.member.name}`)
      }
    }

    // SMS 30-min event reminders
    const upcomingEvents = await prisma.calendarEvent.findMany({
      where: { startTime: { gte: windowStart, lte: windowEnd } },
      include: { member: true },
    })
    for (const event of upcomingEvents) {
      const smsKey = `event-reminder-${event.id}`
      const already = await prisma.sentSms.findUnique({ where: { key: smsKey } })
      if (!already) {
        await prisma.sentSms.create({ data: { key: smsKey } })
        await sendEventReminder({ title: event.title, startTime: event.startTime, memberId: event.memberId })
      }
    }
  })

  // 9am daily: chore reminders
  schedule.scheduleJob('0 9 * * *', async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today.getTime() + 86400000)
    const chores = await prisma.todo.findMany({
      where: { category: 'chore', done: false, dueDate: { gte: today, lt: tomorrow } },
    })
    for (const chore of chores) {
      const smsKey = `chore-reminder-${chore.id}-${today.toDateString()}`
      const already = await prisma.sentSms.findUnique({ where: { key: smsKey } })
      if (!already) {
        await prisma.sentSms.create({ data: { key: smsKey } })
        await sendChoreReminder({ title: chore.title, assigneeId: chore.assigneeId })
      }
    }
  })

  // Every 15 minutes: weather alerts
  schedule.scheduleJob('*/15 * * * *', async () => {
    await checkWeatherAlerts()
  })

  // Every 15 minutes: auto-sync Google Calendar
  schedule.scheduleJob('3,18,33,48 * * * *', async () => {
    try {
      await syncAllMembers()
    } catch (err) {
      console.error('[scheduler] Google Calendar auto-sync failed:', err)
    }
  })

  // Daily agenda emails at 7:00 AM
  schedule.scheduleJob('0 7 * * *', async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const in3Days = new Date(today)
      in3Days.setDate(in3Days.getDate() + 3)

      const members = await prisma.familyMember.findMany()
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

      // Get today's meals
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

      for (const member of members) {
        if (!member.email || !member.agendaEmailEnabled) continue
        const emailKey = `agenda-${member.id}-${today.toISOString().split('T')[0]}`
        const alreadySent = await prisma.sentEmail.findUnique({ where: { key: emailKey } })
        if (alreadySent) continue

        const myEvents = allTodayEvents.filter(e => e.memberId === member.id)
        const myChores = await prisma.todo.findMany({
          where: { assigneeId: member.id, category: 'chore', done: false, dueDate: { gte: today, lt: tomorrow } },
        })

        const html = buildAgendaEmail({
          memberName: member.name,
          date: today,
          allEvents: allTodayEvents.map(e => ({
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
            allDay: e.allDay,
            color: e.color || undefined,
            memberName: e.member.name,
          })),
          myEvents: myEvents.map(e => ({
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
            allDay: e.allDay,
          })),
          meals,
          myChores: myChores.map(c => ({ title: c.title, assigneeName: member.name })),
          upcomingEvents: upcomingEvents.map(e => ({
            title: e.title,
            startTime: e.startTime,
            memberName: e.member.name,
          })),
          dashboardUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://192.168.86.44:3000',
        })

        const familyName = process.env.NEXT_PUBLIC_FAMILY_NAME || 'Hill Family'
        const subject = `📅 ${familyName} - Today's Agenda - ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
        await sendEmail(member.email, subject, html)
        await prisma.sentEmail.create({ data: { key: emailKey } })
        console.log(`[scheduler] Sent agenda email to ${member.name} (${member.email})`)
      }
    } catch (err) {
      console.error('[scheduler] Agenda email error:', err)
    }
  })
}
