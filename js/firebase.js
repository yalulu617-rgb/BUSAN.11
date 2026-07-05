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

    // Initialize Firebase
    if (window.firebase) {
        firebase.initializeApp(firebaseConfig);
        // Critical: initialize NetworkEngine with the Firebase app so _db is set
        if (window.NetworkEngine) {
            const imgbbKey = window.IMGBB_API_KEY || (window.StorageEngine ? StorageEngine.get('ute_imgbb_key', "8a4c0f3b5d2e7a9b1c6f").data : "8a4c0f3b5d2e7a9b1c6f");
            NetworkEngine.init(firebase.app(), imgbbKey);
        }
        console.log("Firebase initialized successfully");
    }
})();
