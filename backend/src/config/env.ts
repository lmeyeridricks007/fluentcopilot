/**
 * Central configuration — no secrets in code. Values from local.settings.json / App Settings.
 */
import {
  getAzureOpenAiConversationConfig,
  getResolvedAiProviderId,
} from '../services/ai/config/aiProviderConfig'

export type AppProfile = 'LocalMock' | 'LocalAzure' | 'CloudDev'

export function getAppProfile(): AppProfile {
  const p = (process.env.APP_PROFILE ?? 'LocalMock').trim() as AppProfile
  if (p === 'LocalAzure' || p === 'CloudDev') return p
  return 'LocalMock'
}

/** Origins allowed for browser CORS. Set `CORS_ALLOWED_ORIGINS` (comma-separated) to override; in CloudDev, empty env means rely on Azure Portal CORS unless you set this. */
export function getCorsAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim()
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (getAppProfile() === 'CloudDev') return []
  return ['http://localhost:3000', 'http://127.0.0.1:3000']
}

/** True when `AI_PROVIDER` resolves to the deterministic mock (no external LLM). */
export function useMockLlm(): boolean {
  return getResolvedAiProviderId() === 'mock'
}

export function useNoOpModeration(): boolean {
  return getAppProfile() === 'LocalMock'
}

export function getSqlConnectionString(): string | undefined {
  return process.env.SQL_CONNECTION_STRING?.trim() || undefined
}

/** @deprecated Prefer `getAzureOpenAiConversationConfig` from `services/ai/config/aiProviderConfig`. */
export function getAzureOpenAiConfig() {
  const c = getAzureOpenAiConversationConfig()
  return {
    endpoint: c.endpoint,
    apiKey: c.apiKey,
    apiVersion: c.apiVersion,
    deployment: c.deployment,
  }
}

export function getContentSafetyConfig() {
  return {
    endpoint: process.env.AZURE_CONTENT_SAFETY_ENDPOINT?.replace(/\/$/, '') ?? '',
    apiKey: process.env.AZURE_CONTENT_SAFETY_KEY ?? '',
    apiVersion: process.env.AZURE_CONTENT_SAFETY_API_VERSION ?? '2023-10-01',
  }
}

/** Artifacts container + connection string. Blob REST `x-ms-version` is derived in `services/storage/blobClientPipelineOptions.ts` (not here). */
export function getBlobConfig() {
  return {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING ?? '',
    artifactsContainer: process.env.AZURE_STORAGE_CONTAINER_ARTIFACTS ?? 'fc-artifacts',
  }
}

export function getServiceBusConfig() {
  return {
    connectionString: process.env.SERVICE_BUS_CONNECTION_STRING ?? '',
    topicEvents: process.env.SERVICE_BUS_TOPIC_EVENTS ?? 'fc-app-events',
  }
}
