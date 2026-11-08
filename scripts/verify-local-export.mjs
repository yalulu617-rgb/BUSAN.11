#!/usr/bin/env node
// BUSAN.11 local-only export validation against a demo Firebase RTDB emulator.
// NEVER accepts arbitrary URLs, projects, credentials or production endpoints.
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

const MAX_BYTES = 128 * 1024 * 1024;
const NAMESPACE = 'demo-busan11-v46-restore';
const URL = `http://127.0.0.1:9000/.json?ns=${NAMESPACE}`;
const dataPath = process.env.BUSAN11_LOCAL_EXPORT_PATH;
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function sha256(v) { return createHash('sha256').update(v).digest('hex'); }
async function main() {
  if (!dataPath || !isAbsolute(dataPath) || !dataPath.toLowerCase().endsWith('.json'))
    throw Error('Please choose a local absolute JSON export path in the Windows file chooser.');
  const fullPath = resolve(dataPath);
  const info = await stat(fullPath);
  if (!info.isFile() || !info.size || info.size > MAX_BYTES) throw Error('Backup missing, empty or exceeds local safe size limit.');
  const bytes = await readFile(fullPath);
  let original;
  try { original = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')); }
  catch { throw Error('Export is not valid UTF-8 JSON.'); }
  if (!original || typeof original !== 'object' || Array.isArray(original) || Object.keys(original).length === 0)
    throw Error('Realtime Database JSON root is missing or empty.');
  const sourceDigest = sha256(canonical(original));
  const controller = AbortSignal.timeout(90000);
  const opts = { redirect:'error', signal:controller, headers:{'Content-Type':'application/json'} };
  // Only the isolated local Firebase Emulator is written. No external domain.
  const write = await fetch(URL, {...opts, method:'PUT', body:JSON.stringify(original)});
  if (!write.ok) throw Error(`Local emulator write failed (HTTP ${write.status}).`);
  await write.arrayBuffer();
  const read = await fetch(URL,{...opts,method:'GET'});
  if (!read.ok) throw Error(`Local emulator read failed (HTTP ${read.status}).`);
  const restored = await read.json();
  const restoredDigest = sha256(canonical(restored));
  if (sourceDigest !== restoredDigest) throw Error('RESTORE FAILED: roundtrip database content differs.');
  const safeReport = {result:'LOCAL_RESTORE_PASS',scope:'localhost Firebase demo emulator only',
    sourceFileBytes:bytes.length, rootKeyCount:Object.keys(original).length,
    backupFileSha256:sha256(bytes), verifiedDataSha256:sourceDigest,
    productionRead:false,productionWrite:false};
  console.log('\n================ BUSAN.11 ================');
  console.log('LOCAL RESTORE PASS - backup JSON matches emulator readback.');
  console.log(JSON.stringify(safeReport,null,2));
  console.log('==========================================\n');
}
main().catch(error=>{console.error('LOCAL RESTORE NO-GO:',error.message);process.exitCode=1;});
