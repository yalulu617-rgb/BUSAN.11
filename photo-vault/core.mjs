// Photo-vault core. Exact bytes, two independent stores, fail closed on capacity
// or verification failure. No album/Firebase mutation in this module.
import { createHash } from 'node:crypto';

export const MAX_PHOTO_BYTES = 24_000_000;
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export class VaultError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}
const validDigest = /^[0-9a-f]{64}$/;
const kinds = new Set(['original', 'legacy-hosted']);
const pathFor = (kind, digest) => {
  if (!kinds.has(kind) || !validDigest.test(digest)) throw new VaultError('INVALID_OBJECT', 400);
  return 'busan11-vault/' + kind + '/' + digest + '.bin';
};
export function createVault({ primary, secondary, primaryLimit = 9_000_000_000, secondaryLimit = 2_700_000_000 }) {
  if (!primary || !secondary || primary.provider === secondary.provider)
    throw new Error('Two independent storage providers are required');
  if (!Number.isSafeInteger(primaryLimit) || !Number.isSafeInteger(secondaryLimit) ||
      primaryLimit <= 0 || secondaryLimit <= 0 || primaryLimit > 9_000_000_000 ||
      secondaryLimit > 2_700_000_000) throw new Error('Invalid free-plan storage caps');
  const stores = [{ adapter: primary, limit: primaryLimit }, { adapter: secondary, limit: secondaryLimit }];
  // One single-instance writer. Usage is checked with provider listings, not
  // an in-memory counter. Dedicated accounts/buckets and provider free-plan caps
  // are required; this limit is not a substitute for provider billing controls.
  let tail = Promise.resolve();
  function serial(fn) {
    const next = tail.then(fn, fn); tail = next.catch(() => {}); return next;
  }
  async function verifiedRead(store, key, digest, size) {
    const bytes = await store.get(key);
    if (bytes === null) return null;
    if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES ||
        (size != null && bytes.length !== size) || hash(bytes) !== digest)
      throw new VaultError('STORED_BYTES_INVALID');
    return bytes;
  }
  async function save({ bytes, digest, kind = 'original' }) {
    const key = pathFor(kind, digest);
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_PHOTO_BYTES ||
        hash(bytes) !== digest) throw new VaultError('INVALID_PHOTO_BYTES', 400);
    return serial(async () => {
      // Inspect both before writing anything. If an existing object is corrupt,
      // do not overwrite or pretend it is a verified copy.
      const present = await Promise.all(stores.map(async ({adapter,limit}) => {
        const existing = await verifiedRead(adapter, key, digest, bytes.length);
        if (!existing) {
          const used = await adapter.usage();
          if (!Number.isSafeInteger(used) || used < 0)
            throw new VaultError('CAPACITY_UNCONFIRMED');
          if (used + bytes.length > limit) throw new VaultError('FREE_CAPACITY_EXCEEDED', 507);
        }
        return !!existing;
      }));
      for (let i = 0; i < stores.length; i++) {
        const adapter = stores[i].adapter;
        if (!present[i]) await adapter.put(key, bytes);
        if (!(await verifiedRead(adapter, key, digest, bytes.length)))
          throw new VaultError('READBACK_MISSING');
      }
      return { version: 1, kind, sha256: digest, bytes: bytes.length,
        copies: stores.map(s => s.adapter.provider), verified: true };
    });
  }
  async function read({ kind = 'original', digest }) {
    const key = pathFor(kind, digest);
    for (const {adapter} of stores) {
      try {
        const bytes = await verifiedRead(adapter, key, digest);
        if (bytes) return { bytes, provider: adapter.provider };
      } catch (_) {
        // Retry independent source even if first one returns corrupted bytes.
      }
    }
    throw new VaultError('NO_VERIFIED_COPY', 503);
  }
  return Object.freeze({ save, read });
}
