import { sendSMS } from './twilio'
import { sendPushNotification } from './push'
import { prisma } from './prisma'

interface Member {
  id: string
  name: string
  phoneNumber: string | null
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
    if (!m.phoneNumber) return false
    const prefs = getPrefs(m as Member)
    return prefs[pref] === true
  }) as Member[]
}

export async function sendEventReminder(event: { title: string; startTime: Date; memberId: string }) {
  const members = await getMembersWithPref('eventReminders')
  const target = members.find(m => m.id === event.memberId)
  if (!target?.phoneNumber) return
  const prefs = getPrefs(target)
  if (!prefs.eventReminders) return
  const name = (await prisma.familyMember.findUnique({ where: { id: event.memberId } }))?.name || 'Family'
  const msg = `⏰ ${name}, ${event.title} starts in 30 minutes!`
  await sendSMS(target.phoneNumber, msg)
  await sendPushNotification('Event Reminder', msg)
}

export async function sendNewEventNotification(event: { title: string; startTime: Date }, _createdBy: string) {
  const members = await getMembersWithPref('newEventAdded')
  const date = new Date(event.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const msg = `📅 New event: ${event.title} on ${date} at ${time}`
  for (const m of members) {
    if (m.phoneNumber) await sendSMS(m.phoneNumber, msg)
  }
  await sendPushNotification('New Event', msg)
}

export async function sendChoreReminder(chore: { title: string; assigneeId: string | null }) {
  if (!chore.assigneeId) return
  const member = await prisma.familyMember.findUnique({ where: { id: chore.assigneeId } }) as Member | null
  if (!member?.phoneNumber) return
  const prefs = getPrefs(member)
  if (!prefs.choreReminders) return
  const msg = `🧹 Reminder: ${chore.title} needs to be done today!`
  await sendSMS(member.phoneNumber, msg)
  await sendPushNotification('Chore Reminder', msg)
}

export async function sendMealPlanUpdate(meal: { name: string; mealType: string }, day: string) {
  const members = await getMembersWithPref('mealPlanUpdates')
  const msg = `🍽️ Meal update: ${meal.name} for ${day} ${meal.mealType}`
  for (const m of members) {
    if (m.phoneNumber) await sendSMS(m.phoneNumber, msg)
  }
}

export async function sendWeatherAlert(alert: { title: string; description: string }) {
  const members = await getMembersWithPref('weatherAlerts')
  const msg = `⚠️ Weather Alert: ${alert.title} - ${alert.description.slice(0, 100)}`
  for (const m of members) {
    if (m.phoneNumber) await sendSMS(m.phoneNumber, msg)
  }
  await sendPushNotification('Weather Alert', msg)
}

export async function sendAnnouncement(message: string, createdBy: string) {
  const members = await getMembersWithPref('announcements')
  const msg = `📢 ${createdBy}: ${message}`
  for (const m of members) {
    if (m.phoneNumber) await sendSMS(m.phoneNumber, msg)
  }
  await sendPushNotification('Announcement', msg)
}
