import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stampReleaseMetadata } from '../scripts/stamp-release.mjs';

async function verifyReleaseStamp() {
  const directory = await mkdtemp(join(tmpdir(), 'busan-release-'));
  const releasePath = join(directory, 'release.json');
  const serviceWorkerPath = join(directory, 'sw.js');
  const gitSha = '0123456789abcdef0123456789abcdef01234567';

  await writeFile(releasePath, JSON.stringify({
    appVersion: 'V45',
    gitCommit: 'development',
    cacheVersion: 'generated-from-sw.js'
  }));
  await writeFile(serviceWorkerPath, "const CACHE_NAME = 'busan-trip-v45-test-cache';\n");

  const stamped = await stampReleaseMetadata({
    releasePath,
    serviceWorkerPath,
    gitSha,
    now: new Date('2026-09-09T00:00:00Z')
  });
  const persisted = JSON.parse(await readFile(releasePath, 'utf8'));

  assert.deepEqual(persisted, stamped);
  assert.equal(persisted.appVersion, 'V45');
  assert.equal(persisted.gitCommit, gitSha);
  assert.equal(persisted.cacheVersion, 'busan-trip-v45-test-cache');
  assert.equal(persisted.buildDate, '2026-09-09');

  await assert.rejects(
    stampReleaseMetadata({ gitSha: '4e27fd9' }),
    /full 40-character Git commit SHA/
  );
  console.log('Release metadata stamping assertions passed');
}

await verifyReleaseStamp();
