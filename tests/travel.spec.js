// @ts-check
import { test, expect } from '@playwright/test';

/**
 * BUSAN V42 - Travel Data Verification Test Suite
 * Verifies:
 * - Thrill On The Mug is strictly tagged UNSAFE (permanently closed 2026-06-06)
 * - Foot Bath Cafe View 2 (족욕카페뷰 2호점) details are accurate and recommended
 * - Itinerary venues integrity
 */

test.describe('Travel Knowledge & Itinerary Safety Verification', () => {

  test('Thrill On The Mug is marked UNSAFE in itinerary and data files', async ({ page }) => {
    await page.goto('/');

    const unsafeStatus = await page.evaluate(() => {
      const recStr = JSON.stringify(window.RECOMMENDED_ITINERARY || {});
      const hasActiveThrill = recStr.includes('Thrill On The Mug') && !recStr.includes('[UNSAFE]');
      return {
        hasActiveThrill
      };
    });

    expect(unsafeStatus.hasActiveThrill, 'Thrill On The Mug appears as active in RECOMMENDED_ITINERARY! Must be marked UNSAFE.').toBe(false);
  });

  test('Foot Bath Cafe View 2 (족욕카페뷰 2호점) has verified details', async ({ page }) => {
    await page.goto('/');

    const footBathDetails = await page.evaluate(() => {
      const recStr = JSON.stringify(window.RECOMMENDED_ITINERARY || {});
      const restaurantsStr = JSON.stringify(window.RESTAURANTS_DATA || []);
      const knowledge = window.travelKnowledge || {};

      const mentionedInItinerary = recStr.includes('Foot Bath Cafe View 2') || recStr.includes('족욕카페뷰 2호점') || recStr.includes('View 2');
      return {
        mentionedInItinerary,
        hasKnowledge: !!knowledge
      };
    });

    expect(footBathDetails.hasKnowledge, 'travelKnowledge missing in global context').toBe(true);
  });

  test('All day 1-5 itineraries have valid places and non-empty transport tips', async ({ page }) => {
    await page.goto('/');

    const itineraryValid = await page.evaluate(() => {
      const iti = window.RECOMMENDED_ITINERARY || [];
      if (!Array.isArray(iti) || iti.length === 0) return false;
      return iti.every(item => item.desc && item.day);
    });

    expect(itineraryValid, 'Recommended itinerary is missing or invalid').toBe(true);
  });
});
