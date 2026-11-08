// Shared, dependency-free thumbnails for shopping and nearby items.
(function () {
    const escape = value => String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
    function safeUrl(value) {
        if (!value) return '';
        try {
            const url = new URL(value, document.baseURI);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
        } catch { return ''; }
    }
    function placeholder(label) {
        return `<span class="item-image item-image-placeholder" role="img" aria-label="${escape(label)}：尚無圖片"><span aria-hidden="true">▧</span><small>尚無圖片</small></span>`;
    }
    function render(image, label) {
        const data = typeof image === 'string' ? { thumb: image } : (image || {});
        if (data.storage === 'indexeddb' && data.key) {
            return `<button type="button" class="item-image" aria-label="放大圖片：${escape(label)}" data-item-image-key="${escape(data.key)}" data-item-image-label="${escape(label)}"><img alt="${escape(data.alt || label)}" width="160" height="120" loading="lazy" decoding="async"></button>`;
        }
        const thumb = safeUrl(data.thumb);
        if (!thumb) return placeholder(label);
        return `<button type="button" class="item-image" aria-label="放大圖片：${escape(label)}" data-item-image-preview="${escape(safeUrl(data.full) || thumb)}" data-item-image-label="${escape(label)}" data-item-image-source="${escape(safeUrl(data.source))}" data-item-image-credit="${escape(data.credit)}"><img src="${escape(thumb)}" alt="${escape(data.alt || label)}" width="160" height="120" loading="lazy" decoding="async"></button>`;
    }

    const objectUrls = new WeakMap();
    function release(button) {
        (objectUrls.get(button) || []).forEach(url => URL.revokeObjectURL(url));
        objectUrls.delete(button);
    }
    async function hydrate(button) {
        if (button.dataset.itemImageHydrating) return;
        button.dataset.itemImageHydrating = 'true';
        try {
            const record = await window.ShoppingPhotoEngine?.get(button.dataset.itemImageKey);
            if (!record?.thumb || !record?.full) throw new Error('Photo unavailable');
            const urls = [URL.createObjectURL(record.thumb), URL.createObjectURL(record.full)];
            objectUrls.set(button, urls);
            button.querySelector('img').src = urls[0];
            button.dataset.itemImagePreview = urls[1];
        } catch {
            const replacement = document.createElement('template');
            replacement.innerHTML = placeholder(button.dataset.itemImageLabel);
            button.replaceWith(replacement.content.firstElementChild);
        }
    }
    function scan(root) {
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        if (root.matches?.('[data-item-image-key]')) hydrate(root);
        root.querySelectorAll?.('[data-item-image-key]').forEach(hydrate);
    }
    new MutationObserver(records => records.forEach(record => {
        record.addedNodes.forEach(scan);
        record.removedNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.matches?.('[data-item-image-key]')) release(node);
            node.querySelectorAll?.('[data-item-image-key]').forEach(release);
        });
    })).observe(document.documentElement, { childList: true, subtree: true });

    let dialog;
    let previousFocus;
    function preview(button) {
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.className = 'item-image-dialog';
            dialog.setAttribute('aria-label', '商品與店家圖片預覽');
            dialog.innerHTML = '<button type="button" class="item-image-close" data-item-image-close aria-label="關閉圖片預覽">關閉 ×</button><img class="item-image-full" alt=""><p class="item-image-caption"></p><p class="item-image-status" role="status" hidden>圖片暫時無法載入</p><a class="item-image-credit" target="_blank" rel="noopener noreferrer" hidden></a>';
            document.body.appendChild(dialog);
            dialog.addEventListener('click', event => {
                if (event.target === dialog) dialog.close();
            });
            dialog.addEventListener('close', () => {
                dialog.querySelector('img').removeAttribute('src');
                if (previousFocus?.isConnected) previousFocus.focus();
            });
        }
        previousFocus = button;
        const img = dialog.querySelector('img');
        img.alt = button.dataset.itemImageLabel;
        img.hidden = false;
        img.src = button.dataset.itemImagePreview;
        dialog.querySelector('.item-image-caption').textContent = button.dataset.itemImageLabel;
        dialog.querySelector('.item-image-status').hidden = true;
        const credit = dialog.querySelector('.item-image-credit');
        credit.hidden = !button.dataset.itemImageSource;
        credit.textContent = button.dataset.itemImageCredit || '圖片來源';
        credit.href = button.dataset.itemImageSource || '#';
        dialog.showModal();
    }

    // Capture before the shopping row's click handler so previewing never checks an item.
    document.addEventListener('click', event => {
        const button = event.target.closest?.('[data-item-image-preview], [data-item-image-key]');
        const close = event.target.closest?.('[data-item-image-close]');
        if (!button && !close) return;
        event.preventDefault();
        event.stopPropagation();
        if (button?.dataset.itemImagePreview) preview(button);
        else dialog?.close();
    }, true);
    document.addEventListener('error', event => {
        const img = event.target;
        if (img.tagName !== 'IMG') return;
        const button = img.closest('[data-item-image-preview]');
        if (button) {
            const replacement = document.createElement('template');
            replacement.innerHTML = placeholder(button.dataset.itemImageLabel);
            button.replaceWith(replacement.content.firstElementChild);
        } else if (dialog && img.parentElement === dialog) {
            img.hidden = true;
            dialog.querySelector('.item-image-status').hidden = false;
        }
    }, true);
    window.ItemImages = { render };
})();
