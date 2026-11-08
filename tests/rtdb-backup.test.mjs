import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const script = resolve(import.meta.dirname, '../scripts/backup-firebase-rtdb.mjs');
const workdir = mkdtempSync(join(tmpdir(), 'busan11-rtdb-isolated-'));
const bin = join(workdir, 'bin');
mkdirSync(bin, { recursive: true });
const firebase = join(bin, 'firebase');
const pass = 'isolated-test-passphrase-long';
const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, BUSAN11_BACKUP_PASSPHRASE: pass,
    BUSAN11_TEST_ARGS: join(workdir, 'firebase-args.txt') };
const cli = `#!/usr/bin/env node
const fs=require('node:fs');
fs.writeFileSync(process.env.BUSAN11_TEST_ARGS, process.argv.slice(2).join(' '));
process.stdout.write(JSON.stringify({busan_v36_tickets:{mock:{title:'never real'}},busan_v36_shop:{}}));
`;
writeFileSync(firebase, cli, { mode: 0o755 });

const run = (args, customEnv = env) => spawnSync(process.execPath, [script, ...args], {
  cwd: resolve(import.meta.dirname, '..'),
  env: customEnv, encoding: 'utf8', timeout: 30000
});

test('sealed export: only read operation, fixed project/instance, no plaintext on disk', () => {
  const path = join(workdir, 'healthy.rtdb.enc');
  const exportResult = run(['--export', '--out', path]);
  assert.equal(exportResult.status, 0, exportResult.stderr);
  const actualArgs = readFileSync(env.BUSAN11_TEST_ARGS, 'utf8');
  assert.equal(actualArgs, 'database:get / --project busan-trip-2026-4148f --instance busan-trip-2026-4148f-default-rtdb');
  assert.ok(existsSync(path));
  assert.ok(!readFileSync(path).includes(Buffer.from('never real')));
  const verifyResult = run(['--verify', '--file', path]);
  assert.equal(verifyResult.status, 0, verifyResult.stderr);
  const info = JSON.parse(verifyResult.stdout);
  assert.equal(info.topLevelCount, 2);
  assert.ok(info.sha256.length === 64);
});

test('wrong passphrase and tampering are rejected offline', () => {
  const path = join(workdir, 'healthy.rtdb.enc');
  const wrong = run(['--verify', '--file', path], { ...env, BUSAN11_BACKUP_PASSPHRASE: 'other-long-test-password' });
  assert.notEqual(wrong.status, 0);
  const damagedPath = join(workdir, 'tampered.rtdb.enc');
  const altered = readFileSync(path);
  altered[altered.length - 25] ^= 0x31;
  writeFileSync(damagedPath, altered);
  const damaged = run(['--verify', '--file', damagedPath]);
  assert.notEqual(damaged.status, 0);
});

test('existing backup is neither overwritten nor removed', () => {
  const path = join(workdir, 'existing.rtdb.enc');
  writeFileSync(path, 'valuable existing archive');
  const attempt = run(['--export', '--out', path]);
  assert.notEqual(attempt.status, 0);
  assert.equal(readFileSync(path, 'utf8'), 'valuable existing archive');
});

test('export refuses repository output and does not invoke Firebase', () => {
  const path = resolve(import.meta.dirname, '../do-not-write.rtdb.enc');
  const attempt = run(['--export', '--out', path]);
  assert.notEqual(attempt.status, 0);
  assert.equal(existsSync(path), false);
});

test('Firebase read error leaves no misleading encrypted archive', () => {
  const errorCli = `#!/usr/bin/env node\nprocess.stderr.write('Unauthorized');process.exit(4);\n`;
  writeFileSync(firebase, errorCli, { mode: 0o755 });
  const path = join(workdir, 'failed.rtdb.enc');
  const attempt = run(['--export', '--out', path]);
  assert.notEqual(attempt.status, 0);
  assert.equal(existsSync(path), false);
});
