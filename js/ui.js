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
    // OWNER rejected black backgrounds. Keep this legacy action safe and clear.
    document.documentElement.setAttribute('data-theme', 'light');
    StorageEngine.set('busan_v46_theme', 'light');
    if (typeof showToast === 'function') showToast('旅行版固定使用奶油色背景', 'info');
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


// The lightbox follows the currently visible (possibly search-filtered) album.
// It never mutates photo records, original URLs, EXIF data, or cloud storage.
(function () {
    let photos = [];
    let position = -1;
    let closeTimer = null;
    let openTimer = null;
    let touchStart = null;
    let previouslyFocused = null;

    const el = id => document.getElementById(id);
    const isOpen = () => el('lightbox')?.style.display === 'flex';

    function displayAt(nextPosition) {
        if (nextPosition < 0 || nextPosition >= photos.length) return;
        const photo = photos[nextPosition];
        const img = el('lightbox-img');
        if (!img) return;
        position = nextPosition;
        window.currentLightboxUrl = photo.url;
        window.currentLightboxKey = photo.key;
        window.currentPhotoHostState = 'loading';
        const warning = el('lightbox-host-status');
        if (warning) { warning.hidden = true; warning.textContent = ''; }
        img.alt = '旅行照片 ' + (position + 1) + '／' + photos.length;
        // An ImgBB error tile may decode successfully, so onerror alone is not
        // enough. Never change Firebase URLs, photo metadata or original bytes.
        const report = (status, reason) => {
            if (window.currentLightboxKey !== photo.key ||
                window.currentLightboxUrl !== photo.url) return;
            window.currentPhotoHostState = status;
            if (!warning) return;
            warning.hidden = status === 'ok';
            warning.textContent = status === 'unavailable'
                ? '⚠️ 這張照片的圖片來源無法載入；相簿紀錄及日期仍保留。'
                : status === 'suspect'
                    ? '⚠️ 圖片來源疑似回傳 ImgBB 錯誤佔位圖；相簿紀錄未刪除，暫勿刪除這張照片。'
                    : '';
        };
        img.onload = () => {
            const health = window.PhotoHostHealth?.inspect(photo.url, img) || { status:'ok' };
            report(health.status, health.reason);
        };
        img.onerror = () => report('unavailable', '圖片無法載入');
        img.src = photo.url;
        const counter = el('lightbox-counter');
        if (counter) counter.textContent = (position + 1) + ' / ' + photos.length;
        const previous = el('lightbox-prev');
        const next = el('lightbox-next');
        if (previous) { previous.disabled = position === 0; previous.hidden = photos.length < 2; }
        if (next) { next.disabled = position === photos.length - 1; next.hidden = photos.length < 2; }
        if (typeof window.renderLightboxDetails === 'function') {
            window.renderLightboxDetails(photo.key);
        }
        // Warm only immediate neighbors, rather than downloading the full album.
        [-1, 1].forEach(offset => {
            const neighbor = photos[position + offset];
            if (neighbor && typeof Image === 'function') {
                const preload = new Image();
                preload.src = neighbor.url;
            }
        });
    }

    window.openLightbox = function (url, key) {
        const lb = el('lightbox');
        const img = el('lightbox-img');
        if (!lb || !img || !url) return;
        clearTimeout(closeTimer);
        clearTimeout(openTimer);
        const visible = Array.isArray(window.memoryVisiblePhotos) ? window.memoryVisiblePhotos : [];
        const match = visible.findIndex(p => p.key === key && p.url === url);
        photos = match >= 0 ? visible.slice() : [{ key: key || '', url: url }];
        previouslyFocused = document.activeElement;
        lb.style.display = 'flex';
        lb.setAttribute('aria-hidden', 'false');
        displayAt(match >= 0 ? match : 0);
        openTimer = setTimeout(() => {
            lb.style.opacity = '1';
            img.style.transform = 'scale(1)';
            lb.setAttribute('tabindex', '-1');
            lb.focus({ preventScroll: true });
        }, 20);
    };

    window.moveLightbox = function (delta) {
        if (!isOpen() || !Number.isInteger(delta) || delta === 0) return;
        displayAt(position + delta);
    };

    window.closeLightbox = function () {
        const lb = el('lightbox');
        const img = el('lightbox-img');
        if (!lb || !img || !isOpen()) return;
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        lb.style.opacity = '0';
        lb.setAttribute('aria-hidden', 'true');
        img.style.transform = 'scale(0.95)';
        closeTimer = setTimeout(() => {
            if (lb.style.opacity !== '0') return;
            lb.style.display = 'none';
            const details = el('lightbox-details');
            if (details) details.innerHTML = '';
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus({ preventScroll: true });
            }
        }, 300);
    };

    document.addEventListener('keydown', event => {
        if (!isOpen()) return;
        if (event.key === 'Escape') { event.preventDefault(); window.closeLightbox(); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); window.moveLightbox(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); window.moveLightbox(1); }
    });

    const lightbox = el('lightbox');
    if (lightbox) {
        lightbox.addEventListener('touchstart', event => {
            touchStart = null;
            if (!isOpen() || event.touches.length !== 1 ||
                event.target.closest('button, a, input, textarea')) return;
            touchStart = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY,
                time: Date.now()
            };
        }, { passive: true });
        lightbox.addEventListener('touchend', event => {
            if (!touchStart || !isOpen() || event.changedTouches.length !== 1) return;
            const deltaX = event.changedTouches[0].clientX - touchStart.x;
            const deltaY = event.changedTouches[0].clientY - touchStart.y;
            touchStart = null;
            if (Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                window.moveLightbox(deltaX < 0 ? 1 : -1);
            }
        }, { passive: true });
        lightbox.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
    }
})();

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

window.openFlashcard = function(title, korean) {
    window.openCardLightbox(title, korean);
};

window.closeFlashcard = function() {
    const modal = document.getElementById('flashcardModal');
    if (!modal) return;
    
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
};
