import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'placeholder@gmail.com') {
    console.log('[email] Gmail not configured, skipping send to', to)
    return
  }
  await transporter.sendMail({
    from: `"${process.env.NEXT_PUBLIC_FAMILY_NAME || 'Family Dashboard'}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

export function buildAgendaEmail(params: {
  memberName: string
  date: Date
  allEvents: Array<{ title: string; startTime: Date; endTime: Date; allDay: boolean; color?: string; memberName: string }>
  myEvents: Array<{ title: string; startTime: Date; endTime: Date; allDay: boolean; color?: string }>
  meals: { breakfast?: string; lunch?: string; dinner?: string }
  myChores: Array<{ title: string; assigneeName: string }>
  upcomingEvents: Array<{ title: string; startTime: Date; memberName: string }>
  weather?: { temp: number; condition: string; high: number; low: number; icon: string }
  dashboardUrl: string
}): string {
  const { memberName, date, allEvents, myEvents, meals, myChores, upcomingEvents, weather, dashboardUrl } = params

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const formatTime = (d: Date, allDay: boolean) => {
    if (allDay) return 'All day'
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const eventsRows = allEvents.length === 0
    ? '<tr><td colspan="3" style="padding:8px 0;color:#888;font-style:italic;">No events today</td></tr>'
    : allEvents.map(e => `
      <tr>
        <td style="padding:6px 0;width:16px;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${e.color || '#3b82f6'};"></span></td>
        <td style="padding:6px 8px;color:#333;font-size:14px;">${formatTime(e.startTime, e.allDay)}</td>
        <td style="padding:6px 0;color:#111;font-size:14px;font-weight:500;">${e.title} <span style="color:#888;font-weight:400;">(${e.memberName})</span></td>
      </tr>`).join('')

  const myEventsSection = myEvents.length === 0 ? '' : `
    <div style="background:#f0f7ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:4px;margin:16px 0;">
      <div style="font-weight:700;color:#1d4ed8;margin-bottom:8px;">Your Events</div>
      ${myEvents.map(e => `<div style="padding:4px 0;color:#1e40af;font-size:14px;">• ${formatTime(e.startTime, e.allDay)} — ${e.title}</div>`).join('')}
    </div>`

  const mealsSection = (meals.breakfast || meals.lunch || meals.dinner) ? `
    <h3 style="color:#374151;font-size:16px;margin:24px 0 8px;">🍽️ Meals Today</h3>
    <table style="border-collapse:collapse;width:100%;">
      ${meals.breakfast ? `<tr><td style="padding:5px 12px 5px 0;color:#6b7280;font-size:13px;width:90px;">Breakfast</td><td style="padding:5px 0;color:#111;font-size:14px;">${meals.breakfast}</td></tr>` : ''}
      ${meals.lunch ? `<tr><td style="padding:5px 12px 5px 0;color:#6b7280;font-size:13px;">Lunch</td><td style="padding:5px 0;color:#111;font-size:14px;">${meals.lunch}</td></tr>` : ''}
      ${meals.dinner ? `<tr><td style="padding:5px 12px 5px 0;color:#6b7280;font-size:13px;">Dinner</td><td style="padding:5px 0;color:#111;font-size:14px;">${meals.dinner}</td></tr>` : ''}
    </table>` : ''

  const choresSection = myChores.length === 0 ? '' : `
    <h3 style="color:#374151;font-size:16px;margin:24px 0 8px;">✅ Your Chores Due Today</h3>
    ${myChores.map(c => `<div style="padding:4px 0;color:#374151;font-size:14px;">□ ${c.title}</div>`).join('')}`

  const upcomingSection = upcomingEvents.length === 0 ? '' : `
    <h3 style="color:#374151;font-size:16px;margin:24px 0 8px;">📆 Coming Up (Next 3 Days)</h3>
    ${upcomingEvents.map(e => `<div style="padding:3px 0;color:#374151;font-size:13px;">• ${e.startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} — ${e.title} <span style="color:#888;">(${e.memberName})</span></div>`).join('')}`

  const weatherSection = weather ? `
    <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:16px 0;display:flex;align-items:center;gap:12px;">
      <span style="font-size:32px;">${weather.icon}</span>
      <div>
        <div style="font-size:20px;font-weight:700;color:#111;">${weather.temp}°F <span style="font-size:14px;font-weight:400;color:#555;">${weather.condition}</span></div>
        <div style="font-size:13px;color:#666;">High ${weather.high}° / Low ${weather.low}° · Taylors, SC</div>
      </div>
    </div>` : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);border-radius:12px 12px 0 0;padding:28px 28px 20px;">
      <div style="color:#93c5fd;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">${process.env.NEXT_PUBLIC_FAMILY_NAME || 'Family Dashboard'}</div>
      <div style="color:#fff;font-size:24px;font-weight:700;">Good morning, ${memberName}!</div>
      <div style="color:#bfdbfe;font-size:14px;margin-top:4px;">${dayName}, ${dateStr}</div>
    </div>
    <!-- Body -->
    <div style="background:#fff;border-radius:0 0 12px 12px;padding:28px;">
      ${weatherSection}
      <h3 style="color:#374151;font-size:16px;margin:0 0 12px;">📅 Today's Events</h3>
      <table style="border-collapse:collapse;width:100%;">${eventsRows}</table>
      ${myEventsSection}
      ${mealsSection}
      ${choresSection}
      ${upcomingSection}
      <!-- Footer -->
      <div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:20px;text-align:center;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600;">View Full Dashboard →</a>
        <div style="color:#9ca3af;font-size:11px;margin-top:12px;">Hill Family Dashboard · ${dashboardUrl}</div>
      </div>
    </div>
  </div>
</body></html>`
}
