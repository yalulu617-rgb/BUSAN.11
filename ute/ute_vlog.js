// Local-only highlight selection for BUSAN.11.
// Read-only input: the existing photoList from the app. No uploads or photo edits.
(function (root) {
    'use strict';
    const PHOTO_SAMPLE_PER_DAY = 16;

    function dateOf(p) {
        const raw = String(p.capturedAt || p.date || '');
        const full = raw.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
        if (full) return full[1] + '-' + full[2].padStart(2, '0') + '-' + full[3].padStart(2, '0');
        const short = raw.match(/(?:^|\D)(\d{1,2})[-/.](\d{1,2})(?:\D|$)/);
        if (short) return '2026-' + short[1].padStart(2, '0') + '-' + short[2].padStart(2, '0');
        return '';
    }
    function captureOrder(p) {
        const t = String(p.capturedAt || '');
        if (t && /T\d{2}:\d{2}/.test(t)) return t;
        const date = dateOf(p);
        return date + 'T00:00:00';
    }
    function sampleEvenly(items, max) {
        if (items.length <= max) return items.slice();
        const result = [];
        for (let i = 0; i < max; i++) {
            result.push(items[Math.round((i + 0.5) * items.length / max - 0.5)]);
        }
        return result;
    }
    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let done = false;
            const timeout = setTimeout(() => finish(new Error('影像讀取逾時')), 15000);
            function finish(error) {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                img.onload = null;
                img.onerror = null;
                if (error) reject(error);
                else resolve(img);
            }
            img.crossOrigin = 'anonymous';
            img.onload = () => finish(null);
            img.onerror = () => finish(new Error('照片站未允許影片畫布讀取'));
            img.src = url;
        });
    }
    function metrics(img) {
        const canvas = document.createElement('canvas');
        canvas.width = 36;
        canvas.height = 36;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 36, 36);
        const values = ctx.getImageData(0, 0, 36, 36).data;
        const gray = [];
        let sum = 0, sumSq = 0, edge = 0;
        for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) {
            const i = (y * 36 + x) * 4;
            const v = 0.2126 * values[i] + 0.7152 * values[i + 1] + 0.0722 * values[i + 2];
            gray.push(v);
            sum += v;
            sumSq += v * v;
        }
        for (let y = 1; y < 35; y++) for (let x = 1; x < 35; x++) {
            const i = y * 36 + x;
            edge += Math.abs(4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - 36] - gray[i + 36]);
        }
        const average = sum / gray.length;
        const contrast = Math.sqrt(Math.max(0, sumSq / gray.length - average * average));
        const sharpness = edge / (34 * 34);
        const exposure = Math.max(0, 1 - Math.abs(average - 127) / 155);
        const score = 0.5 * Math.min(sharpness / 80, 1) +
            0.25 * Math.min(contrast / 75, 1) + 0.25 * exposure;
        // Small perceptual difference hash for suppressing near-identical frames.
        const hash = [];
        for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
            const i = Math.floor((row + 0.5) * 36 / 8) * 36 + Math.floor((col + 0.5) * 36 / 9);
            hash.push(gray[i] > gray[i + 1] ? 1 : 0);
        }
        return { score, hash };
    }
    function similar(a, b) {
        if (!a || !b) return false;
        let different = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] !== b[i]) different++;
        }
        return different <= 7;
    }
    function bestSpreadAcrossDay(items, quota) {
        if (!quota || !items.length) return [];
        const ordered = items.slice().sort((a, b) => captureOrder(a).localeCompare(captureOrder(b)));
        const chosen = [];
        for (let i = 0; i < Math.min(quota, ordered.length); i++) {
            const from = Math.floor(i * ordered.length / Math.min(quota, ordered.length));
            const to = Math.floor((i + 1) * ordered.length / Math.min(quota, ordered.length));
            const block = ordered.slice(from, Math.max(from + 1, to))
                .sort((a, b) => (b._vlogScore || 0) - (a._vlogScore || 0));
            const candidate = block.find(p => !chosen.some(c => similar(c._vlogHash, p._vlogHash))) || block[0];
            if (candidate) chosen.push(candidate);
        }
        return chosen;
    }

    async function pickHighlights(input, progress) {
        const pictures = (Array.isArray(input) ? input : [])
            .filter(p => p && typeof p.url === 'string' && /^https:\/\//.test(p.url) && dateOf(p));
        const byDate = new Map();
        const seenUrls = new Set();
        pictures.forEach(p => {
            if (seenUrls.has(p.url)) return;
            seenUrls.add(p.url);
            const day = dateOf(p);
            if (!byDate.has(day)) byDate.set(day, []);
            byDate.get(day).push(p);
        });
        const days = [...byDate.keys()].sort();
        if (!days.length) return { selected: [], qualityChecked: 0, dates: [] };
        const candidates = days.flatMap(day => sampleEvenly(
            byDate.get(day).slice().sort((a, b) => captureOrder(a).localeCompare(captureOrder(b))),
            PHOTO_SAMPLE_PER_DAY
        ).map(p => ({ ...p, _vlogDate: day, _vlogScore: 0, _vlogHash: null })));
        let checked = 0;
        // Sequential loads deliberately cap mobile memory pressure.
        for (let i = 0; i < candidates.length; i++) {
            const photo = candidates[i];
            try {
                const img = await loadImage(photo.thumbnailUrl || photo.thumbUrl || photo.url);
                const data = metrics(img);
                photo._vlogScore = data.score;
                photo._vlogHash = data.hash;
                checked++;
            } catch (_) {
                // Cross-origin image checks may be blocked. Metadata/time-spread
                // remains a deterministic fallback; never pretend this was AI judging.
            }
            if (typeof progress === 'function') progress(i + 1, candidates.length);
        }
        const maxPicks = Math.min(20, candidates.length);
        const selected = [];
        const perDay = Math.floor(maxPicks / days.length);
        let spare = maxPicks % days.length;
        days.forEach(day => {
            const amount = perDay + (spare > 0 ? 1 : 0);
            if (spare > 0) spare--;
            selected.push(...bestSpreadAcrossDay(candidates.filter(p => p._vlogDate === day), amount));
        });
        // Refill days with extra photos if other days ran out.
        if (selected.length < maxPicks) {
            for (const extra of candidates.sort((a, b) => b._vlogScore - a._vlogScore)) {
                if (selected.length >= maxPicks) break;
                if (!selected.some(p => p.url === extra.url) &&
                    !selected.some(p => p._vlogDate === extra._vlogDate && similar(p._vlogHash, extra._vlogHash))) {
                    selected.push(extra);
                }
            }
        }
        selected.sort((a, b) => (a._vlogDate + captureOrder(a)).localeCompare(b._vlogDate + captureOrder(b)));
        return { selected, qualityChecked: checked, dates: days };
    }
    root.VlogSelectionEngine = { pickHighlights, dateOf, loadImage };
})(window);
