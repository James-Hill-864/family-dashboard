export async function register() {
  // Only run on the server (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initScheduler } = await import('@/lib/scheduler')
    initScheduler()
    console.log('[instrumentation] Scheduler initialized on server startup')
  }
}
