// Read-only photo-host diagnostics. ImgBB may return a valid *image* that says
// "image not found", so a native <img> error event alone cannot detect it.
// Never delete, rewrite, re-upload or mark Firebase records from these checks.
(function (root) {
  'use strict';
  function isImgBB(url) {
    try {
      const parsed = new URL(String(url || ''), root.location?.href || 'https://example.invalid/');
      return /^(?:i\.)?ibb\.co$|^(?:www\.)?imgbb\.com$|^image\.ibb\.co$/.test(parsed.hostname.toLowerCase());
    } catch (_) { return false; }
  }
  function inspect(url, image) {
    const width = Number(image?.naturalWidth || 0);
    const height = Number(image?.naturalHeight || 0);
    if (!width || !height) return { status: 'unavailable', reason: '圖片網址無法讀取' };
    // ImgBB's blue error tile is sometimes delivered as a successfully decoded
    // small square image rather than a 404. This is a *warning*, not proof of deletion.
    const ratio = width / height;
    if (isImgBB(url) && width <= 256 && height <= 256 && ratio >= 0.80 && ratio <= 1.25) {
      return { status: 'suspect', reason: '圖片主機回傳小型方形圖，疑似失效佔位圖' };
    }
    return { status: 'ok', reason: '' };
  }
  root.PhotoHostHealth = Object.freeze({ isImgBB, inspect });
})(window);
