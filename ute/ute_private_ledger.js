// ==========================================
// Universal Travel Engine (UTE)
// Module: Private Ledger Engine
// ==========================================
// Owns per-profile PIN derivation, encrypted persistence, legacy migration,
// and the only in-memory copy of the unlocked private ledger.

(function (target) {
  'use strict';

  const LEGACY_KEY = 'busan_v36_p_bills';
  const VAULT_PREFIX = 'busan_v45_private_vault_';
  const ITERATIONS = 120000;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let unlockedProfile = null;
  let unlockedKey = null;
  let unlockedBills = [];

  function assertProfile(profile) {
    if (profile !== 'user1' && profile !== 'user2') throw new Error('Unsupported private-ledger profile');
  }

  function vaultKey(profile) {
    assertProfile(profile);
    return VAULT_PREFIX + profile;
  }

  function cloneBills(bills) {
    return JSON.parse(JSON.stringify(Array.isArray(bills) ? bills : []));
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function hexToBytes(value) {
    if (typeof value !== 'string' || value.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(value)) {
      throw new Error('Invalid encrypted vault data');
    }
    const bytes = new Uint8Array(value.length / 2);
    for (let i = 0; i < value.length; i += 2) bytes[i / 2] = parseInt(value.slice(i, i + 2), 16);
    return bytes;
  }

  async function deriveKey(pin, salt, iterations = ITERATIONS) {
    const material = await target.crypto.subtle.importKey(
      'raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey']
    );
    return target.crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptBills(bills, key, salt, iterations = ITERATIONS) {
    const iv = target.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await target.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(cloneBills(bills)))
    );
    return {
      version: 1,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations },
      cipher: { name: 'AES-GCM', length: 256 },
      salt: bytesToHex(salt),
      iv: bytesToHex(iv),
      ciphertext: bytesToHex(new Uint8Array(ciphertext)),
      updatedAt: Date.now()
    };
  }

  async function decryptVault(vault, key) {
    if (!vault || vault.version !== 1 || vault.kdf?.name !== 'PBKDF2' || vault.cipher?.name !== 'AES-GCM') {
      throw new Error('Unsupported encrypted vault');
    }
    const clear = await target.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBytes(vault.iv) }, key, hexToBytes(vault.ciphertext)
    );
    const bills = JSON.parse(decoder.decode(clear));
    if (!Array.isArray(bills)) throw new Error('Invalid private ledger');
    return cloneBills(bills);
  }

  function readVault(profile) {
    const result = target.StorageEngine.get(vaultKey(profile), null);
    if (!result?.success) throw new Error('Unable to read encrypted vault');
    return result.data;
  }

  function writeVault(profile, vault) {
    const result = target.StorageEngine.set(vaultKey(profile), vault);
    if (!result?.success) throw new Error('Unable to persist encrypted vault');
  }

  function removeVault(profile) {
    const result = target.StorageEngine.remove(vaultKey(profile));
    if (!result?.success) throw new Error('Unable to roll back encrypted vault');
  }

  function setUnlocked(profile, key, bills) {
    unlockedProfile = profile;
    unlockedKey = key;
    unlockedBills = cloneBills(bills);
    target.privateBills = cloneBills(unlockedBills);
  }

  function lock() {
    unlockedProfile = null;
    unlockedKey = null;
    unlockedBills = [];
    target.privateBills = [];
  }

  async function persistUnlocked(nextBills) {
    if (!unlockedProfile || !unlockedKey) throw new Error('Private ledger is locked');
    const profile = unlockedProfile;
    const key = unlockedKey;
    const previous = readVault(profile);
    const salt = hexToBytes(previous.salt);
    const iterations = previous.kdf?.iterations || ITERATIONS;
    try {
      const vault = await encryptBills(nextBills, key, salt, iterations);
      writeVault(profile, vault);
      const verified = await decryptVault(readVault(profile), key);
      setUnlocked(profile, key, verified);
      return cloneBills(verified);
    } catch (error) {
      try { writeVault(profile, previous); } catch (_) { lock(); }
      throw error;
    }
  }

  const engine = {
    hasVault(profile) {
      return readVault(profile) !== null;
    },

    isUnlocked(profile) {
      return unlockedProfile === profile && unlockedKey !== null;
    },

    getUnlockedProfile() {
      return unlockedProfile;
    },

    getBills(profile) {
      return this.isUnlocked(profile) ? cloneBills(unlockedBills) : [];
    },

    lock,

    async setup(profile, pin, confirmation) {
      assertProfile(profile);
      if (!/^\d{4,12}$/.test(pin || '') || pin !== confirmation) throw new Error('PIN_SETUP_INVALID');
      if (this.hasVault(profile)) throw new Error('VAULT_ALREADY_EXISTS');

      lock();
      const legacyResult = target.StorageEngine.get(LEGACY_KEY, []);
      if (!legacyResult?.success) throw new Error('Unable to read legacy private ledger');
      const legacy = Array.isArray(legacyResult.data) ? cloneBills(legacyResult.data) : [];
      const migrating = legacy.filter(bill => bill && bill.payer === profile);
      const remaining = legacy.filter(bill => !bill || bill.payer !== profile);
      const salt = target.crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveKey(pin, salt);

      try {
        writeVault(profile, await encryptBills(migrating, key, salt));
        const verified = await decryptVault(readVault(profile), key);
        if (JSON.stringify(verified) !== JSON.stringify(migrating)) throw new Error('Vault verification failed');
        if (migrating.length > 0) {
          const removal = target.StorageEngine.set(LEGACY_KEY, remaining);
          if (!removal?.success) throw new Error('Unable to finalize legacy migration');
        }
        setUnlocked(profile, key, verified);
        return cloneBills(verified);
      } catch (error) {
        try { removeVault(profile); } catch (_) { /* preserve the original failure */ }
        lock();
        throw error;
      }
    },

    async unlock(profile, pin) {
      assertProfile(profile);
      lock();
      const vault = readVault(profile);
      if (!vault) throw new Error('VAULT_NOT_FOUND');
      try {
        const salt = hexToBytes(vault.salt);
        const key = await deriveKey(pin || '', salt, vault.kdf?.iterations || ITERATIONS);
        const bills = await decryptVault(vault, key);
        setUnlocked(profile, key, bills);
        return cloneBills(bills);
      } catch (_) {
        lock();
        throw new Error('UNLOCK_FAILED');
      }
    },

    async add(profile, bill) {
      if (!this.isUnlocked(profile)) throw new Error('Private ledger is locked');
      const next = cloneBills(unlockedBills);
      next.push({ ...cloneBills([bill])[0], payer: profile, type: '私帳' });
      return persistUnlocked(next);
    },

    async remove(profile, id) {
      if (!this.isUnlocked(profile)) throw new Error('Private ledger is locked');
      return persistUnlocked(unlockedBills.filter(bill => bill.id !== id));
    }
  };

  lock();
  target.PrivateLedgerEngine = engine;
})(typeof window !== 'undefined' ? window : globalThis);
