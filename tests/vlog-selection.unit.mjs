import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function engine(quality = false) {
  const window = {};
  class Image {
    get src() { return this._src; }
    set src(value) {
      this._src = value;
      setTimeout(() => quality ? this.onload?.() : this.onerror?.(new Error('synthetic CORS denial')), 0);
    }
  }
  const document = quality ? { createElement: () => {
    let source = '';
    return { getContext: () => ({
      drawImage: image => { source = image.src; },
      getImageData: () => {
        const data = new Uint8ClampedArray(36 * 36 * 4);
        const dark = source.includes('/dark');
        const blurred = source.includes('/blurred');
        for (let y = 0; y < 36; y++) for (let x = 0; x < 36; x++) {
          const i = (y * 36 + x) * 4;
          const value = dark ? 5 : blurred ? 128 : ((x + y) % 2 ? 230 : 25);
          data[i] = data[i + 1] = data[i + 2] = value;
          data[i + 3] = 255;
        }
        return { data };
      }
    }) };
  } } : undefined;
  vm.runInNewContext(fs.readFileSync(new URL('../ute/ute_vlog.js', import.meta.url), 'utf8'), {
    window, Image, document, setTimeout, clearTimeout, Map, Set, Promise, Array, String, Math
  });
  return window.VlogSelectionEngine;
}

test('selects and balances real dated photos across all five trip days', async () => {
  const vlog = engine();
  const photos = [];
  for (let day = 13; day <= 17; day++) {
    for (let photo = 0; photo < 8; photo++) {
      photos.push({
        key: `${day}-${photo}`,
        url: `https://images.example/${day}-${photo}.jpg`,
        capturedAt: `2026-11-${day}T${String(8 + photo).padStart(2, '0')}:00:00`,
        date: `2026-11-${day}`
      });
    }
  }
  photos.push({ key: 'outside', url: 'https://images.example/outside.jpg', capturedAt: '2026-11-18T09:00:00', date: '2026-11-18' });
  const result = await vlog.pickHighlights(photos);
  assert.deepEqual(Array.from(result.dates), Array.from(vlog.tripDays));
  assert.equal(result.selected.length, 20);
  for (const day of vlog.tripDays) {
    assert.equal(result.selected.filter(photo => photo._vlogDate === day).length, 4);
  }
  assert.ok(result.selected.every(photo => photo._vlogDate !== '2026-11-18'));
  const selectedOrder = Array.from(result.selected, photo => photo._vlogDate + photo.capturedAt);
  assert.deepEqual(selectedOrder.slice().sort(), selectedOrder);
});

test('does not invent photos or dates for missing and out-of-trip records', async () => {
  const vlog = engine();
  const result = await vlog.pickHighlights([
    { key: 'missing-date', url: 'https://images.example/no-date.jpg' },
    { key: 'wrong-day', url: 'https://images.example/wrong-day.jpg', capturedAt: '2026-11-12T10:00:00' }
  ]);
  assert.deepEqual(Array.from(result.dates), []);
  assert.deepEqual(Array.from(result.selected), []);
});

test('redistributes picks from a sparse day without letting one full day dominate', async () => {
  const vlog = engine();
  const photos = [];
  for (let day = 13; day <= 17; day++) {
    const count = day === 13 ? 2 : 8;
    for (let i = 0; i < count; i++) photos.push({
      key: `${day}-${i}`, url: `https://images.example/${day}-${i}.jpg`,
      capturedAt: `2026-11-${day}T${String(8 + i).padStart(2, '0')}:00:00`
    });
  }
  const result = await vlog.pickHighlights(photos);
  const counts = Array.from(vlog.tripDays, day => result.selected.filter(photo => photo._vlogDate === day).length);
  assert.equal(result.selected.length, 20);
  assert.equal(counts[0], 2);
  assert.ok(Math.max(...counts) <= 5);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 3);
});

test('quality heuristics drop very dark and extremely soft frames, keeping a clear exposure', async () => {
  const vlog = engine(true);
  const result = await vlog.pickHighlights([
    { key: 'clear', url: 'https://images.example/clear.jpg', capturedAt: '2026-11-13T10:00:00' },
    { key: 'dark', url: 'https://images.example/dark.jpg', capturedAt: '2026-11-13T10:01:00' },
    { key: 'blurred', url: 'https://images.example/blurred.jpg', capturedAt: '2026-11-13T10:02:00' }
  ]);
  assert.equal(result.qualityChecked, 3);
  assert.equal(result.qualityRejected, 2);
  assert.deepEqual(Array.from(result.selected, photo => photo.key), ['clear']);
});

test('montage includes the requested title, ending, local EXIF reader, and no mtime date fallback', () => {
  const source = fs.readFileSync(new URL('../js/vlog.js', import.meta.url), 'utf8');
  assert.match(source, /BUSAN × GYEONGJU 2026/);
  assert.match(source, /Our Autumn Memories/);
  assert.match(source, /PhotoLocalSafety\?\.readExif/);
  assert.doesNotMatch(source, /file\.lastModified/);
});
