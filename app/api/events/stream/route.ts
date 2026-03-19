import { NextRequest } from 'next/server'
import { sseClients } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  let controller: ReadableStreamDefaultController
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      sseClients.add(ctrl)
      // Send initial connected message
      ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))
      // Keep-alive ping every 25 seconds
      const ping = setInterval(() => {
        try {
          ctrl.enqueue(new TextEncoder().encode(`: ping\n\n`))
        } catch {
          clearInterval(ping)
          sseClients.delete(ctrl)
        }
      }, 25000)
    },
    cancel() {
      sseClients.delete(controller)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
