#!/usr/bin/env node
/**
 * BUSAN.11 V46 Realtime Database backup: explicit single-target READ-ONLY export.
 * This utility never calls firebase database:set/update/push/remove.
 * Password-protected .enc archives stay outside the repository; no plaintext files.
 * Run `node scripts/backup-firebase-rtdb.mjs --help` before attempting production access.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { once } from 'node:events';

const PROJECT = 'busan-trip-2026-4148f';
const INSTANCE = 'busan-trip-2026-4148f-default-rtdb';
const MAGIC = Buffer.from('BUSAN11_RTDB_AES256GCM_V1\n', 'ascii');
const SALT_SIZE = 16;
const IV_SIZE = 12;
const TAG_SIZE = 16;
const HEADER_SIZE = MAGIC.length + SALT_SIZE + IV_SIZE;
const MAX_VERIFY_BYTES = 256 * 1024 * 1024; // Offline JSON validation bound.

function help() {
  console.log(`BUSAN.11 | encrypted Firebase Realtime Database backup

Commands:
  --export --out /absolute/private/backup.rtdb.enc
    Requires prior Firebase CLI authentication and BUSAN11_BACKUP_PASSPHRASE.
    Runs ONLY: firebase database:get / --project ${PROJECT} --instance ${INSTANCE}

  --verify --file /absolute/private/backup.rtdb.enc
    Offline-only: validate encryption, authentication tag and root JSON structure.

Backup scope: Firebase RTDB only. Device localStorage, IndexedDB photos and browser
private-ledger data need separate backup. Never put archives in the repository,
GitHub Actions artifacts, or a shared/public/cloud workspace.
`);
}

function requirePassphrase() {
  const p = process.env.BUSAN11_BACKUP_PASSPHRASE;
  if (typeof p !== 'string' || Buffer.byteLength(p, 'utf8') < 16) {
    throw new Error('BUSAN11_BACKUP_PASSPHRASE must be set securely and be at least 16 UTF-8 bytes.');
  }
  return p;
}

function outputOutsideRepo(file) {
  if (!isAbsolute(file)) throw new Error('Output must be an absolute path.');
  if (!file.endsWith('.rtdb.enc')) throw new Error('Output filename must end with .rtdb.enc.');
  const out = resolve(file);
  const cwd = resolve(process.cwd());
  const rel = relative(cwd, out);
  if (rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel))) {
    throw new Error('Refusing to save sensitive backup inside the GitHub repository.');
  }
  return out;
}

async function writeChunk(output, data) {
  if (!data.length) return;
  if (!output.write(data)) await once(output, 'drain');
}

async function encryptedExport(file) {
  const outPath = outputOutsideRepo(file);
  const passphrase = requirePassphrase();
  await mkdir(dirname(outPath), { recursive: true, mode: 0o700 });
  const salt = randomBytes(SALT_SIZE);
  const iv = randomBytes(IV_SIZE);
  const cipher = createCipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
  let output;
  let child;
  let created = false;
  try {
    output = createWriteStream(outPath, { flags: 'wx', mode: 0o600 });
    await once(output, 'open');
    created = true;
    await writeChunk(output, Buffer.concat([MAGIC, salt, iv]));
    // Hard-code the read-only operation and expected project/instance. No CLI passthrough.
    child = spawn('firebase', ['database:get', '/', '--project', PROJECT, '--instance', INSTANCE], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: process.env
    });
    // Keep CLI stderr out of logs: it may include account or project details.
    child.stderr.resume();
    const exit = once(child, 'close');
    const plaintextHash = createHash('sha256');
    let plaintextBytes = 0;
    for await (const chunk of child.stdout) {
      plaintextBytes += chunk.length;
      plaintextHash.update(chunk);
      await writeChunk(output, cipher.update(chunk));
    }
    const [exitCode] = await exit;
    if (exitCode !== 0 || !plaintextBytes) throw new Error('Firebase read-only export failed or returned no bytes. Check CLI authentication and project access.');
    await writeChunk(output, cipher.final());
    await writeChunk(output, cipher.getAuthTag());
    output.end();
    await once(output, 'finish');
    output = null;
    const verified = await inspectArchive(outPath, passphrase);
    console.log(JSON.stringify({ result: 'encrypted_export_verified', project: PROJECT,
      instance: INSTANCE, archive: outPath, encryptedBytes: (await stat(outPath)).size,
      jsonBytes: verified.jsonBytes, topLevelCount: verified.topLevelCount,
      sha256: verified.sha256, plaintextSha256: plaintextHash.digest('hex') }));
  } catch (error) {
    child?.kill();
    output?.destroy();
    // Do not leave an incomplete encrypted archive that might be mistaken for a verified backup.
    if (created) await rm(outPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function inspectArchive(file, passphrase = requirePassphrase()) {
  const size = (await stat(file)).size;
  if (size <= HEADER_SIZE + TAG_SIZE || size > MAX_VERIFY_BYTES) {
    throw new Error('Invalid archive size or offline verification limit exceeded.');
  }
  const archive = await readFile(file);
  if (!archive.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Unsupported backup archive format.');
  const salt = archive.subarray(MAGIC.length, MAGIC.length + SALT_SIZE);
  const iv = archive.subarray(MAGIC.length + SALT_SIZE, HEADER_SIZE);
  const tag = archive.subarray(-TAG_SIZE);
  const ciphertext = archive.subarray(HEADER_SIZE, -TAG_SIZE);
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
  decipher.setAuthTag(tag);
  const cleartext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  let parsed;
  try { parsed = JSON.parse(cleartext.toString('utf8')); }
  catch { throw new Error('Decrypted archive is not valid JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Object.keys(parsed).length) {
    throw new Error('Realtime Database root must be a nonempty JSON object.');
  }
  return { jsonBytes: cleartext.length, topLevelCount: Object.keys(parsed).length,
    sha256: createHash('sha256').update(archive).digest('hex') };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) return help();
  if (args.length !== 3 || !['--export', '--verify'].includes(args[0]) ||
      !['--out', '--file'].includes(args[1]) ||
      (args[0] === '--export' && args[1] !== '--out') ||
      (args[0] === '--verify' && args[1] !== '--file')) throw new Error('Use --help for command syntax.');
  if (args[0] === '--export') return encryptedExport(args[2]);
  const verified = await inspectArchive(resolve(args[2]));
  console.log(JSON.stringify({ result: 'offline_archive_verified', archive: resolve(args[2]), ...verified }));
}

main().catch(error => {
  console.error('BUSAN.11 backup validation FAILED:', error.message);
  process.exitCode = 1;
});
