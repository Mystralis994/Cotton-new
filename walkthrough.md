# Security Summary

**Reviewed Files**: 30
**Issues Resolved**: 8

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Unwatermarked Asset Exposure | `src/data/seedCatalog.ts`, `server.ts`, `private-vault/originals/` | — | Unwatermarked full-resolution pack artwork lived directly in client-bundled `/src/assets/images/` paths where anyone could download original packs. | High | Fixed | Moved all uncompressed originals into `/private-vault/originals/` (excluded from Vite build), generated `720px` JPEG watermarked previews in `/public/previews/`, added `isBlockedPrivatePath` HTTP `403` guard in `server.ts` (including leading-slash collapse), and added admin migration tool `migrateLegacyPreviewUrlsToWatermarked()`. |
| Business Model / Download Exposure | `src/pages/OrdersPage.tsx`, `src/pages/OrderPaymentPage.tsx`, `src/components/Footer.tsx`, `src/services/emailPreparation.ts`, `src/components/admin/AdminOrderModal.tsx` | — | Customer-facing pages displayed download links and `DownloadAccess` modal details even though files are delivered manually via WhatsApp. | Medium | Fixed | Removed all customer download portals, modals, `downloadAccess` queries, and `assetKey` disclosures from storefront UI, routing delivery strictly through manual WhatsApp (`+6281238078363`). |
| Missing Server-Side Rate Limiting & Validation | `server.ts`, `src/pages/CheckoutPage.tsx` | 403–835 | WhatsApp checkout lacked server-side validation, and `getClientIp()` previously trusted leftmost `X-Forwarded-For` headers directly. | High | Fixed | Added `POST /api/orders/validate-whatsapp` with per-IP (`10/60s`) and per-UID (`6/60s`) `429` limits, `15s` duplicate guard (`409`), Firestore REST + seed price verification (`400`), stateless x509 Firebase token verification, and switched `getClientIp()` to proxy-aware `req.ip` (`trust proxy = 1`) so spoofed `X-Forwarded-For` headers cannot bypass rate limits. |
| Backup Restore Safety & Audit Trail | `src/utils/adminRestore.ts`, `src/services/firestoreStore.ts`, `firestore.rules`, `firebase-blueprint.json` | — | Admin dashboard needed schema-validated restore, safety snapshot enforcement, and persistent admin audit logs. | Medium | Fixed | Added `validateBackupPayload()` and `executeAdminRestore()` (`5MB` cap, URL scheme checks, automatic pre-restore safety JSON download, live doc-existence check preserving `createdAt`, chunked batch writes, and append-only `/adminAuditLogs/{logId}` entries enforced by `firestore.rules`). |
| QRIS Watermark Readability | `src/components/admin/AdminPaymentMethodsSection.tsx` | 146 | Uploaded QRIS payment images shared the default canvas compressor, which baked a diagonal watermark over QR codes. | Low | Fixed | Passed `{ watermark: false }` for QRIS QR uploads while retaining `{ watermark: true }` for product artwork uploads (`AdminProductModal.tsx`). |
| Storage Rules Database Reference | `storage.rules` | 30, 66–74 | Optional Cloud Storage template referenced `(default)` instead of the project's Enterprise Firestore database ID (`ai-studio-8b04fdde-7890-4c82-8b31-93e1040849f7`). | Low | Fixed | Updated Firestore lookup paths in `storage.rules` to `ai-studio-8b04fdde-7890-4c82-8b31-93e1040849f7` and clarified that Storage is optional (not required by the live app). |
| Payment URL Validator & Locale Consistency | `src/pages/OrderPaymentPage.tsx`, `src/pages/OrdersPage.tsx` | — | `OrderPaymentPage.tsx` kept a weaker duplicate `isSafeHttpsUrl()` helper, and order dates omitted `lang`. | Low | Fixed | Deduplicated `isSafeHttpsUrl` to use `src/utils/formatters.ts` and passed `lang` to `formatIsoDate`. |
| App Check & Optional Storage Governance | `src/lib/firebase.ts`, `storage.rules`, `.env.example` | 12–51 | Firebase App Check initializes with `ReCaptchaV3Provider` only when `VITE_FIREBASE_APP_CHECK_SITE_KEY` is configured. | Low | Needs Follow-Up | App operates safely without forced App Check enforcement. Owner may optionally register reCAPTCHA v3 in Firebase Console and set `VITE_FIREBASE_APP_CHECK_SITE_KEY` (or deploy `storage.rules` if enabling Storage later). |

