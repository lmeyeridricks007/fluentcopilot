import { ServiceBusClient } from '@azure/service-bus'
import { getServiceBusConfig } from '../../config/env'

let client: ServiceBusClient | null = null

/**
 * Fire-and-forget domain events for future async consumers (recap jobs, recommendations, etc.).
 */
export async function publishAppEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
  const { connectionString, topicEvents } = getServiceBusConfig()
  if (!connectionString || connectionString.includes('FAKEKEY')) {
    return
  }
  try {
    if (!client) client = new ServiceBusClient(connectionString)
    const sender = client.createSender(topicEvents)
    try {
      const body = JSON.stringify({ eventType, payload, emittedAt: new Date().toISOString() })
      await sender.sendMessages({ body, contentType: 'application/json', subject: eventType })
    } finally {
      await sender.close()
    }
  } catch {
    /* non-fatal for Feature 1 */
  }
}
