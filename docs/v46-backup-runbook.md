# BUSAN.11 | V46 production data safety gate

**Owner scope:** Realtime Database project `busan-trip-2026-4148f`, instance `busan-trip-2026-4148f-default-rtdb`.

## Responsibility

- ChatGPT / Codex: prepare, test, and run read-only code in a duly authorized environment; collect non-sensitive audit proof. Never merge or deploy.
- Owner: sign into Firebase in a trusted session and grant the required access; independently approve final release.
- Never ask the owner to paste a Firebase service-account private key, token, raw backup, or secret in chat, GitHub, build logs, or shared preview.

## Mandatory safety checks

1. Prior to access, verify **read-only** Firebase permissions and project/instance explicitly; script fixes `firebase database:get /` and forbids any write command. Use `firebase login` locally only in the owner's trusted environment; no secrets in CI.
2. Create a password-protected encrypted backup **outside** the repository and public/shared/cloud workspaces. Password `BUSAN11_BACKUP_PASSPHRASE` must remain in an authorized private execution environment, never in logs.
3. Execute `node scripts/backup-firebase-rtdb.mjs --export --out /ABSOLUTE/PRIVATE/SAFE-DIRECTORY/DATE.rtdb.enc` with authorized Firebase CLI and Node >=22.
4. The tool immediately checks archive authenticity and root JSON structure. Separately verify `node scripts/backup-firebase-rtdb.mjs --verify --file /ABSOLUTE/PRIVATE/SAFE-DIRECTORY/DATE.rtdb.enc` in an **offline** environment. Retain the validated archive in an owner-controlled secure location. Cloud ephemeral storage is NOT a durable owner backup.
5. Restore only into an isolated disposable test database/emulator (not production), using a separately reviewed restore process; verify exact data coverage and repeatable retrieval. The utility **does not** implement or authorize restoration.
6. Independently back up device **localStorage**, encrypted personal ledger, pending offline queue, and **IndexedDB** shopping photos (these are NOT part of Firebase RTDB export). Confirm compatibility and restore on separate storage before GO.
7. Never claim final backup PASS before actual owner data and its offline restore evidence are checked. If project access or required pieces are missing, stay **NO-GO**.

## CI boundaries

`tests/rtdb-backup.test.mjs` replaces the `firebase` CLI with a **synthetic local executable**, verifying fixed read-only command, AES-256-GCM archival round trip, tamper/wrong password failures, no overwrite, repository path protection and cleanup on read failure. No CI job reads the live database or keeps user backups as artifacts.
