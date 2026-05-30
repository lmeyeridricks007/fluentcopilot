import type { StoragePipelineOptions } from '@azure/storage-blob'

/**
 * `@azure/storage-blob` defaults `x-ms-version` to the SDK's SERVICE_VERSION (e.g. 2026-02-06).
 * Azurite often lags until upgraded — or needs `--skipApiVersionCheck`.
 *
 * Emulator / non–public-cloud hosts pin {@link AZURITE_COMPATIBLE_BLOB_API_VERSION}. Public Azure
 * (`*.blob.core.windows.net` or known `EndpointSuffix=`) uses `AZURE_STORAGE_SERVICE_VERSION` when
 * set, otherwise the SDK default (current service version).
 *
 * Escape hatch for odd local setups: `AZURITE_ALLOW_AZURE_SERVICE_VERSION=1` plus
 * `AZURE_STORAGE_SERVICE_VERSION`.
 *
 * @see https://github.com/Azure/Azurite/blob/main/README.md#skip-api-version-check
 */
export const AZURITE_COMPATIBLE_BLOB_API_VERSION = '2024-11-04'

/**
 * Azurite / legacy dev storage. Checked **before** {@link connectionStringUsesAzurePublicCloudBlob}
 * so a merged string that mentions `core.windows.net` but still targets the emulator does not pick
 * the SDK default API version, which Azurite rejects.
 */
export function connectionStringLooksLikeStorageEmulator(cs: string): boolean {
  const s = cs.toLowerCase().trim()
  if (!s) return false
  if (s.startsWith('usedevelopmentstorage=true')) return true
  if (s.includes('devstoreaccount1')) return true
  if (s.includes('127.0.0.1:10000')) return true
  if (s.includes('localhost:10000')) return true
  if (s.includes('host.docker.internal:10000')) return true
  return false
}

/** True when the connection string targets the usual public Azure Blob endpoint. */
export function connectionStringUsesAzurePublicCloudBlob(cs: string): boolean {
  const s = cs.toLowerCase().trim()
  if (!s) return false
  if (s.includes('.blob.core.windows.net')) return true
  if (s.includes('endpointsuffix=core.windows.net')) return true
  if (s.includes('endpointsuffix=core.chinacloudapi.cn')) return true
  if (s.includes('endpointsuffix=core.usgovcloudapi.net')) return true
  return false
}

/**
 * Pipeline options for `BlobServiceClient.fromConnectionString` so `x-ms-version` matches the host.
 * Single source of truth for all blob traffic in this app.
 */
export function resolveBlobServiceClientPipelineOptions(connectionString: string): StoragePipelineOptions {
  if (connectionStringLooksLikeStorageEmulator(connectionString)) {
    if (process.env.AZURITE_ALLOW_AZURE_SERVICE_VERSION === '1') {
      const fromEnv = process.env.AZURE_STORAGE_SERVICE_VERSION?.trim()
      if (fromEnv) return { version: fromEnv } as StoragePipelineOptions
    }
    return { version: AZURITE_COMPATIBLE_BLOB_API_VERSION } as StoragePipelineOptions
  }

  const onAzurePublicCloud = connectionStringUsesAzurePublicCloudBlob(connectionString)
  if (!onAzurePublicCloud) {
    if (process.env.AZURITE_ALLOW_AZURE_SERVICE_VERSION === '1') {
      const fromEnv = process.env.AZURE_STORAGE_SERVICE_VERSION?.trim()
      if (fromEnv) return { version: fromEnv } as StoragePipelineOptions
    }
    return { version: AZURITE_COMPATIBLE_BLOB_API_VERSION } as StoragePipelineOptions
  }

  const fromEnv = process.env.AZURE_STORAGE_SERVICE_VERSION?.trim()
  if (fromEnv) {
    return { version: fromEnv } as StoragePipelineOptions
  }
  return {}
}
