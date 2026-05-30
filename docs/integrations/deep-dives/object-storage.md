# Object / Media Storage — Integration Deep-Dive

**Integration**: Strategy (S3-compatible or Azure Blob, EU).  
**Version**: 1  
**Status**: Implementation-grade

---

## 1. Purpose

Specify **object storage** for lesson media, listening audio, user photos (e.g. daily reflection), and optional voice/pronunciation audio retention. Enables CDN-style URLs or signed URLs for private content; EU residency (ARCH-001).

---

## 2. Core Concept

- **Storage**: Backend uploads and reads objects by key (path); returns public CDN URL or signed URL (private). Content tables store key or relative path; API resolves to full URL when serving to client.
- **Source of truth**: Our DB holds metadata and keys; object store holds blobs. Deletion: remove from store and update DB.

---

## 3. Why This Integration Exists

- **Lesson media**: Images and audio for lessons and listening exercises (docs/content). **User content**: Reflection photos, optional voice recordings. **TTS/STT**: Optional persistence of generated or user audio.

---

## 4. Business Capabilities Enabled

- **Serve lesson assets**: GET lesson returns media URLs (CDN or signed). **Upload user content**: Reflection photo upload → store → save key in activity. **Audio**: Store TTS output or user recording key for replay (policy-based retention).

---

## 5. Scope

### 6. In Scope

- Put object (key, body, content-type); Get object (key) → stream or URL; Delete object (key). Signed URL generation for private buckets (expiry e.g. 1h). Bucket/container per env (dev, prod); EU region.
- Adapter interface; implementations: S3Adapter (AWS or S3-compatible), AzureBlobAdapter. Backend only.
- Local dev: MinIO or localstack or mock adapter (in-memory or local folder).

### 7. Out of Scope

- Video streaming (HLS/DASH). Direct client upload to presigned URL (optional Phase 2). Versioning and lifecycle policies (optional).

---

## 8. Triggering Flows / Usage Points

| Trigger | Flow |
|---------|------|
| Serve lesson media | Backend or CDN: resolve key from content table → return CDN URL or signed URL. |
| User uploads reflection photo | Client → POST /v1/reflection/photo (multipart) → Backend → StorageAdapter.put(key, body) → save key in activity → return URL to client. |
| TTS audio persistence | After TTS: Backend → put(key, audio_stream) → return key/URL in response; store in session/turn. |

---

## 9. Inputs

- **Put**: key (path), body (buffer/stream), content_type, optional metadata. **Get**: key. **Signed URL**: key, expiry_seconds. **Delete**: key.

---

## 10. Outputs

- **Put**: key or URL. **Get**: stream or URL. **Signed URL**: URL string (expires). **Delete**: success.

---

## 11. Data Domains Involved

- **Content**: lesson_id, media_key (e.g. lessons/{id}/image.jpg). **User content**: activity_id, photo_key; voice session turn audio_key. **CDN_BASE_URL** or bucket domain for public URLs.

---

## 12. Source of Truth Rules

- **Keys**: Our DB stores keys; storage holds blobs. If object is deleted externally, GET fails; we can detect and return 404 or re-upload.

---

## 13. Authentication Model

- **Provider**: IAM role (AWS) or connection string / SAS (Azure); API key for S3-compatible. Stored in env (AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION, S3_BUCKET or AZURE_STORAGE_CONNECTION_STRING, CONTAINER). Backend only.

---

## 14. Authorization / Consent Model

- **Upload**: User must be authenticated; consent for photo/audio if required (FD-07, FD-04). **Download**: Entitlement or ownership check when generating signed URL (e.g. only owner or premium can access user content).

---

## 15. Configuration Model

