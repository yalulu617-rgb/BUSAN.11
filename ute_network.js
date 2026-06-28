// ==========================================
// Universal Travel Engine (UTE)
// Infrastructure Layer: Network Engine
// ==========================================
// Provides a stable API for all external I/O:
//   - Firebase Realtime Database (CRUD + listeners)
//   - Weather API (wttr.in)
//   - Exchange Rate API
//   - ImgBB Image Upload
//
// Dependency Inversion Principle:
//   Engine Layer and UI Layer must NOT directly call firebase, fetch, or any
//   third-party SDK. If the backend changes (e.g. Firebase → Supabase),
//   ONLY this file needs to be updated.
//
// All public methods return a standard response envelope:
//   { success: boolean, data: any, error: string | null }
//
// Event-Driven Update Contract:
//   Firebase listeners call triggerContextUpdate(), never a UI function directly.

const NetworkEngine = {
  _db: null,
  _imgbbKey: null,
  _listeners: {}, // path → unsubscribe function

  // ──────────────────────────────────────────
  // Initialisation (called once by index.html)
  // ──────────────────────────────────────────
  /**
   * Initialise the Firebase connection and store the db reference.
   * @param {object} firebaseApp - result of firebase.initializeApp(config)
   * @param {string} imgbbApiKey
   */
  init(firebaseApp, imgbbApiKey) {
    try {
      this._db = firebaseApp.database();
      this._imgbbKey = imgbbApiKey;
    } catch (err) {
      console.error('[NetworkEngine] init error:', err);
    }
  },

  // ──────────────────────────────────────────
  // Firebase — Listeners (Event-Driven)
  // ──────────────────────────────────────────
  /**
   * Subscribe to real-time changes at a Firebase path.
   * The callback receives the raw snapshot value (already .val()-processed).
   * This method does NOT call UI directly; callers are responsible for
   * routing data to triggerContextUpdate().
   *
   * @param {string} path
   * @param {function(data: any): void} callback
   */
  firebaseOn(path, callback) {
    if (!this._db) { console.warn('[NetworkEngine] Not initialised'); return; }
    const ref = this._db.ref(path);
    ref.on('value', snapshot => {
      callback(snapshot);
    }, err => {
      console.error('[NetworkEngine] firebaseOn error on path', path, err);
    });
    // Store off-function for potential future unsubscription
    this._listeners[path] = () => ref.off('value');
  },

  /**
   * Unsubscribe a previously registered listener.
   * @param {string} path
   */
  firebaseOff(path) {
    if (this._listeners[path]) {
      this._listeners[path]();
      delete this._listeners[path];
    }
  },

  // ──────────────────────────────────────────
  // Firebase — One-time Read
  // ──────────────────────────────────────────
  /**
   * Read a value once from Firebase.
   * @param {string} path
   * @returns {Promise<{ success: boolean, data: any, error: string|null }>}
   */
  async firebaseRead(path) {
    if (!this._db) return { success: false, data: null, error: 'NetworkEngine not initialised' };
    try {
      const snap = await this._db.ref(path).once('value');
      return { success: true, data: snap.val(), error: null };
    } catch (err) {
      console.error('[NetworkEngine] firebaseRead error:', path, err);
      return { success: false, data: null, error: err.message };
    }
  },

  // ──────────────────────────────────────────
  // Firebase — Write Operations
  // ──────────────────────────────────────────
  /**
   * Overwrite data at a Firebase path (.set).
   * @param {string} path
   * @param {any} data
   * @returns {Promise<{ success: boolean, data: null, error: string|null }>}
   */
  async firebaseWrite(path, data) {
    if (!this._db) return { success: false, data: null, error: 'NetworkEngine not initialised' };
    try {
      await this._db.ref(path).set(data);
      return { success: true, data: null, error: null };
    } catch (err) {
      console.error('[NetworkEngine] firebaseWrite error:', path, err);
      return { success: false, data: null, error: err.message };
    }
  },

  /**
   * Merge data at a Firebase path (.update).
   * @param {string} path
   * @param {object} data
   * @returns {Promise<{ success: boolean, data: null, error: string|null }>}
   */
  async firebaseUpdate(path, data) {
    if (!this._db) return { success: false, data: null, error: 'NetworkEngine not initialised' };
    try {
      await this._db.ref(path).update(data);
      return { success: true, data: null, error: null };
    } catch (err) {
      console.error('[NetworkEngine] firebaseUpdate error:', path, err);
      return { success: false, data: null, error: err.message };
    }
  },

  /**
   * Push a new child to a Firebase list (.push).
   * @param {string} path
   * @param {any} data
   * @returns {Promise<{ success: boolean, data: { key: string }, error: string|null }>}
   */
  async firebasePush(path, data) {
    if (!this._db) return { success: false, data: null, error: 'NetworkEngine not initialised' };
    try {
      const ref = await this._db.ref(path).push(data);
      return { success: true, data: { key: ref.key }, error: null };
    } catch (err) {
      console.error('[NetworkEngine] firebasePush error:', path, err);
      return { success: false, data: null, error: err.message };
    }
  },

  /**
   * Remove a node at a Firebase path (.remove).
   * @param {string} path
   * @returns {Promise<{ success: boolean, data: null, error: string|null }>}
   */
  async firebaseRemove(path) {
    if (!this._db) return { success: false, data: null, error: 'NetworkEngine not initialised' };
    try {
      await this._db.ref(path).remove();
      return { success: true, data: null, error: null };
    } catch (err) {
      console.error('[NetworkEngine] firebaseRemove error:', path, err);
      return { success: false, data: null, error: err.message };
    }
  },

  /**
   * Return the root database URL (used by offline sync).
   * @returns {string}
   */
  firebaseRootUrl() {
    if (!this._db) return '';
    try { return this._db.ref().toString(); }
    catch (_) { return ''; }
  },

  // ──────────────────────────────────────────
  // Weather API
  // ──────────────────────────────────────────
  /**
   * Fetch weather for a city query string from wttr.in.
   * @param {string} cityQuery - e.g. "Busan", "Gyeongju"
   * @returns {Promise<{ success: boolean, data: object|null, error: string|null }>}
   */
  async getWeather(cityQuery) {
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(cityQuery)}?format=j1`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, data, error: null };
    } catch (err) {
      console.warn('[NetworkEngine] getWeather error for', cityQuery, err);
      return { success: false, data: null, error: err.message };
    }
  },

  // ──────────────────────────────────────────
  // Exchange Rate API  (Cache + TTL + Retry)
  // ──────────────────────────────────────────
  _exchangeRateCacheMs: 4 * 60 * 60 * 1000, // 4 hours TTL

  /**
   * Fetch the KRW→TWD exchange rate with built-in cache, TTL, retry and timeout.
   * @returns {Promise<{ success: boolean, data: { krwToTwd: number }, error: string|null }>}
   */
  async getExchangeRate() {
    // 1. Check StorageEngine cache
    const cached = StorageEngine.get('busan_v36_live_rate_ts');
    if (cached.success && cached.data) {
      const { rate, ts } = cached.data;
      if (Date.now() - ts < this._exchangeRateCacheMs) {
        return { success: true, data: { krwToTwd: parseFloat(rate) }, error: null };
      }
    }

    // 2. Attempt fetch with retry (3 attempts, 5 s timeout)
    const maxRetries = 3;
    const timeoutMs = 5000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/KRW', { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const krwToTwd = json.rates && json.rates.TWD ? json.rates.TWD : 0.024;

        // Persist to StorageEngine
        StorageEngine.set('busan_v36_live_rate', krwToTwd);
        StorageEngine.set('busan_v36_live_rate_ts', { rate: krwToTwd, ts: Date.now() });

        return { success: true, data: { krwToTwd }, error: null };
      } catch (err) {
        console.warn(`[NetworkEngine] getExchangeRate attempt ${attempt} failed:`, err.message);
        if (attempt === maxRetries) {
          // Fallback to last cached raw value
          const fallback = StorageEngine.get('busan_v36_live_rate', 0.024);
          return { success: false, data: { krwToTwd: parseFloat(fallback.data) || 0.024 }, error: err.message };
        }
        await new Promise(r => setTimeout(r, 500 * attempt)); // back-off
      }
    }
  },

  // ──────────────────────────────────────────
  // ImgBB Image Upload
  // ──────────────────────────────────────────
  /**
   * Upload a Blob or File to ImgBB and return the hosted image URL.
   * UI does NOT need to know the API key or endpoint URL.
   * @param {Blob|File} fileOrBlob
   * @returns {Promise<{ success: boolean, data: { url: string }|null, error: string|null }>}
   */
  async uploadImage(fileOrBlob) {
    if (!this._imgbbKey) return { success: false, data: null, error: 'ImgBB key not set' };
    try {
      const fd = new FormData();
      fd.append('image', fileOrBlob);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${this._imgbbKey}`, {
        method: 'POST',
        body: fd
      });
      const json = await res.json();
      if (json.success) {
        return { success: true, data: { url: json.data.url }, error: null };
      }
      const msg = json.error ? json.error.message : 'Unknown ImgBB error';
      return { success: false, data: null, error: msg };
    } catch (err) {
      console.error('[NetworkEngine] uploadImage error:', err);
      return { success: false, data: null, error: err.message };
    }
  }
};

if (typeof window !== 'undefined') {
  window.NetworkEngine = NetworkEngine;
}
