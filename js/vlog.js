// 60-second travel montage. Runs entirely in the viewer's browser.
// Never rewrites stored photos or uploads them to an editing service.
(function () {
    'use strict';
    let picks = [];
    let alternatives = [];
    let localUrls = [];
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
    function releaseLocalFiles() {
        localUrls.forEach(url => URL.revokeObjectURL(url));
        localUrls = [];
    }
    function removePick(photo) {
        picks = picks.filter(item => item !== photo);
        drawStoryboard();
        message(picks.length ? `已移除照片；目前精選 ${picks.length} 張，可繼續預覽或替換。` : '精選清單目前是空的，請重新自動挑選照片。');
    }
    function replacePick(photo, candidateIndex) {
        const candidate = alternatives[candidateIndex];
        const currentIndex = picks.indexOf(photo);
        if (!candidate || currentIndex < 0 || candidate._vlogDate !== photo._vlogDate ||
            picks.some((item, index) => index !== currentIndex && item.url === candidate.url)) return;
        picks[currentIndex] = candidate;
        picks.sort((a, b) => String(a._vlogDate + (a.capturedAt || a.date || '')).localeCompare(String(b._vlogDate + (b.capturedAt || b.date || ''))));
        drawStoryboard();
        message(`已替換照片；目前精選 ${picks.length} 張。`);
    }
    async function fileDate(file) {
        try {
            const metadata = await window.PhotoLocalSafety?.readExif?.(file);
            if (metadata?.capturedAt) return metadata.capturedAt;
        } catch (_) { /* Continue only to a date embedded in the filename. */ }
        const match = file.name.match(/(20\d{2})(0[1-9]|1[0-2])([0-3]\d)(?:[_-]?([0-2]\d)([0-5]\d))?/);
        if (match) return match[1] + '-' + match[2] + '-' + match[3] +
            (match[4] ? ('T' + match[4] + ':' + match[5] + ':00') : '');
        return '';
    }
    function notifyError(err) {
        console.error('[VLOG]', err);
        message(err?.message || '影片製作失敗，請稍後再試。');
        if (typeof window.showToast === 'function') window.showToast('VLOG 製作未完成', 'warning');
    }
    function pictureCard(photo) {
        const holder = document.createElement('div');
        holder.className = 'vlog-selection-card';
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
            picks.filter(p => p._vlogDate === day).forEach(p => {
                const card = pictureCard(p);
                const controls = document.createElement('div');
                controls.style.cssText = 'display:grid;grid-template-columns:1fr;gap:4px;padding:5px;';
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.textContent = '移除此照片';
                remove.setAttribute('aria-label', `移除 ${day} 精選照片`);
                remove.style.cssText = 'border:1px solid #d8b7a7;border-radius:8px;background:#fff;color:#8b3a26;padding:5px 3px;font-size:10px;';
                remove.addEventListener('click', () => removePick(p));
                const select = document.createElement('select');
                select.setAttribute('aria-label', `選擇 ${day} 替換照片`);
                select.style.cssText = 'width:100%;font-size:10px;padding:4px;';
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = '選擇同日替換照片';
                select.appendChild(placeholder);
                alternatives.forEach((candidate, index) => {
                    if (candidate._vlogDate !== day || candidate.url === p.url ||
                        picks.some(item => item !== p && item.url === candidate.url)) return;
                    const option = document.createElement('option');
                    option.value = String(index);
                    option.textContent = String(candidate.capturedAt || candidate.date || day) + ' · ' +
                        (candidate.placeName || candidate.city || candidate.key || '候選照片');
                    select.appendChild(option);
                });
                const replace = document.createElement('button');
                replace.type = 'button';
                replace.textContent = '替換';
                replace.disabled = select.options.length < 2;
                replace.style.cssText = 'border:1px solid #c9a26b;border-radius:8px;background:#fff8ee;color:#7a4a1c;padding:5px 3px;font-size:10px;';
                replace.addEventListener('click', () => {
                    if (select.value !== '') replacePick(p, Number(select.value));
                });
                controls.append(remove, select, replace);
                card.appendChild(controls);
                gallery.appendChild(card);
            });
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
        releaseLocalFiles();
        picks = [];
        alternatives = [];
        if ($('vlogDownloadBtn')) $('vlogDownloadBtn').hidden = true;
        if ($('vlogStoryboard')) $('vlogStoryboard').innerHTML = '';
        message('正在依日期分類、檢查曝光／清晰度與相似照片…');
        try {
            const result = await window.VlogSelectionEngine.pickHighlights(records, (done, total) => {
                message('正在挑選精選照片 ' + done + ' / ' + total);
            });
            picks = result.selected;
            alternatives = result.candidates || result.selected;
            drawStoryboard();
            if (!picks.length) message('沒有找到具有效拍攝日期與網址的照片，無法製作 VLOG。');
            else {
                message('已從 ' + result.dates.length + ' 天挑出 ' + picks.length +
                    ' 張；' + (result.qualityChecked
                    ? ('完成 ' + result.qualityChecked + ' 張品質啟發式檢查，排除 ' + (result.qualityRejected || 0) + ' 張明顯過暗、過亮或模糊的畫面。')
                    : '照片來源不允許畫面分析，改採拍攝時間分散挑選。') +
                    ' 可預覽精選後，點擊下方下載短片。');
            }
        } catch (error) {
            notifyError(error);
        } finally { busy(false); }
    };

    // Optional on-device fallback if an image host blocks cross-origin canvas
    // access. No cloud upload; the files stay in this browser session.
    window.prepareVlogFromFiles = async function (fileList) {
        if (processing) return;
        const files = Array.from(fileList || []).filter(f =>
            /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
        if (!files.length) {
            message('請選擇照片原始檔，這個入口不支援影片或 ZIP。');
            return;
        }
        busy(true);
        releaseLocalFiles();
        picks = [];
        alternatives = [];
        if ($('vlogStoryboard')) $('vlogStoryboard').innerHTML = '';
        if ($('vlogDownloadBtn')) $('vlogDownloadBtn').hidden = true;
        try {
            const pictures = (await Promise.all(files.map(async (file, i) => {
                const capturedAt = await fileDate(file);
                if (!capturedAt || !window.VlogSelectionEngine.tripDays.includes(capturedAt.slice(0, 10))) return null;
                const url = URL.createObjectURL(file);
                localUrls.push(url);
                return { key: 'local-vlog-' + i, url, capturedAt,
                    date: capturedAt.slice(0, 10), city: '旅途紀錄' };
            }))).filter(Boolean);
            if (!pictures.length) {
                message('所選照片沒有可確認的 2026/11/13–11/17 拍攝日期。請選擇含 EXIF 日期或日期檔名的原圖；不會用檔案修改時間猜日期。');
                releaseLocalFiles();
                return;
            }
            const result = await window.VlogSelectionEngine.pickHighlights(pictures, (done, total) => {
                message('正在從手機原圖選片 ' + done + ' / ' + total);
            });
            picks = result.selected;
            alternatives = result.candidates || result.selected;
            drawStoryboard();
            message(picks.length
                ? ('已從手機原圖選出 ' + picks.length + ' 張；品質檢查排除 ' + (result.qualityRejected || 0) + ' 張明顯過暗、過亮或模糊的畫面。僅在本機製作；日期取自 EXIF 或檔名。')
                : '沒有找到可用的照片。');
        } catch (error) {
            notifyError(error);
        } finally {
            const input = $('vlogLocalFiles');
            if (input) input.value = '';
            busy(false);
        }
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
        const outroSeconds = 2;
        if (elapsed < introSeconds) {
            ctx.drawImage(frames[0].canvas, 0, 0, 720, 1280);
            ctx.fillStyle = 'rgba(48,31,31,0.5)';
            ctx.fillRect(0, 0, 720, 1280);
            ctx.fillStyle = '#fff9f2';
            ctx.font = 'bold 58px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('BUSAN × GYEONGJU 2026', 360, 610, 685);
            ctx.font = '30px sans-serif';
            ctx.fillText('2026 · 旅行回憶', 360, 672);
            return;
        }
        if (elapsed >= 60 - outroSeconds) {
            ctx.drawImage(frames[frames.length - 1].canvas, 0, 0, 720, 1280);
            ctx.fillStyle = 'rgba(35,25,20,0.58)';
            ctx.fillRect(0, 0, 720, 1280);
            ctx.fillStyle = '#fff9f2';
            ctx.textAlign = 'center';
            ctx.font = 'bold 54px sans-serif';
            ctx.fillText('Our Autumn Memories', 360, 650, 680);
            return;
        }
        const duration = (60 - introSeconds - outroSeconds) / frames.length;
        const slideTime = Math.min(60 - introSeconds - outroSeconds - 0.001, elapsed - introSeconds);
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
                    message('照片來源不允許瀏覽器擷取影片畫面；原圖仍安全保存。可使用下方「改用手機原圖」入口在本機製作。');
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