| Key | Type | Description |
|-----|------|-------------|
| STORAGE_PROVIDER | string | s3 \| azure |
| S3_BUCKET / CONTAINER_NAME | string | Bucket or container |
| AWS_* or AZURE_* | string | Credentials and region |
| CDN_BASE_URL | string | Public base for lesson media (e.g. https://cdn.example.com) |
| SIGNED_URL_EXPIRY_SECONDS | number | Default expiry for signed URLs |

---

## 16. Environment Strategy

| Env | Setup |
|-----|--------|
| **Local** | MinIO (S3-compatible) in Docker; or mock adapter writing to local ./storage. STORAGE_PROVIDER=s3, endpoint http://localhost:9000. |
| **Staging** | Separate bucket/container; same provider as prod. |
| **Production** | EU region bucket; CDN in front if needed; private bucket for user content with signed URLs only. |

---

## 17. Data Flow Design

- **Upload**: Validate size/type → generate key (e.g. user/{user_id}/reflection/{date}.jpg) → put(key, body) → return key; store key in DB.
- **Download**: Resolve key from DB → get signed URL (if private) or CDN URL → return URL in API response. Client loads URL directly.

---

## 18. Sync / Polling / Webhook Design

- **Sync**: Put and Get are request/response. No webhooks for object storage in MVP.

---

## 19. Failure Handling

| Failure | Handling |
|---------|----------|
| Provider 5xx / timeout | Retry 2 times with backoff; return 503 to client if upload. |
| Key not found (404) | Return 404 to client; log. |
| Quota exceeded | Return 507 or 503; alert. |

---

## 20. Retry Strategy

- **Upload**: Retry 2 times with exponential backoff on 5xx and network errors. **Download**: Optional retry for 5xx when generating signed URL (no upload).

---

## 21. Rate Limiting / Quota Considerations

- **Provider**: Bucket limits and request rate. Limit upload size (e.g. 10MB for photos); rate limit upload endpoints per user.

---

## 22. Security / Compliance Requirements

- **Credentials**: In env/vault; never in client. **Signed URLs**: Short expiry; do not expose secret. **PII**: User content in private path; access only with auth. **Retention**: Align with BR-4 and deletion (BFR-008): delete objects when user deletes data.

---

## 23. Auditability / Logging Requirements

- Log: Put/Delete (key, user_id, no body); Get failures. Do not log full object content.

---

## 24. Observability / Monitoring

- **Metrics**: Put/Get count; error rate; latency. **Alerts**: Error rate; quota approaching.

---

## 25. UI / UX Implications

- **Upload**: Progress indicator; max size message; error “Upload failed. Try again.” **Playback**: Audio/video URLs load in client; handle 404 (e.g. “Media unavailable”).

---

## 26. Admin / Operations Implications

- **Lifecycle**: Optional lifecycle rule to delete or archive old objects. **Backup**: Provider replication; our DB backup for keys.

---

## 27. API / Adapter Design

- **Interface**: `StorageAdapter.put(key, body, contentType) → key`; `get(key) → stream`; `getSignedUrl(key, expiry) → url`; `delete(key)`. Implementations: S3Adapter, AzureBlobAdapter, MockStorageAdapter (local or in-memory).

---

## 28. Event / Async Flow Design

- **Upload**: Can be sync (request waits for put) or async (queue upload job; return job id; client polls or webhook for completion). Phase 1: sync upload for small files (photos).

---

## 29. Data Persistence Requirements

- **DB**: Store key (path) in content, activity, or session tables. **Storage**: Object at key; metadata (content-type) in provider.

---

## 30. Local Development Setup

- **MinIO**: `docker run -p 9000:9000 minio/minio server /data`; set S3_ENDPOINT=http://localhost:9000, S3_BUCKET=dev, AWS_ACCESS_KEY=minioadmin, AWS_SECRET_KEY=minioadmin. Create bucket via UI or CLI.
- **Mock**: MockStorageAdapter writes to ./storage or in-memory map; no external service.

---

## 31. Testing Requirements

- **Unit**: Mock adapter; assert put returns key; getSignedUrl returns URL with expiry. **Integration**: With MinIO or test bucket: put then get; delete then get 404.

---

## 32. Rollout / Feature Flag Strategy

- **Feature flag**: “reflection_photo_upload_enabled” to gate upload. Storage provider switch via config.

---

## 33. Example Scenarios

**Lesson media**: Content table has media_key=lessons/abc/image.jpg; API returns CDN_BASE_URL + media_key or signed URL. **Reflection photo**: User uploads → put user/u123/reflection/2025-03-14.jpg → save in activity → return URL in GET /v1/reflection.

---

## 34. Edge Cases

- **Duplicate key**: Overwrite (same key) or use versioned key (timestamp/uuid). **Large file**: Reject over limit (e.g. 10MB); return 413. **Content-type**: Validate image/audio types; reject executable.

---

## 35. Recommended Technical Design

- **StorageService**: put, get, getSignedUrl, delete; uses StorageAdapter. Key naming: `{type}/{id}/{optional_subpath}` (e.g. user/{user_id}/reflection/{date}.jpg). **CDN**: Public bucket for lesson media; private for user content with signed URLs.

---

## 36. Suggested Implementation Phasing

- **Phase 1**: Adapter (S3 or Azure); put/get/signed URL; lesson media URLs from config or DB key; mock or MinIO for local. **Phase 2**: User photo upload (reflection); retention and deletion on account delete. **Phase 3**: Optional direct client upload (presigned POST).

---

## 37. Summary

**Object storage** is **strategy-based** (S3-compatible or Azure Blob), **EU**. Backend-only; keys in DB; CDN or signed URLs to client. **Local**: MinIO or mock. Security: credentials in env; signed URL expiry; retention aligned with BFR-008. Required for lesson media and optional user content (reflection, audio).
