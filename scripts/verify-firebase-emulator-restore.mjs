#!/usr/bin/env node
/**
 * BUSAN.11 V46: decrypt and compare an RTDB archive using ONLY a disposable,
 * loopback Firebase Realtime Database emulator. NEVER connects to production.
 * For full-device backup see docs/v46-backup-runbook.md.
 */
import { createDecipheriv, createHash, scryptSync } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const MAGIC = Buffer.from('BUSAN11_RTDB_AES256GCM_V1\n', 'ascii');
const SALT_SIZE = 16;
const IV_SIZE = 12;
const TAG_SIZE = 16;
const HEADER_SIZE = MAGIC.length + SALT_SIZE + IV_SIZE;
const MAX_ARCHIVE = 256 * 1024 * 1024;
const NAMESPACE = 'demo-busan11-v46-restore';

const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key =>
    JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
};
const fingerprint = value => createHash('sha256').update(canonical(value)).digest('hex');

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  if (args.length !== 5 || args[0] !== '--emulator-restore' || args[1] !== '--file' ||
      args[3] !== '--port' || !/^\d{4,5}$/.test(args[4])) {
    throw Error('Only --emulator-restore --file /PRIVATE/ARCHIVE.rtdb.enc --port 9000 is supported.');
  }
  const port = Number(args[4]);
  if (port < 1024 || port > 65535) throw Error('Invalid localhost emulator port.');
  const path = resolve(args[2]);
  if (!path.endsWith('.rtdb.enc')) throw Error('Only an encrypted .rtdb.enc archive is accepted.');
  return { path, port };
}

async function decryptArchive(path) {
  const pass = process.env.BUSAN11_BACKUP_PASSPHRASE;
  if (!pass || Buffer.byteLength(pass, 'utf8') < 16) throw Error('Backup passphrase unavailable in the trusted local environment.');
  const size = (await stat(path)).size;
  if (size <= HEADER_SIZE + TAG_SIZE || size > MAX_ARCHIVE) throw Error('Archive size invalid or beyond protected limit.');
  const archive = await readFile(path);
  if (!archive.subarray(0, MAGIC.length).equals(MAGIC)) throw Error('Unrecognized encrypted archive.');
  const salt = archive.subarray(MAGIC.length, MAGIC.length + SALT_SIZE);
  const iv = archive.subarray(MAGIC.length + SALT_SIZE, HEADER_SIZE);
  const cipherText = archive.subarray(HEADER_SIZE, -TAG_SIZE);
  const authTag = archive.subarray(-TAG_SIZE);
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(pass, salt, 32), iv);
  decipher.setAuthTag(authTag);
  let decoded;
  try {
    decoded = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    const parsed = JSON.parse(decoded.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length === 0)
      throw Error('Backup root must contain at least one database key.');
    return { root: parsed, archiveHash: createHash('sha256').update(archive).digest('hex') };
  } catch (error) {
    if (/authenticate data|Unsupported state/.test(error.message)) throw Error('Archive integrity/password check failed.');
    throw error;
  } finally { decoded?.fill(0); }
}

async function requestEmulator(port, method, json) {
  // Hard-coded HTTP + numeric 127.0.0.1 + demo-* namespace. No caller URL or
  // Firebase credentials are ever forwarded; redirects and outside hosts denied.
  const url = `http://127.0.0.1:${port}/.json?ns=${NAMESPACE}`;
  const res = await fetch(url, {
    method, redirect: 'error', signal: AbortSignal.timeout(45000),
    headers: { 'Content-Type': 'application/json' },
    ...(method === 'PUT' ? { body: JSON.stringify(json) } : {})
  });
  if (!res.ok) throw Error(`Isolated emulator ${method} failed (HTTP ${res.status}).`);
  if (method === 'PUT') { await res.arrayBuffer(); return null; }
  const len = Number(res.headers.get('content-length'));
  if (len && len > MAX_ARCHIVE) throw Error('Emulator read exceeds size limit.');
  return await res.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.log('Usage: node scripts/verify-firebase-emulator-restore.mjs --emulator-restore --file /PRIVATE/backup.rtdb.enc --port 9000\nOnly writes to loopback Firebase RTDB emulator namespace demo-busan11-v46-restore.');
    return;
  }
  const backup = await decryptArchive(args.path);
  const before = fingerprint(backup.root);
  // Isolated demo namespace only. Intentional emulator write + independent readback.
  await requestEmulator(args.port, 'PUT', backup.root);
  const restored = await requestEmulator(args.port, 'GET');
  const after = fingerprint(restored);
  if (before !== after) throw Error('Isolated restore comparison FAILED: source and emulator readback differ.');
  console.log(JSON.stringify({result:'isolated_emulator_restore_verified',
    namespace:NAMESPACE, topLevelCount:Object.keys(backup.root).length,
    archiveSha256:backup.archiveHash, canonicalDataSha256:before,
    scope:'demo_emulator_only', productionRead:false, productionWrite:false}));
}

main().catch(error => {
  console.error('BUSAN.11 isolated restore gate FAILED:',error.message);
  process.exitCode = 1;
});
