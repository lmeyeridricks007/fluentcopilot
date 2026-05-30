import {
  BlobSASPermissions,
  BlobServiceClient,
  SASProtocol,
  type BlockBlobClient,
  type ContainerClient,
} from '@azure/storage-blob'
import { getBlobConfig } from '../../config/env'
import { ApiError } from '../../shared/errors'
import { resolveBlobServiceClientPipelineOptions } from './blobClientPipelineOptions'

/** All blob I/O uses one {@link BlobServiceClient}; pipeline `version` is set in {@link resolveBlobServiceClientPipelineOptions}. */

let blobService: BlobServiceClient | null = null
let blobServiceConnectionString: string | null = null
let blobServicePipelineKey: string | null = null

function getClient(): BlobServiceClient | null {
  const { connectionString } = getBlobConfig()
  if (!connectionString) return null
  const pipelineKey = JSON.stringify(resolveBlobServiceClientPipelineOptions(connectionString))
  if (
    blobService &&
    (blobServiceConnectionString !== connectionString || blobServicePipelineKey !== pipelineKey)
  ) {
    blobService = null
    blobServiceConnectionString = null
    blobServicePipelineKey = null
    ensuredContainers.clear()
  }
  if (!blobService) {
    blobServiceConnectionString = connectionString
    blobServicePipelineKey = pipelineKey
    blobService = BlobServiceClient.fromConnectionString(
      connectionString,
      resolveBlobServiceClientPipelineOptions(connectionString),
    )
  }
  return blobService
}

const ensuredContainers = new Map<string, Promise<ContainerClient>>()

function getEnsuredContainer(client: BlobServiceClient, containerName: string): Promise<ContainerClient> {
  const existing = ensuredContainers.get(containerName)
  if (existing) return existing
  const p = (async () => {
    const container = client.getContainerClient(containerName)
    await container.createIfNotExists()
    return container
  })()
  ensuredContainers.set(containerName, p)
  p.catch(() => ensuredContainers.delete(containerName))
  return p
}

function conversationBlobPath(threadId: string, name: string): string {
  return `conversations/${threadId}/${name}`
}

function quickCaptureBlobPath(userId: string, captureId: string, name: string): string {
  return `quick-capture/${userId}/${captureId}/${name}`
}

/**
 * Sample artifact write — future: audio, OCR captures, generated assets.
 */
export async function tryUploadConversationArtifact(
  threadId: string,
  fileName: string,
  data: unknown
): Promise<void> {
  const client = getClient()
  const { artifactsContainer } = getBlobConfig()
  if (!client) return
  try {
    const container = await getEnsuredContainer(client, artifactsContainer)
    const path = conversationBlobPath(threadId, fileName)
    const block: BlockBlobClient = container.getBlockBlobClient(path)
    const buf = Buffer.from(JSON.stringify(data), 'utf8')
    await block.uploadData(buf, {
      blobHTTPHeaders: { blobContentType: 'application/json' },
    })
  } catch {
    /* Azurite / network optional in LocalMock */
  }
}

/**
 * Upload binary learner/reference audio. Returns storage-relative path
 * (`{fileName}` under `conversations/{threadId}/`) when upload succeeds.
 */
export async function tryUploadConversationBinaryArtifact(
  threadId: string,
  fileName: string,
  data: Buffer,
  contentType: string
): Promise<string | null> {
  const client = getClient()
  const { artifactsContainer } = getBlobConfig()
  if (!client) {
    console.warn(`[blob] upload skipped — no storage client configured (${threadId}/${fileName}, ${data.length} bytes)`)
    return null
  }
  try {
    const container = await getEnsuredContainer(client, artifactsContainer)
    const path = conversationBlobPath(threadId, fileName)
    const block: BlockBlobClient = container.getBlockBlobClient(path)
    await block.uploadData(data, {
      blobHTTPHeaders: { blobContentType: contentType || 'application/octet-stream' },
    })
    return fileName
  } catch (err) {
    console.error(`[blob] upload failed for ${threadId}/${fileName} (${data.length} bytes):`, err instanceof Error ? err.message : err)
    return null
  }
}

