// Shared SSE broadcast utility
// Clients connect via GET /api/events/stream

// Global set of SSE response controllers
export const sseClients = new Set<ReadableStreamDefaultController>()

export function broadcastUpdate(type: string, data?: unknown) {
  const message = `data: ${JSON.stringify({ type, data, ts: Date.now() })}\n\n`
  const encoded = new TextEncoder().encode(message)
  Array.from(sseClients).forEach(ctrl => {
    try {
      ctrl.enqueue(encoded)
    } catch {
      sseClients.delete(ctrl)
    }
  })
}