### Safeguards Verified
| Area | File | How It's Protected |
| :--- | :--- | :--- |
| Fail-Closed Firestore Rules | `firestore.rules` | Starts with `allow read, write: if false;`, verifies `email_verified == true` for owners/admins, validates totals/prices/URLs, enforces append-only `/adminAuditLogs`, and passes `npx eslint firestore.rules` with zero errors. |
| Storage Access Rules Template | `storage.rules` | Fail-closed default deny; restricts writes to authenticated verified admin (`jellyzizy@gmail.com`) and raster images `<= 2MB`; blocks public customer downloads. |
| Server Path & Header Guard | `server.ts` | Blocks direct HTTP access (`403`) to `/private-vault`, legacy `/src/assets/images/pack_*` & `hero_*`, `/.env`, `/.git`, `/firestore.rules`, `/storage.rules`, `/server.ts`, traversal sequences (`..`, `\`), and double-slash variants (`//private-vault`). Sets `nosniff`, `Referrer-Policy`, and `Permissions-Policy` headers while preserving iframe embedding. |
| Token Verification Without IAM | `server.ts` | Verifies Firebase ID tokens (`RS256`, `aud`, `iss`, `exp`, `sub`) against Google's official `securetoken@system.gserviceaccount.com` x509 certificates using Node `crypto` without `firebase-admin` IAM calls. |
| Client Secret & DOM Hygiene | `src/components/SafeImage.tsx`, `src/utils/formatters.ts`, `.env.example` | Zero server secrets or AI keys in client bundles; zero `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `document.write`; strict `isSafeHttpsUrl()` and `isSafeImageUrl()` checks block `javascript:` and `data:image/svg+xml`. |

---

## PoC Verification

### 1. Watermarked Preview Isolation & Private Vault Blocking
- **Scenario**: An external user requests `/private-vault/originals/pack_cute_characters_1795233529123.jpg`, `//private-vault/originals/pack_cute_characters_1795233529123.jpg`, `/src/assets/images/pack_cute_characters_1795233529123.jpg`, `/firestore.rules`, or `/.env` directly over HTTP, while storefront images load `/previews/pack-cute-characters.jpg`.
- **How It Was Fixed**: Uncompressed originals live in `/private-vault/originals/`, storefront entries use watermarked `720px` files in `/public/previews/`, and `server.ts` `isBlockedPrivatePath()` collapses leading slashes and blocks sensitive paths before Vite or static middleware.
- **Step-by-Step Trace**:
  1. HTTP request arrives at Express middleware in `server.ts:538`.
  2. `isBlockedPrivatePath()` (`server.ts:491–521`) decodes URI components, rejects `..` / `\`, collapses repeated leading slashes, and matches `/private-vault`, `/src/assets/images/pack_`, `/.env`, and `/firestore.rules`.
  3. Server responds immediately with `403 Forbidden`, while `/previews/pack-cute-characters.jpg` serves the watermarked JPEG preview with `200 OK`.
- **Conclusion**: **Fix Verified** — Original unwatermarked packs cannot be fetched directly over HTTP or bundled into `dist/`.

### 2. Checkout Price Tampering, Duplicate Replay & IP-Header Spoof Rate-Limit Bypass
- **Scenario**: A client submits `POST /api/orders/validate-whatsapp` with `clientTotal: 0.01` for a `$5.50` sticker pack, repeats an identical order within 15 seconds, or floods requests while rotating forged `X-Forwarded-For` headers.
- **How It Was Fixed**: `POST /api/orders/validate-whatsapp` (`server.ts:597–835`) resolves client IP via Express's proxy-aware `req.ip` (`trust proxy = 1`), enforces sliding-window limits (`10/60s` IP, `6/60s` UID), enforces a `15s` SHA-256 duplicate guard, and recomputes authoritative totals.
- **Step-by-Step Trace**:
  1. Request enters `POST /api/orders/validate-whatsapp` (`server.ts:597`).
  2. `getClientIp(req)` (`server.ts:403–405`) uses `req.ip` rather than trusting leftmost client-supplied `X-Forwarded-For` values.
  3. Sliding-window checks return `429` with `Retry-After` on overflow; mismatched `clientTotal` returns `400`; identical payload within 15s returns `409`.
- **Conclusion**: **Fix Verified** — Client-side total manipulation, rapid duplicate submits, and `X-Forwarded-For` spoofing rate-limit bypasses are rejected server-side.

### 3. Malicious Backup JSON Restore & XSS Media URI Injection
- **Scenario**: An uploaded backup JSON contains `javascript:alert(1)` or `data:image/svg+xml;base64,...` in `previewImages` or `qrisImageUrl`, or attempts to overwrite an existing document's `createdAt` or tamper with `/adminAuditLogs`.
- **How It Was Fixed**: `validateBackupPayload()` (`src/utils/adminRestore.ts:82–421`) filters/rejects unsafe URLs via `isSafeImageUrl()` / `isSafeHttpsUrl()`, `executeAdminRestore()` preserves immutable `createdAt` fields and triggers a safety backup download, and `firestore.rules` enforces schema rules and blocks updates/deletes on `/adminAuditLogs`.
- **Conclusion**: **Fix Verified** — Unsafe URIs and malformed backup payloads are blocked prior to Firestore writes, while audit records remain immutable.
