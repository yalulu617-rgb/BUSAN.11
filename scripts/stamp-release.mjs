import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function readServiceWorkerCacheName(source) {
  const match = source.match(/\bconst\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('Unable to find Service Worker CACHE_NAME');
  return match[1];
}

export async function stampReleaseMetadata({
  releasePath = 'data/release.json',
  serviceWorkerPath = 'sw.js',
  gitSha,
  now = new Date()
}) {
  if (!/^[0-9a-f]{40}$/i.test(gitSha || '')) {
    throw new Error('A full 40-character Git commit SHA is required');
  }

  const [releaseSource, serviceWorkerSource] = await Promise.all([
    readFile(releasePath, 'utf8'),
    readFile(serviceWorkerPath, 'utf8')
  ]);
  const release = JSON.parse(releaseSource);
  const cacheVersion = readServiceWorkerCacheName(serviceWorkerSource);

  release.gitCommit = gitSha;
  release.cacheVersion = cacheVersion;
  release.buildDate = now.toISOString().slice(0, 10);
  await writeFile(releasePath, `${JSON.stringify(release, null, 2)}\n`, 'utf8');
  return release;
}

const invokedPath = process.argv[1] ? fileURLToPath(import.meta.url) : '';
if (invokedPath === process.argv[1]) {
  const gitSha = process.argv[2] || process.env.GITHUB_SHA;
  stampReleaseMetadata({ gitSha })
    .then(release => {
      console.log(`Stamped ${release.appVersion} release metadata for ${release.gitCommit}`);
      console.log(`Service Worker cache: ${release.cacheVersion}`);
    })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
