# BUSAN.11 private photo vault — release gate

**Candidate only. Do not merge or route real albums here before account provisioning and live synthetic tests.**

This branch builds an actual backend rather than another ZIP UI. It preserves the exact selected file bytes, uses content-addressed object names, verifies both independent copies by SHA-256 before success, retries safely, and reads the other provider when the first is unavailable/corrupt. The browser client does not contain provider credentials. The existing Firebase member authentication is checked server-side; exactly two configured member UIDs can access this service. Originals and previously compressed ImgBB copies are distinct object types.

## Free-tier boundary
- Backblaze B2: 10 GB free storage; dedicated private bucket; app key restricted to that bucket, no delete rights, list/read/write files and list bucket capability.
- ImageKit Forever Free: 3 GB fixed DAM storage and 20 GB monthly bandwidth; dedicated account with no paid upgrade; private raw .bin assets, no resizing.
- Candidate caps: 9 GB / 2.7 GB respectively. Effective dual-copy capacity is **2.7 GB**, not 12 GB. Single file limit 24 MB. No automatic compressing, eviction, or upgrade. Provider billing controls and dedicated-account usage must be checked separately; server listing guard is not a guarantee of account-wide billing.
- Free quotas and platform service policies must be verified at activation. If actual originals exceed these limits, do not enable until a viable free alternative is established. No Google Drive photo use. Videos are outside this branch.

## Owner authorization — once only
A project owner needs to authorize the two storage accounts and a private server runtime. Configure the server's environment via its secret-management UI (not repository, browser, chat or Firebase).
Required environment names: B2_KEY_ID, B2_APP_KEY, B2_BUCKET_ID, B2_BUCKET_NAME, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_ENDPOINT, FIREBASE_API_KEY, FIREBASE_MEMBER_UIDS. The server is run as a single Node 22 instance using `npm install` and `npm start` in photo-vault/. No real credentials committed. Do not bind payment or enable a paid plan without explicit approval.

## Required acceptance before publication
1. Test with synthetic non-private binary bytes on both live free accounts. Confirm unauthenticated retrieval denied, both SHA-256 hashes equal, forced outage/failover succeeds, duplicate upload doesn't add versions, limits reject before writes.
2. Connect candidate browser client to the authorized backend and existing IndexedDB upload path. Upload exact originals before reporting synced. Preserve all current metadata and GPS. ImgBB may continue to serve thumbnails only; never call a thumbnail the original. Validate both devices, on-demand original retrieval and fallback; no thumbnail provider failure may hide a successfully stored original.
3. Migrate existing records safely: read current Firebase album with member authentication, take a read-only inventory, retrieve existing hosted copies server-side with strict URL allowlist and placeholder detection, preserve their real quality as legacy-hosted. Existing exact originals can be recovered only from available original files, never upscaled from ImgBB. Do not delete/change prior records until independently verified; do not equate URL count with stored images.
4. Verify actual per-provider storage totals and photograph count, then release. Google Drive video support is separate.
5. Keep existing production V46.4.15 untouched until every applicable real acceptance gate passes.

## Current scope
The backend core, B2/ImageKit adapters, authenticated HTTP service, browser transport and synthetic tests are present. Live provider configuration, full UI wiring, migration and video integration are **not complete**. No actual user photos have been accessed. No guarantee of indefinite free storage or permanent availability.
