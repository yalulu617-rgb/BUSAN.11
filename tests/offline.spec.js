// @ts-check
import { test, expect } from '@playwright/test';

/**
 * BUSAN V42 – Offline & PWA Test Suite
 * Tests: Service Worker, cache behavior, offline fallback,
 *        LocalStorage, IndexedDB availability, offline ticket/hotel access.
 */

import { bootApp } from './helpers/boot.js';


// ── Service Worker ────────────────────────────────────────────────────────────
test.describe('Service Worker', () => {

  test('sw.js registers successfully', async ({ page }) => {
    await bootApp(page);
    
    // Give SW time to register
    await page.waitForTimeout(2000);
    
    const swState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'unsupported';
      try {
        const reg = await navigator.serviceWorker.ready;
        return reg.active ? 'active' : 'registered';
      } catch {
        return 'failed';
      }
    });
    
    expect(['active', 'registered'], `SW state: ${swState}`).toContain(swState);
  });

  test('sw.js contains all required cache entries', async ({ page }) => {
    const response = await page.request.get('/sw.js');
    const body = await response.text();
    
    const requiredEntries = [
      './index.html',
      './manifest.json',
      './icon.png',
      './13972.png',
      './style.css',
      './data/release.json',
      './js/app.js',
      './components/renderers.js',
      './ute/ute_storage.js',
      './ute/ute_network.js',
      './data/recommended.js',
    ];
    
    for (const entry of requiredEntries) {
      expect(body, `sw.js missing cache entry: ${entry}`).toContain(entry);
    }
  });

  test('Network-only domains are correctly excluded from cache', async ({ page }) => {
    const response = await page.request.get('/sw.js');
    const body = await response.text();
    
    expect(body).toContain('firebase');
    expect(body).toContain('wttr.in');
    expect(body).toContain('imgbb');
    expect(body).toContain('NETWORK_ONLY');
  });
});

// ── LocalStorage ──────────────────────────────────────────────────────────────
test.describe('LocalStorage Availability & Data Persistence', () => {

  test('LocalStorage is available', async ({ page }) => {
    await bootApp(page);
    
    const available = await page.evaluate(() => {
      try {
        localStorage.setItem('__test__', '1');
        const ok = localStorage.getItem('__test__') === '1';
        localStorage.removeItem('__test__');
        return ok;
      } catch {
        return false;
      }
    });
    expect(available, 'LocalStorage not available').toBe(true);
  });

  test('StorageEngine persists and retrieves complex objects', async ({ page }) => {
    await bootApp(page);
    
    const testData = { name: 'Playwright Test', day: '11/13', amount: 50000 };
    
    const retrieved = await page.evaluate((data) => {
      window.StorageEngine.set('__playwright_test__', data);
      const result = window.StorageEngine.get('__playwright_test__', null);
      window.StorageEngine.remove('__playwright_test__');
      return result.data;
    }, testData);
    
    expect(retrieved).toEqual(testData);
  });

  test('Private bills persist in localStorage across tab switches', async ({ page }) => {
    await bootApp(page);
    
    // Store a private bill
    await page.evaluate(() => {
      const bills = window.StorageEngine.get('busan_v36_p_bills', []).data || [];
      bills.push({ id: 'playwright-test', name: 'Test Bill', amt: 1000, currency: 'KRW' });
      window.StorageEngine.set('busan_v36_p_bills', bills);
      window.privateBills = bills;
    });
    
    // Switch tabs
    await page.locator('#tab-wallet').click();
    await page.locator('#tab-bill').click();
    
    // Verify bills still in storage
    const storedBills = await page.evaluate(() => {
      const bills = window.StorageEngine.get('busan_v36_p_bills', []).data || [];
      return bills.filter(b => b.id === 'playwright-test').length;
    });
    
    expect(storedBills).toBe(1);
    
    // Clean up
    await page.evaluate(() => {
      const bills = window.StorageEngine.get('busan_v36_p_bills', []).data || [];
      const filtered = bills.filter(b => b.id !== 'playwright-test');
      window.StorageEngine.set('busan_v36_p_bills', filtered);
    });
  });
});

// ── IndexedDB ─────────────────────────────────────────────────────────────────
test.describe('IndexedDB Availability', () => {

  test('IndexedDB is available in browser context', async ({ page }) => {
    await bootApp(page);
    
    const available = await page.evaluate(async () => {
      if (!window.indexedDB) return false;
      return new Promise((resolve) => {
        const req = indexedDB.open('__playwright_test__', 1);
        req.onsuccess = () => { req.result.close(); indexedDB.deleteDatabase('__playwright_test__'); resolve(true); };
        req.onerror = () => resolve(false);
      });
    });
    
    expect(available, 'IndexedDB not available').toBe(true);
  });
});

// ── Offline Fallback ──────────────────────────────────────────────────────────
test.describe('Offline Fallback Behavior', () => {

  test('Critical data accessible from localStorage when offline-simulated', async ({ page }) => {
    await bootApp(page);
    
    // Pre-populate localStorage as if app had been used before
    await page.evaluate(() => {
      const sampleItinerary = [
        { key: 'test1', day: '11/13', time: '09:00', desc: 'Test offline iti', tr: '🚶', map: '' }
      ];
      window.StorageEngine.set('busan_v36_itinerary', sampleItinerary);
    });
    
    // Simulate offline: intercept all network requests
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      // Only block external network, not local assets
      if (url.includes('firebase') || url.includes('exchangerate') || url.includes('imgbb')) {
        await route.abort();
      } else {
        await route.continue();
      }
    });
    
    // Reload and verify app still boots from local data
    await page.reload();
    await page.waitForSelector('#mainApp', { state: 'visible', timeout: 10000 });
    
    // App should boot successfully even without Firebase
    await expect(page.locator('#mainApp')).toBeVisible();
    
    // Unroute
    await page.unrouteAll();
  });

  test('Offline queue initializes without error', async ({ page }) => {
    await bootApp(page);
    
    const queueAvailable = await page.evaluate(() => {
      try {
        const queue = window.StorageEngine.get('pendingSyncQueue', []).data;
        return Array.isArray(queue);
      } catch {
        return false;
      }
    });
    
    expect(queueAvailable, 'Offline sync queue not initializable').toBe(true);
  });

  test('Emergency data (hotel phone, hospital) is accessible offline', async ({ page }) => {
    await bootApp(page);
    
    const emergencyData = await page.evaluate(() => {
      const knowledge = window.travelKnowledge || {};
      const busan = knowledge.cities && knowledge.cities.Busan;
      return {
        hasHospital: !!(busan && busan.emergency && busan.emergency.hospital),
        hasPolice: !!(busan && busan.emergency && busan.emergency.police),
        hasMedical: !!(busan && busan.emergency && busan.emergency.medical),
      };
    });
    
    expect(emergencyData.hasHospital, 'Hospital emergency contact missing').toBe(true);
    expect(emergencyData.hasPolice, 'Police emergency contact missing').toBe(true);
    expect(emergencyData.hasMedical, 'Medical emergency number missing').toBe(true);
  });
});
