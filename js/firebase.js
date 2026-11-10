// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Firebase Config & Database Listeners
// ─────────────────────────────────────────────────────────────────────────

(function() {
    const firebaseConfig = { 
        apiKey: "AIzaSyC884_zH7XM7l7C_ijhuFmEoKxbsN0O1Vw", 
        authDomain: "busan-trip-2026-4148f.firebaseapp.com", 
        databaseURL: "https://busan-trip-2026-4148f-default-rtdb.asia-southeast1.firebasedatabase.app", 
        projectId: "busan-trip-2026-4148f", 
        storageBucket: "busan-trip-2026-4148f.firebasestorage.app", 
        messagingSenderId: "819505968980", 
        appId: "1:819505968980:web:03e6d05ef5101719327ac1" 
    };

    // Global Database keys
    window.DB_ITI     = "busan_v36_iti";
    window.DB_GUIDE   = "busan_v36_guide";
    window.DB_SHOP    = "busan_v36_shop";
    window.DB_PHOTOS  = "busan_v36_photos";
    window.DB_TICKETS = "busan_v36_tickets";
    window.DB_BILLS   = "busan_v36_bills";
    window.DB_PREP    = "busan_v36_prep";
    window.DB_VOICE   = "busan_v36_voice";
    window.DB_PROFILE = "busan_v36_profiles";
    window.DB_HOTEL   = "busan_v36_hotel";
    window.DB_REVIEW  = "busan_v37_review";
    window.DB_BUDGET  = "busan_v46_budget_shared";
    // V45 Batch B owner-editable data. Canonical static content remains read-only.
    window.DB_COUPONS = "busan_v45_coupons";
    window.DB_OWNER_CUSTOM = "busan_v45_owner_custom";

    // Initialize Firebase
    if (window.firebase) {
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const DEFAULT_IMGBB_KEY = "ba1b2b24f8275c9d3a199bea5cd52bf9";
        // Cleanse any legacy invalid key in local storage
        if (window.StorageEngine) {
            const storedKey = StorageEngine.get('ute_imgbb_key', null).data;
            if (!storedKey || storedKey === "8a4c0f3b5d2e7a9b1c6f") {
                StorageEngine.set('ute_imgbb_key', DEFAULT_IMGBB_KEY);
            }
        }
        // Critical: initialize NetworkEngine with the Firebase app so _db is set
        if (window.NetworkEngine) {
            const imgbbKey = window.IMGBB_API_KEY || (window.StorageEngine ? StorageEngine.get('ute_imgbb_key', DEFAULT_IMGBB_KEY).data : DEFAULT_IMGBB_KEY) || DEFAULT_IMGBB_KEY;
            NetworkEngine.init(firebase.app(), imgbbKey);
        }
        // Persistent browser session across PWA launches
        if (typeof firebase.auth === 'function' && firebase.auth.Auth && firebase.auth.Auth.Persistence) {
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
                console.warn('[Firebase] Auth persistence warning:', err.message);
            });
        }
        console.log("Firebase initialized successfully");
    }
})();
