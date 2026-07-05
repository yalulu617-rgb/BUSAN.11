// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: UI Module (Theme, Toasts, Lightbox, Haptics, Speech)
// Responsibilities: dark mode, toast, lightbox, flashcard, speech, haptics
// ─────────────────────────────────────────────────────────────────────────

// ── Korean Speech (UI audio — belongs here) ───────────────────────────────
window.speakKorean = function (text) {
    if (!text) return;
    if (!window.speechSynthesis) { showToast('此裝置不支援語音播放', 'warning'); return; }
    // Cancel any in-progress speech before playing new
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang  = 'ko-KR';
    utter.rate  = 0.85;
    speechSynthesis.speak(utter);
};



window.toggleDarkMode = function() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    StorageEngine.set('busan_v36_theme', theme);
    triggerHapticFeedback();
};

// triggerHapticFeedback is defined in services/utils.js (canonical)


window.showToast = function(msg, type = 'info') {
    let island = document.getElementById('_toastPrompt');
    if (!island) {
        island = document.createElement('div');
        island.id = '_toastPrompt';
        island.style.cssText = [
            'position:fixed', 'top:env(safe-area-inset-top,16px)', 'left:50%',
            'transform:translateX(-50%) translateY(-80px)', 'z-index:99999',
            'background:#1a1a2e', 'color:#fff', 'padding:10px 20px',
            'border-radius:24px', 'font-size:.85rem', 'font-weight:700',
            'box-shadow:0 8px 32px rgba(0,0,0,.3)', 'transition:transform .35s ease',
            'white-space:nowrap', 'pointer-events:none'
        ].join(';');
        document.body.appendChild(island);
    }
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    island.innerHTML = `${icon} ${msg}`;
    island.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(island._hideTimer);
    island._hideTimer = setTimeout(() => {
        island.style.transform = 'translateX(-50%) translateY(-80px)';
    }, 3000);
};


window.openLightbox = function(url, key) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if (!lb || !img) return;
    
    window.currentLightboxUrl = url;
    window.currentLightboxKey = key;
    img.src = url;
    lb.style.display = 'flex';
    setTimeout(() => {
        lb.style.opacity = '1';
        img.style.transform = 'scale(1)';
    }, 50);
};

window.closeLightbox = function() {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if (!lb || !img) return;
    
    lb.style.opacity = '0';
    img.style.transform = 'scale(0.9)';
    setTimeout(() => {
        lb.style.display = 'none';
    }, 300);
};

window.openCardLightbox = function(title, korean, roman, audio) {
    const modal = document.getElementById('flashcardModal');
    if (!modal) return;
    
    // index.html flashcard modal uses fc-tw (Chinese label) and fc-kr (Korean)
    const fcTw = document.getElementById('fc-tw');
    const fcKr = document.getElementById('fc-kr');
    if (fcTw) fcTw.innerText = title;
    if (fcKr) fcKr.innerText = korean;
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 50);
};

window.closeFlashcard = function() {
    const modal = document.getElementById('flashcardModal');
    if (!modal) return;
    
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
};
