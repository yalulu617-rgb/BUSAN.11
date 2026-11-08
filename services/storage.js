// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Storage Service (Local Storage Engine)
// ─────────────────────────────────────────────────────────────────────────

window.StorageEngine = {
    get: function(key, fallback) {
        try {
            const val = localStorage.getItem(key);
            if (val === null) return { data: fallback, status: 'fallback' };
            return { data: JSON.parse(val), status: 'ok' };
        } catch (e) {
            return { data: fallback, status: 'error' };
        }
    },
    set: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return { status: 'ok' };
        } catch (e) {
            return { status: 'error' };
        }
    },
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return { status: 'ok' };
        } catch (e) {
            return { status: 'error' };
        }
    }
};
