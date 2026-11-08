// ==========================================
// Universal Travel Engine (UTE)
// Infrastructure Layer: Storage Engine
// ==========================================
// Provides a stable API for all localStorage operations.
// UI Layer and Engine Layer must NOT call localStorage directly.
// If the underlying storage mechanism changes (e.g. IndexedDB),
// only this file needs to be modified.

const StorageEngine = {
  /**
   * Retrieve a value from local storage.
   * Automatically parses JSON if the stored value is a JSON string.
   * @param {string} key
   * @param {*} defaultValue - returned when key does not exist
   * @returns {{ success: boolean, data: *, error: string|null }}
   */
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return { success: true, data: defaultValue, error: null };
      try {
        return { success: true, data: JSON.parse(raw), error: null };
      } catch (_) {
        return { success: true, data: raw, error: null };
      }
    } catch (err) {
      console.warn('[StorageEngine] get error:', key, err);
      return { success: false, data: defaultValue, error: err.message };
    }
  },

  /**
   * Store a value in local storage. Objects are serialized to JSON automatically.
   * @param {string} key
   * @param {*} value
   * @returns {{ success: boolean, data: null, error: string|null }}
   */
  set(key, value) {
    try {
      const serialized = (typeof value === 'object' && value !== null)
        ? JSON.stringify(value)
        : String(value);
      localStorage.setItem(key, serialized);
      return { success: true, data: null, error: null };
    } catch (err) {
      console.warn('[StorageEngine] set error:', key, err);
      return { success: false, data: null, error: err.message };
    }
  },

  /**
   * Remove a single key from local storage.
   * @param {string} key
   * @returns {{ success: boolean, data: null, error: string|null }}
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return { success: true, data: null, error: null };
    } catch (err) {
      console.warn('[StorageEngine] remove error:', key, err);
      return { success: false, data: null, error: err.message };
    }
  },

  /**
   * Remove all keys matching the given namespace prefix.
   * @param {string} namespace - prefix to match (e.g. 'busan_')
   * @returns {{ success: boolean, data: { removed: number }, error: string|null }}
   */
  clear(namespace) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(namespace)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      return { success: true, data: { removed: keysToRemove.length }, error: null };
    } catch (err) {
      console.warn('[StorageEngine] clear error:', namespace, err);
      return { success: false, data: null, error: err.message };
    }
  },

  /**
   * Check whether a key exists in local storage.
   * @param {string} key
   * @returns {boolean}
   */
  exists(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (_) {
      return false;
    }
  },

  // Session storage helpers (for PIN unlock state etc.)
  sessionGet(key, defaultValue = null) {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw === null) return { success: true, data: defaultValue, error: null };
      try { return { success: true, data: JSON.parse(raw), error: null }; }
      catch (_) { return { success: true, data: raw, error: null }; }
    } catch (err) {
      return { success: false, data: defaultValue, error: err.message };
    }
  },

  sessionSet(key, value) {
    try {
      sessionStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      return { success: true, data: null, error: null };
    } catch (err) {
      return { success: false, data: null, error: err.message };
    }
  }
};

if (typeof window !== 'undefined') {
  window.StorageEngine = StorageEngine;
}
