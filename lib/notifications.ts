import { sendEmail } from './email'
import { prisma } from './prisma'

interface Member {
  id: string
  name: string
  email: string | null
  notificationPrefs: string | null
}

function getPrefs(member: Member) {
  try {
    return JSON.parse(member.notificationPrefs || '{}')
  } catch {
    return {}
  }
}

async function getMembersWithPref(pref: string): Promise<Member[]> {
  const members = await prisma.familyMember.findMany()
  return members.filter(m => {
    if (!m.email) return false
    const prefs = getPrefs(m as Member)
    return prefs[pref] === true
  }) as Member[]
}

async function notifyByEmail(to: string, subject: string, message: string) {
  const html = `<div style="font-family:sans-serif;padding:20px;background:#0a0a18;color:#fff;border-radius:12px;">
    <h3 style="color:#3b82f6;margin:0 0 12px;">${subject}</h3>
    <p style="margin:0;font-size:15px;">${message}</p>
  </div>`
  await sendEmail(to, subject, html)
}

export async function sendEventReminder(event: { title: string; startTime: Date; memberId: string }) {
  const member = await prisma.familyMember.findUnique({ where: { id: event.memberId } }) as Member | null
  if (!member?.email) return
  const prefs = getPrefs(member)
  if (!prefs.eventReminders) return
  const msg = `${member.name}, ${event.title} starts in 30 minutes!`
  await notifyByEmail(member.email, 'Event Reminder', msg)
}

export async function sendNewEventNotification(event: { title: string; startTime: Date }, _createdBy: string) {
  const members = await getMembersWithPref('newEventAdded')
  const date = new Date(event.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const msg = `New event: ${event.title} on ${date} at ${time}`
  for (const m of members) {
    if (m.email) await notifyByEmail(m.email, 'New Event', msg)
  }
}

export async function sendChoreReminder(chore: { title: string; assigneeId: string | null }) {
  if (!chore.assigneeId) return
  const member = await prisma.familyMember.findUnique({ where: { id: chore.assigneeId } }) as Member | null
  if (!member?.email) return
  const prefs = getPrefs(member)
  if (!prefs.choreReminders) return
  const msg = `Reminder: ${chore.title} needs to be done today!`
  await notifyByEmail(member.email, 'Chore Reminder', msg)
}

export async function sendMealPlanUpdate(meal: { name: string; mealType: string }, day: string) {
  const members = await getMembersWithPref('mealPlanUpdates')
  const msg = `Meal update: ${meal.name} for ${day} ${meal.mealType}`
  for (const m of members) {
    if (m.email) await notifyByEmail(m.email, 'Meal Plan Update', msg)
  }
}

export async function sendWeatherAlert(alert: { title: string; description: string }) {
  const members = await getMembersWithPref('weatherAlerts')
  const msg = `${alert.title} - ${alert.description.slice(0, 200)}`
  for (const m of members) {
    if (m.email) await notifyByEmail(m.email, 'Weather Alert', msg)
  }
}

export async function sendAnnouncement(message: string, createdBy: string) {
  const members = await getMembersWithPref('announcements')
  const msg = `${createdBy}: ${message}`
  for (const m of members) {
    if (m.email) await notifyByEmail(m.email, 'Announcement', msg)
  }
}
