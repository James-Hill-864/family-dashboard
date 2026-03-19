import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER

export async function sendSMS(to: string, message: string): Promise<void> {
  if (!accountSid || !authToken || !fromNumber || accountSid === 'placeholder') {
    console.log(`[SMS] Would send to ${to}: ${message}`)
    return
  }
  try {
    const client = twilio(accountSid, authToken)
    const result = await client.messages.create({ body: message, from: fromNumber, to })
    console.log(`[SMS] Sent to ${to} — SID: ${result.sid}, Status: ${result.status}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[SMS] Failed to send to ${to}: ${msg}`)
  }
}
