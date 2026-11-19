// 60-second travel montage. Runs entirely in the viewer's browser.
// Never rewrites stored photos or uploads them to an editing service.
(function () {
    'use strict';
    let picks = [];
    let processing = false;
    let activeRecorder = null;
    let activeFrame = null;
    let cancelled = false;

    const $ = id => document.getElementById(id);
    const message = text => { if ($('vlogStatus')) $('vlogStatus').textContent = text; };
    function busy(value) {
        processing = value;
        ['vlogPickBtn', 'vlogDownloadBtn'].forEach(id => {
            const btn = $(id);
            if (btn) btn.disabled = value;
        });
        if ($('vlogCancelBtn')) $('vlogCancelBtn').hidden = !value || !activeRecorder;
    }
    function notifyError(err) {
        console.error('[VLOG]', err);
        message(err?.message || '影片製作失敗，請稍後再試。');
        if (typeof window.showToast === 'function') window.showToast('VLOG 製作未完成', 'warning');
    }
    function pictureCard(photo) {
        const holder = document.createElement('div');
        holder.style.cssText = 'min-width:0;background:#fffaf4;border:1px solid #ead8c6;border-radius:12px;overflow:hidden;';
        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = photo.placeName || photo.city || '精選照片';
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;aspect-ratio:3/4;object-fit:cover;display:block;';
        const text = document.createElement('div');
        text.style.cssText = 'padding:5px;font-size:10px;font-weight:700;color:#785f54;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        text.textContent = photo.placeName || photo.city || '旅行片段';
        holder.append(img, text);
        return holder;
    }
    function drawStoryboard() {
        const board = $('vlogStoryboard');
        if (!board) return;
        board.innerHTML = '';
        const days = [...new Set(picks.map(p => p._vlogDate))];
        days.forEach(day => {
            const group = document.createElement('section');
            const heading = document.createElement('h4');
            heading.textContent = day.replaceAll('-', '/') + ' · ' + picks.filter(p => p._vlogDate === day).length + ' 張';
            heading.style.cssText = 'margin:12px 0 6px;color:#986137;font-size:0.85rem;';
            const gallery = document.createElement('div');
            gallery.style.cssText = 'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;';
            picks.filter(p => p._vlogDate === day).forEach(p => gallery.appendChild(pictureCard(p)));
            group.append(heading, gallery);
            board.appendChild(group);
        });
        if ($('vlogDownloadBtn')) $('vlogDownloadBtn').hidden = picks.length === 0;
    }

    window.prepareVlog = async function () {
        if (processing) return;
        const records = Array.isArray(window.photoList) ? window.photoList : [];
        if (!records.length) {
            message('目前沒有可選的旅行照片，請先確認回憶錄照片已載入。');
            return;
        }
        busy(true);
        picks = [];
        if ($('vlogDownloadBtn')) $('vlogDownloadBtn').hidden = true;
        if ($('vlogStoryboard')) $('vlogStoryboard').innerHTML = '';
        message('正在依日期分類、檢查曝光／清晰度與相似照片…');
        try {
            const result = await window.VlogSelectionEngine.pickHighlights(records, (done, total) => {
                message('正在挑選精選照片 ' + done + ' / ' + total);
            });
            picks = result.selected;
            drawStoryboard();
            if (!picks.length) message('沒有找到具有效拍攝日期與網址的照片，無法製作 VLOG。');
            else {
                message('已從 ' + result.dates.length + ' 天挑出 ' + picks.length +
                    ' 張；' + (result.qualityChecked
                    ? ('成功完成 ' + result.qualityChecked + ' 張畫面品質檢查。')
                    : '照片來源不允許畫面分析，改採拍攝時間分散挑選。') +
                    ' 可預覽精選後，點擊下方下載短片。');
            }
        } catch (error) {
            notifyError(error);
        } finally { busy(false); }
    };

    function makeSlide(img) {
        const w = 720, h = 1280;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        // Full-width soft background, so landscape shots are not cropped.
        const cover = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const bgW = img.naturalWidth * cover, bgH = img.naturalHeight * cover;
        ctx.save();
        ctx.filter = 'blur(30px) brightness(0.65)';
        ctx.drawImage(img, (w - bgW) / 2 - 30, (h - bgH) / 2 - 30, bgW + 60, bgH + 60);
        ctx.restore();
        const fit = Math.min((w * 0.96) / img.naturalWidth, (h * 0.79) / img.naturalHeight);
        const pw = img.naturalWidth * fit, ph = img.naturalHeight * fit;
        ctx.drawImage(img, (w - pw) / 2, (h - ph) / 2, pw, ph);
        return canvas;
    }
    function caption(ctx, first, second) {
        const gradient = ctx.createLinearGradient(0, 950, 0, 1280);
        gradient.addColorStop(0, 'rgba(35,25,20,0)');
        gradient.addColorStop(1, 'rgba(35,25,20,0.82)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 950, 720, 330);
        ctx.fillStyle = '#fff8ee';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 7;
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText(String(first).slice(0, 22), 360, 1120, 650);
        ctx.font = '28px sans-serif';
        ctx.fillText(String(second).slice(0, 30), 360, 1175, 650);
        ctx.shadowBlur = 0;
    }
    function renderMontage(ctx, frames, elapsed) {
        ctx.clearRect(0, 0, 720, 1280);
        const introSeconds = 2;
        if (elapsed < introSeconds) {
            ctx.drawImage(frames[0].canvas, 0, 0, 720, 1280);
            ctx.fillStyle = 'rgba(48,31,31,0.5)';
            ctx.fillRect(0, 0, 720, 1280);
            ctx.fillStyle = '#fff9f2';
            ctx.font = 'bold 58px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('BUSAN × GYEONGJU', 360, 610, 685);
            ctx.font = '30px sans-serif';
            ctx.fillText('2026 · 旅行回憶', 360, 672);
            return;
        }
        const duration = (60 - introSeconds) / frames.length;
        const slideTime = Math.min(60 - introSeconds - 0.001, elapsed - introSeconds);
        const i = Math.min(frames.length - 1, Math.floor(slideTime / duration));
        const within = slideTime - i * duration;
        const zoom = 1 + Math.min(0.022, within / duration * 0.022);
        function photoLayer(frame, alpha) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(360, 640);
            ctx.scale(zoom, zoom);
            ctx.drawImage(frame.canvas, -360, -640, 720, 1280);
            ctx.restore();
        }
        photoLayer(frames[i], 1);
        const fadeWindow = Math.min(0.35, duration / 5);
        if (i + 1 < frames.length && within > duration - fadeWindow) {
            photoLayer(frames[i + 1], (within - duration + fadeWindow) / fadeWindow);
        }
        const p = frames[i].photo;
        caption(ctx, p._vlogDate.replaceAll('-', '/'), p.placeName || p.city || '旅途中');
    }

    window.cancelVlogExport = function () {
        cancelled = true;
        if (activeFrame !== null) cancelAnimationFrame(activeFrame);
        activeFrame = null;
        if (activeRecorder && activeRecorder.state !== 'inactive') activeRecorder.stop();
        message('已取消影片製作，沒有儲存檔案。');
    };

    window.exportVlog = async function () {
        if (processing) return;
        if (!picks.length) {
            message('請先點擊「自動挑選每天精選」。');
            return;
        }
        if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
            message('這個瀏覽器不支援直接輸出短片，建議使用 Android Chrome。');
            return;
        }
        const formats = ['video/mp4;codecs=avc1.42E01E', 'video/mp4',
            'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        const mimeType = formats.find(type => MediaRecorder.isTypeSupported(type));
        if (!mimeType) { message('此瀏覽器沒有可用的影片編碼器，無法輸出。'); return; }
        busy(true);
        cancelled = false;
        const frames = [];
        let stream = null;
        try {
            // Downsample a single source image at a time. Stored originals stay intact.
            for (let i = 0; i < picks.length; i++) {
                message('準備影片畫面 ' + (i + 1) + ' / ' + picks.length);
                const img = await window.VlogSelectionEngine.loadImage(picks[i].url);
                frames.push({ photo: picks[i], canvas: makeSlide(img) });
                if (cancelled) return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = 720;
            canvas.height = 1280;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('無法建立影片畫布');
            renderMontage(ctx, frames, 0);
            stream = canvas.captureStream(24);
            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3600000 });
            activeRecorder = recorder;
            if ($('vlogCancelBtn')) $('vlogCancelBtn').hidden = false;
            const chunks = [];
            const recording = new Promise((resolve, reject) => {
                recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
                recorder.onerror = event => reject(event.error || new Error('影片編碼失敗'));
                recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
            });
            recorder.start(1000);
            const startTime = performance.now();
            const paint = now => {
                if (cancelled || recorder.state === 'inactive') return;
                const elapsed = Math.min((now - startTime) / 1000, 60);
                renderMontage(ctx, frames, elapsed);
                message('正在生成影片：' + Math.min(60, Math.floor(elapsed)) +
                    ' / 60 秒。請保持此頁開啟。');
                if (elapsed >= 60) recorder.stop();
                else activeFrame = requestAnimationFrame(paint);
            };
            activeFrame = requestAnimationFrame(paint);
            const blob = await recording;
            if (!cancelled && blob.size) {
                const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
                const link = document.createElement('a');
                const objectUrl = URL.createObjectURL(blob);
                link.href = objectUrl;
                link.download = 'BUSAN11_2026_60sec_VLOG.' + extension;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
                message('影片已生成並送出下載（' + extension.toUpperCase() +
                    '，720×1280，約 60 秒，無配樂）。原始照片未修改。');
                if (typeof window.showToast === 'function') window.showToast('VLOG 已完成', 'success');
            } else if (!cancelled) {
                throw new Error('影片未產生有效資料');
            }
        } catch (error) {
            if (!cancelled) {
                if (/跨網域|照片站|影像/.test(String(error?.message || ''))) {
                    message('照片來源不允許瀏覽器擷取影片畫面；原圖仍安全保存。需要改用可本機讀取的原始照片。');
                } else notifyError(error);
            }
        } finally {
            if (activeFrame !== null) cancelAnimationFrame(activeFrame);
            activeFrame = null;
            if (stream) stream.getTracks().forEach(t => t.stop());
            if (activeRecorder && activeRecorder.state !== 'inactive') activeRecorder.stop();
            activeRecorder = null;
            busy(false);
        }
    };
})();