/** Fails fast when conversation audio (or other required artifacts) cannot be written. */
export function assertConversationBinaryBlobStorageConfigured(): void {
  const { connectionString } = getBlobConfig()
  if (!connectionString?.trim()) {
    throw new ApiError(
      503,
      'DEPENDENCY_UNAVAILABLE',
      'Azure Blob Storage is required for Speak Live audio. Set AZURE_STORAGE_CONNECTION_STRING (UseDevelopmentStorage=true for Azurite).',
    )
  }
}

/**
 * Upload learner/reference audio under `conversations/{threadId}/`. Throws {@link ApiError}
 * when storage is not configured or the write fails (no silent skip).
 */
export async function uploadConversationBinaryArtifactRequired(
  threadId: string,
  fileName: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  assertConversationBinaryBlobStorageConfigured()
  const client = getClient()
  const { artifactsContainer } = getBlobConfig()
  if (!client) {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Blob storage client failed to initialize.')
  }
  try {
    const container = await getEnsuredContainer(client, artifactsContainer)
    const path = conversationBlobPath(threadId, fileName)
    const block: BlockBlobClient = container.getBlockBlobClient(path)
    await block.uploadData(data, {
      blobHTTPHeaders: { blobContentType: contentType || 'application/octet-stream' },
    })
    return fileName
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[blob] required upload failed for ${threadId}/${fileName} (${data.length} bytes):`, msg)
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', `Blob upload failed for ${fileName}: ${msg}`)
  }
}

/**
 * Binary quick-capture media (photo or voice). Returns `{ containerRelativePath, fileName }`
 * where `fileName` is the last segment (for symmetry with conversation uploads).
 */
export async function tryUploadQuickCaptureBinaryArtifact(
  userId: string,
  captureId: string,
  fileName: string,
  data: Buffer,
  contentType: string,
): Promise<{ containerRelativePath: string; fileName: string } | null> {
  const client = getClient()
  const { artifactsContainer } = getBlobConfig()
  if (!client) {
    console.warn(
      `[blob] quick-capture upload skipped — no storage client (${userId}/${captureId}/${fileName}, ${data.length} bytes)`,
    )
    return null
  }
  try {
    const container = await getEnsuredContainer(client, artifactsContainer)
    const path = quickCaptureBlobPath(userId, captureId, fileName)
    const block: BlockBlobClient = container.getBlockBlobClient(path)
    await block.uploadData(data, {
      blobHTTPHeaders: { blobContentType: contentType || 'application/octet-stream' },
    })
    return { containerRelativePath: path, fileName }
  } catch (err) {
    console.error(
      `[blob] quick-capture upload failed for ${captureId}/${fileName}:`,
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

/**
 * Short-lived read SAS for a blob already stored under the artifacts container (e.g. quick-capture voice).
 */
export async function tryGetBlobReadSasUrl(containerRelativePath: string, ttlMs = 20 * 60 * 1000): Promise<string | null> {
  const client = getClient()
  const { artifactsContainer } = getBlobConfig()
  const path = containerRelativePath.trim()
  if (!client || !path) {
    return null
  }
  try {
    const container = client.getContainerClient(artifactsContainer)
    const blob = container.getBlockBlobClient(path)
    const expiresOn = new Date(Date.now() + ttlMs)
    return await blob.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      expiresOn,
      protocol: SASProtocol.HttpsAndHttp,
    })
  } catch (err) {
    console.warn(
      `[blob] SAS failed for ${path}:`,
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

export async function tryDownloadConversationBinaryArtifact(
  threadId: string,
  fileName: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const client = getClient()
  const { artifactsContainer } = getBlobConfig()
  if (!client) {
    console.warn(`[blob] download skipped — no storage client configured (${threadId}/${fileName})`)
    return null
  }
  try {
    const container = client.getContainerClient(artifactsContainer)
    const path = conversationBlobPath(threadId, fileName)
    const block = container.getBlockBlobClient(path)
    const dl = await block.downloadToBuffer()
    const props = await block.getProperties()
    const ct = props.contentType || 'application/octet-stream'
    return { buffer: dl, contentType: ct }
  } catch (err) {
    console.warn(`[blob] download failed for ${threadId}/${fileName}:`, err instanceof Error ? err.message : err)
    return null
  }
}
