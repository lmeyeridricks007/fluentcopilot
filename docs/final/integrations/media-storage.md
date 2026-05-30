# Media Storage Integration

## Document Info

| Attribute | Value |
|-----------|--------|
| Version | 1 |
| Status | Draft |

---

## 1. Purpose

Specifies **media storage** for user photo uploads (reflection FD-07), audio (temporary for pronunciation/voice), and lesson media. Covers S3-compatible or Azure Blob, signed URLs, retention lifecycle, and moderation considerations.

---

## 2. Why Needed

- FD-07: User uploads photos for daily reflection. Voice/pronunciation may store audio temporarily (Data doc). Lesson/listening media served from CDN or same storage.

---

## 3. Decision Status

| Item | Status |
|------|--------|
| Object storage | **Required now** — S3-compatible (e.g. AWS S3, MinIO) or Azure Blob |
| EU region | **Required** (BNFR-001) |
| Signed URLs | **Required** for private content (user photos, temporary audio) |

---

## 4. Recommended Provider

- **Azure Blob Storage** or **AWS S3** in EU region (e.g. westeurope, eu-west-1). Use single bucket/container with key prefix per type: `uploads/photos/{user_id}/{id}`, `audio/temp/{session_id}`, `content/lessons/{path}`. Lifecycle rules for temp audio (delete after 24–48 h).

---

## 5. Credentials

| Credential | Purpose | Where |
|------------|---------|--------|
| `INTEGRATION_MEDIA_STORAGE_CONNECTION_STRING` (Azure) or `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` | Upload, delete, sign URLs | Backend only |

---

## 6. Frontend Responsibilities

- **Upload**: For photos, frontend calls backend `POST /v1/upload/photo` (multipart); backend uploads to storage and returns URL (signed or public). Or backend returns **signed upload URL** (PUT); frontend PUTs file to that URL; then frontend calls backend to confirm. Prefer backend-upload (simpler; backend can validate type/size and run moderation).
- **Display**: Backend returns signed download URL (GET) with short expiry (e.g. 1 h); frontend uses as `src`. Never expose storage credentials to frontend.

---

## 7. Backend Responsibilities

- **Upload**: Validate content-type (image/jpeg, image/png) and size (e.g. 5 MB max). Generate key: `uploads/photos/{user_id}/{uuid}.jpg`. Upload to storage. Optionally run image moderation (content-safety doc) before or after upload. Save key or URL in DB (reflection entry). Return signed URL for display.
- **Signed URL**: Generate GET URL with expiry (e.g. 3600 s). Use provider SDK (e.g. Azure `generateBlobSASQueryParameters`, AWS `getSignedUrl`).
- **Lifecycle**: Configure rule: delete objects under `audio/temp/` after 1 day. Photos: retain per Data doc (e.g. 90 days); on user delete account, delete objects by prefix `uploads/photos/{user_id}/`.
- **Lesson media**: Store in `content/lessons/` or serve from CDN; public or signed per need.

---

## 8. Security and Moderation

- **Access**: Backend only has write/read; frontend never gets credentials. Signed URLs are read-only and time-limited.
- **Moderation**: User photos: run through image moderation (content-safety doc) before saving or displaying; reject if inappropriate (IS-018).

---

## 9. Retention and GDPR

- **Photos**: Retain per Data doc; delete on account deletion (BFR-008). Lifecycle or job to purge by user_id.
- **Temp audio**: Delete after 24–48 h (no long-term retention).

---

## 10. Failure Modes

- Upload failure: Retry once; return 503 to client. Storage unavailable: circuit breaker; return “Upload temporarily unavailable.”
- Signed URL expiry: Client requests new URL from backend if expired (e.g. GET /v1/reflection/entries/:id/photo-url).
