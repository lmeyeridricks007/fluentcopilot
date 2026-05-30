# Local setup — Azure pronunciation assessment

## Environment variables

### Server (Azure Functions / `backend/local.settings.json`)

| Variable | Values | Purpose |
|----------|--------|---------|
| `PRONUNCIATION_MODE` | `off` \| `mock` \| `azure` | **mock** = end-to-end UI without Azure; **azure** = real SDK; **off** = endpoint returns no assessment. |
| `AZURE_SPEECH_KEY` | Speech resource key | Required when `PRONUNCIATION_MODE=azure`. |
| `AZURE_SPEECH_REGION` | e.g. `westeurope` | Required when `PRONUNCIATION_MODE=azure`. |
| `AZURE_SPEECH_LOCALE` | Default `nl-NL` | BCP-47 locale passed to recognition + assessment. |

### Frontend (`.env.local` etc.)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Must point at local Functions (e.g. `http://localhost:7071`) for calls to `/api/speech/...`. |
| `NEXT_PUBLIC_SPEECH_AUDIO_ASSESSMENT` | Set to `0` to **never** call pronunciation assessment from the client. Default: enabled (calls API; server may still skip). |
| `NEXT_PUBLIC_SPEECH_PRONUNCIATION_EVAL` | Transcript-only **LLM** hints (browser path / legacy). Default on; set `0` to hide. |

## Quick start (no Azure account)

1. In `backend/local.settings.json`, set `"PRONUNCIATION_MODE": "mock"`.
2. Leave `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` empty.
3. Run the API and app; record in Talk with **server** speech mode — after stop, you should see **“How you sounded”** with mock scores.

## Real Azure scoring — create the resource and get key + region

FluentCopilot expects a **single-region Speech** resource (standard Speech service), not a token from a different product. The SDK uses **subscription key + region** (`SpeechConfig.fromSubscription`).

### 1. Create the Speech resource (Azure Portal)

1. Sign in to the [Azure Portal](https://portal.azure.com).
2. In the top search bar, type **Speech** and open **Speech** in the marketplace (publisher: Microsoft — often titled **Speech** or **Azure AI Speech** depending on portal wording).  
   - If you do not see it, try **Create a resource** → search **speech** → choose the **Speech** service (speech-to-text, text-to-speech, neural voices, etc.).
3. Click **Create** and fill in:
   - **Subscription** — your Azure subscription.
   - **Resource group** — create new or use an existing one.
   - **Region** — pick a region close to you or your users (e.g. **West Europe**). This choice **is** the region you will put in `AZURE_SPEECH_REGION` (see below).
   - **Name** — a unique name for the resource (e.g. `fc-speech-dev`).
   - **Pricing tier** — **Free F0** is enough to try pronunciation assessment; paid tiers for heavier use.
4. **Review + create**, then wait until deployment finishes. Click **Go to resource**.

**Note:** You can also create an **Azure AI services** multi-service resource that includes Speech; for this app the dedicated **Speech** resource is the simplest path.

### 2. Where to find the **key** (API key)

1. Open your **Speech** resource in the portal.
2. In the left menu, under **Resource Management**, click **Keys and Endpoint** (sometimes labeled **Keys and endpoint**).
3. You will see **KEY 1** and **KEY 2** (two keys for rotation). Either works.
4. Click **Show** next to **Key 1**, then **Copy to clipboard**.
5. Put that string in **`AZURE_SPEECH_KEY`** in `local.settings.json` (local) or in **Application settings** / **Configuration** for your deployed Function App.

**Security:** Do not commit real keys to Git. Use `local.settings.json` only locally (it should stay in `.gitignore` if your repo ignores it) or use Key Vault / managed identity in production.

### 3. Where to find the **region** (exact value for `AZURE_SPEECH_REGION`)

The Speech SDK expects the **region short name**, not a full URL.

**Option A — from the same “Keys and Endpoint” blade**

- On **Keys and Endpoint**, find **Location / Region**. The portal often shows a value like **`westeurope`**, **`eastus`**, **`northeurope`** — that lowercase identifier (no spaces) is what you put in **`AZURE_SPEECH_REGION`**.

**Option B — from the endpoint URL**

- On the same page, **Endpoint** may look like:  
  `https://westeurope.api.cognitive.microsoft.com/`  
  The first hostname segment (**`westeurope`** in this example) is the region string for `AZURE_SPEECH_REGION`.

**Option C — from Overview**

- Open **Overview** for the resource. **Location** is shown (e.g. “West Europe”). The portal sometimes shows the friendly name; the **Keys and Endpoint** page is more reliable for the exact API region string.

**Common mistakes**

- Using **`https://...`** or the full endpoint as `AZURE_SPEECH_REGION` — wrong; use only the region id, e.g. `westeurope`.
- Using a **different** region than where the resource was created — keys are bound to that region; they must match.
- Mixing up **OpenAI Azure** endpoint keys with **Speech** keys — they are different services.

### 4. Wire it into FluentCopilot

1. Set **`AZURE_SPEECH_KEY`** = Key 1 (or Key 2).  
2. Set **`AZURE_SPEECH_REGION`** = the region id (e.g. `westeurope`).  
3. Set **`AZURE_SPEECH_LOCALE`** = `nl-NL` (or another BCP-47 locale if you test other languages).  
4. Set **`PRONUNCIATION_MODE`** = **`azure`**.  
5. Restart the Azure Functions host so environment variables reload.

If something is wrong (wrong key, wrong region, quota), the API still returns HTTP 200 with **`assessment: null`** and **caveats** so the app does not crash; check Function logs for details.

## API smoke test

`POST /api/speech/pronunciation-assessment` with JSON:

```json
{
  "audioBase64": "<base64 webm>",
  "mimeType": "audio/webm;codecs=opus",
  "transcript": "Ik wil graag een kaartje.",
  "expectedText": null,
  "assessmentMode": "open_response",
  "locale": "nl-NL"
}
```

For `reference` mode, send a non-empty `expectedText` and set `assessmentMode` to `reference`.

## Caveats

- **Open response**: reference text is the **transcript**; scores are useful feedback but not the same as repeating a fixed line from a phrasebook.
- **Codec / browser**: if Azure rejects a clip, check `mimeType` and try a shorter recording.
