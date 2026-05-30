import { afterEach, describe, expect, it } from 'vitest'
import {
  AZURITE_COMPATIBLE_BLOB_API_VERSION,
  connectionStringLooksLikeStorageEmulator,
  connectionStringUsesAzurePublicCloudBlob,
  resolveBlobServiceClientPipelineOptions,
} from './blobClientPipelineOptions'

describe('resolveBlobServiceClientPipelineOptions', () => {
  afterEach(() => {
    delete process.env.AZURE_STORAGE_SERVICE_VERSION
    delete process.env.AZURITE_ALLOW_AZURE_SERVICE_VERSION
  })

  it('pins compatible version for UseDevelopmentStorage', () => {
    expect(resolveBlobServiceClientPipelineOptions('UseDevelopmentStorage=true')).toEqual({
      version: AZURITE_COMPATIBLE_BLOB_API_VERSION,
    })
  })

  it('pins when emulator markers appear even if EndpointSuffix looks like public Azure', () => {
    const poison =
      'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;EndpointSuffix=core.windows.net'
    expect(connectionStringUsesAzurePublicCloudBlob(poison)).toBe(true)
    expect(connectionStringLooksLikeStorageEmulator(poison)).toBe(true)
    expect(resolveBlobServiceClientPipelineOptions(poison)).toEqual({
      version: AZURITE_COMPATIBLE_BLOB_API_VERSION,
    })
  })

  it('uses AZURE_STORAGE_SERVICE_VERSION for public Azure when set', () => {
    process.env.AZURE_STORAGE_SERVICE_VERSION = '2025-07-05'
    const cs =
      'DefaultEndpointsProtocol=https;AccountName=myacct;AccountKey=YWNjb3VudEtleQ==;EndpointSuffix=core.windows.net'
    expect(resolveBlobServiceClientPipelineOptions(cs)).toEqual({ version: '2025-07-05' })
  })

  it('returns {} for public Azure when env version unset (SDK default)', () => {
    const cs =
      'DefaultEndpointsProtocol=https;AccountName=myacct;AccountKey=YWNjb3VudEtleQ==;EndpointSuffix=core.windows.net'
    expect(resolveBlobServiceClientPipelineOptions(cs)).toEqual({})
  })

  it('pins for custom host without public Azure markers', () => {
    const cs =
      'DefaultEndpointsProtocol=http;AccountName=local;AccountKey=YWNjb3VudEtleQ==;BlobEndpoint=http://minio.local:9000/mybucket;'
    expect(connectionStringUsesAzurePublicCloudBlob(cs)).toBe(false)
    expect(resolveBlobServiceClientPipelineOptions(cs)).toEqual({
      version: AZURITE_COMPATIBLE_BLOB_API_VERSION,
    })
  })

  it('honors AZURITE_ALLOW_AZURE_SERVICE_VERSION for emulator', () => {
    process.env.AZURITE_ALLOW_AZURE_SERVICE_VERSION = '1'
    process.env.AZURE_STORAGE_SERVICE_VERSION = '2025-01-05'
    expect(resolveBlobServiceClientPipelineOptions('UseDevelopmentStorage=true')).toEqual({
      version: '2025-01-05',
    })
  })
})
