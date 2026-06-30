// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: UI Service (Theme, Toasts, Lightbox, Haptics)
// ─────────────────────────────────────────────────────────────────────────

window.toggleDarkMode = function() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    StorageEngine.set('busan_v36_theme', theme);
    triggerHapticFeedback();
};

window.triggerHapticFeedback = function() {
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }
};

window.showToast = function(msg, type = 'info') {
    const island = document.getElementById('dynamicIslandPrompt');
    if (!island) {
        // Fallback to normal alert if island is missing
        alert(msg);
        return;
    }
    
    // Renders inside dynamic island
    island.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:8px;">
            <i class="fa-solid ${type==='success'?'fa-circle-check':(type==='error'?'fa-circle-xmark':'fa-circle-info')}" style="color:${type==='success'?'#2ecc71':(type==='error'?'#e74c3c':'#3498db')}"></i>
            ${msg}
        </span>
    `;
    island.classList.add('active');
    triggerHapticFeedback();
    
    setTimeout(() => {
        island.classList.remove('active');
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
    
    document.getElementById('fcTitle').innerText = title;
    document.getElementById('fcKorean').innerText = korean;
    document.getElementById('fcRoman').innerText = roman;
    
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
