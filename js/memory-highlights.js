// Read-only, automatically populated daily highlights for the memory album.
// No Firebase writes, no extra uploads, no EXIF/GPS alterations.
(function (root) {
    'use strict';
    const el = id => document.getElementById(id);
    const MAX_DAILY = 4;
    let generation = 0;
    let latestCacheKey = '';
    let latestCacheResult = null;

    function chronological(a, b) {
        const key = p => String(p.capturedAt || p.date || '') + '|' + String(p.key || '');
        return key(a).localeCompare(key(b));
    }
    function spaced(items, count, preferScore) {
        const ordered = items.slice().sort(chronological);
        const amount = Math.min(count, ordered.length);
        const chosen = [];
        for (let i = 0; i < amount; i++) {
            const start = Math.floor(i * ordered.length / amount);
            const end = Math.max(start + 1, Math.floor((i + 1) * ordered.length / amount));
            const block = ordered.slice(start, end);
            if (preferScore) block.sort((a, b) => (b._vlogScore || 0) - (a._vlogScore || 0));
            if (block[0]) chosen.push(block[0]);
        }
        return chosen;
    }
    function select(rows, albumDay, dayOf, analyzed) {
        const qualityByUrl = new Map((analyzed || [])
            .filter(p => p && p._vlogAnalyzed && p._vlogUsable !== false)
            .map(p => [p.url, p]));
        const group = new Map();
        rows.forEach(p => {
            const date = dayOf(p);
            if (!group.has(date)) group.set(date, []);
            group.get(date).push(p);
        });
        function best(records, limit) {
            const scored = records.map(p => qualityByUrl.has(p.url)
                ? { ...p, _vlogScore: qualityByUrl.get(p.url)._vlogScore, _vlogAnalyzed: true }
                : p);
            // Quality can only be ranked for images the CDN allows canvas to read.
            const eligible = scored.some(p => p._vlogAnalyzed)
                ? scored.filter(p => p._vlogAnalyzed)
                : scored;
            return spaced(eligible, limit, true);
        }
        if (albumDay === 'all') {
            // One representative per distinct day keeps the five-day overview short.
            return [...group.entries()].sort((a, b) => b[0].localeCompare(a[0]))
                .map(([, records]) => best(records, 1)[0]).filter(Boolean);
        }
        return best(rows, MAX_DAILY);
    }
    function draw(rows, albumDay, dayOf, analyzed, checked) {
        const grid = el('todayPhotosContainer');
        if (!grid) return;
        const caption = el('memoryHighlightStatus');
        const selected = select(rows, albumDay, dayOf, analyzed);
        const cards = selected.map(photo => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'memory-highlight-card';
            button.setAttribute('aria-label', '查看精選照片 ' + (photo.date || dayOf(photo)));
            const img = document.createElement('img');
            img.src = photo.thumbnailUrl || photo.thumbUrl || photo.url;
            img.alt = '旅行精選照片';
            img.loading = 'lazy';
            img.decoding = 'async';
            const label = document.createElement('span');
            const place = String(photo.placeName || photo.city || '').trim();
            label.textContent = albumDay === 'all'
                ? (dayOf(photo) === 'other' ? '日期待分類' : dayOf(photo).slice(5).replace('-', '/'))
                : ((place && place !== '無定位') ? place : (photo.date || '旅行回憶'));
            img.addEventListener('error', () => {
                img.hidden = true;
                label.textContent = '照片暫時無法載入';
            }, { once: true });
            button.append(img, label);
            button.addEventListener('click', () => {
                if (typeof root.openLightbox === 'function') root.openLightbox(photo.url, photo.key);
            });
            return button;
        });
        grid.replaceChildren(...cards);
        if (!rows.length) {
            const empty = document.createElement('p');
            empty.className = 'memory-highlight-empty';
            empty.textContent = '這個日期目前沒有照片，切換上方日期就能查看其他回憶。';
            grid.append(empty);
        }
        if (caption) {
            caption.textContent = !rows.length
                ? '從已上傳的相簿自動顯示；不需要重新上傳照片。'
                : (checked > 0
                    ? '已依畫面清晰度、曝光與拍攝時間挑選 ' + cards.length + ' 張代表照片'
                    : '從現有相簿按拍攝時間分布挑選 ' + cards.length + ' 張；無需重新上傳');
        }
    }
    root.renderMemoryHighlights = function (visiblePhotos, albumDay, dayOf) {
        if (typeof dayOf !== 'function' || !el('todayPhotosContainer')) return;
        const token = ++generation;
        const rows = (Array.isArray(visiblePhotos) ? visiblePhotos : [])
            .filter(p => p && p.key && p.url);
        // Draw immediately, even if remote images disallow cross-origin pixel analysis.
        draw(rows, albumDay, dayOf, null, 0);
        if (!rows.length || !root.VlogSelectionEngine?.pickHighlights || albumDay === 'other') return;
        const key = albumDay + '|' + rows.map(p =>
            [p.key, p.url, p.capturedAt || p.date || ''].join(':')).join('|');
        if (key === latestCacheKey && latestCacheResult) {
            draw(rows, albumDay, dayOf, latestCacheResult.candidates, latestCacheResult.qualityChecked);
            return;
        }
        // Analyze a small, time-distributed sample so the gallery stays responsive.
        const groups = new Map();
        rows.forEach(p => {
            const day = dayOf(p);
            if (!root.VlogSelectionEngine.tripDays.includes(day)) return;
            if (!groups.has(day)) groups.set(day, []);
            groups.get(day).push(p);
        });
        const sample = [...groups.values()].flatMap(photos => spaced(photos, albumDay === 'all' ? 4 : 12));
        if (!sample.length) return;
        Promise.resolve().then(() => root.VlogSelectionEngine.pickHighlights(sample))
            .then(result => {
                if (token !== generation || !result || !Array.isArray(result.candidates)) return;
                latestCacheKey = key;
                latestCacheResult = result;
                if (result.qualityChecked > 0)
                    draw(rows, albumDay, dayOf, result.candidates, result.qualityChecked);
            })
            .catch(() => {
                // The visible, capture-time-based highlights remain usable.
            });
    };
})(window);
