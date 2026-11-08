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
5. **Isolated restore is now implemented, separate from the export utility.** Run the encrypted archive only against a **disposable local Realtime Database emulator** on loopback 127.0.0.1; the verify command has a fixed demo-only namespace `demo-busan11-v46-restore`, refuses arbitrary endpoints, and makes a JSON data digest comparison after emulator readback. Example (only on the owner's trusted private machine after obtaining a real encrypted archive):
   - Start the database emulator using `firebase emulators:start --only database --project demo-busan11-v46-restore --config tests/v46-firebase-restore-emulator.json`.
   - From a separate trusted shell with `BUSAN11_BACKUP_PASSPHRASE` securely set, run `node scripts/verify-firebase-emulator-restore.mjs --emulator-restore --file /PRIVATE/PATH/DATE.rtdb.enc --port 9000`.
   - Confirm the result says `isolated_emulator_restore_verified` and record only the **non-sensitive** digest and source/archive counts; never copy real source JSON or passphrase into GitHub or logs.
   - The emulator's test database intentionally has open TEST rules under `tests/v46-firebase-restore-rules.json`; those rules are **never deployed** to production. The restore script does not and cannot restore production.
6. Independently back up device **localStorage**, encrypted personal ledger, pending offline queue, and **IndexedDB** shopping photos (these are NOT part of Firebase RTDB export). Confirm compatibility and restore on separate storage before GO.
7. Never claim final backup PASS before actual owner data and its offline restore evidence are checked. If project access or required pieces are missing, stay **NO-GO**.

## CI boundaries

`tests/rtdb-backup.test.mjs` replaces the `firebase` CLI with a **synthetic local executable**, verifying fixed read-only command, AES-256-GCM archival round trip, tamper/wrong password failures, no overwrite, repository path protection and cleanup on read failure. No CI job reads the live database or keeps user backups as artifacts.

## Evidence boundary (2026-10-22)

- Synthetic fixture read / encrypt / decrypt / restore / hash verification can pass in CI **without any Firebase account credentials or production data**.
- The dedicated GitHub Action `V46 RTDB Encrypted Backup / Emulator Restore Gate` runs mock-HTTP safety assertions and the genuine local Firebase RTDB emulator using a `demo-` project only. Its success is **not proof of an owner's actual production backup or real-data restore**.
- Final data safety stays **NO-GO** until the owner's live RTDB is exported in a trusted authorized environment, archive integrity is verified, a real encrypted archive is tested against local demo emulator without uploading it to CI, and the owner's browser-only local data / IndexedDB recovery is covered.
- Galaxy S25 V46 interface OWNER PASS is already separately recorded and must not be invalidated or repeated merely because this data backup gate is pending.
