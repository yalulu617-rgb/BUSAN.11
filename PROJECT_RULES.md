# Project Specification: BUSAN Ultimate Travel Platform

## Project Goal
Build a production-ready, offline-ready, parent-friendly, and one-hand usable travel app for Busan and Gyeongju.

---

## V41 Core Specifications
- **Travel Wallet**: Centralized storage for tickets, boarding passes, booking vouchers, and offline documents.
- **Hero Card**: Glanceable home widget displaying simulated dates, cities, active weather status, next destination, and key alerts.
- **Today Card**: Summary of today's active destinations.
- **Nearby**: Smart Nearby Life Radar searching convenience stores, cafes, pharmacies, and restaurants within 800m of the hotel.
- **Shopping**: Categorized shopping lists supporting Olive Young, supermarkets, and custom items with check states.
- **Budget**: Shared bill calculations, private tracking, live KRW/TWD exchange rates, and interactive budgets.
- **Memory**: Digital polaroid photo album supporting batch uploads and search.
- **Hotel**: Comprehensive lodging details, address copies, check-in instructions, and taxi card helpers.
- **PWA & Offline**: Service Worker caches all assets. Offline fallback storage prevents data loss under spotty network connections.

---

## V42 Upgrade Roadmap
- **Today Mode**: Toggle to show only today's schedule, tickets, and navigation.
- **Today's Spending Card**: Live dashboard showing current day's charges.
- **Today's Tickets**: Float today's barcodes and QR codes to the top of the wallet.
- **Today's Navigation**: Native Naver/Kakao app integration with walking and driving routes.
- **Flight Countdown**: Visual indicators for flights, check-in windows, and gate changes.
- **Emergency Dashboard**: Fast accessibility to passports, medical hotlines, and insurance documents.
- **Subway Companion**: Transit guides, transfer assistance, and last train reminders.
- **Offline Speech Cards**: Common Korean speech templates available directly on the homepage.
- **Geofenced Shopping**: Automated alerts and checklists based on simulated regions.
- **Daily Summaries & Reminders**: Health reminders, battery levels, packing/return audits, and tax refund helper.

---

## Travel Verification Rules

### Attraction & Restaurant Verification
- Every spot must be validated against Google Maps, Naver Map, Kakao Map, official web sources, latest reviews, and notices.
- **Thrill On The Mug (影島咖啡)**:
  - **STATUS: ⛔ UNSAFE — PERMANENTLY CLOSED**
  - Official Instagram announcement: Permanently closed as of **2026-06-06** (June 6, 2026).
  - Verified via live search. Removed from all itinerary data and recommendation lists.
  - **Replacement**: Lisboa Café (흰여울문화마을) — verified open, widest ocean-view terrace in Yeongdo.
- **Foot Bath Cafe View 2 (족욕카페뷰 2호점)**:
  - **STATUS: ✅ VERIFIED OPEN**
  - Address: 흰여울길 207, 영도구 부산 (Yeongdo-gu, NOT Haeundae)
  - Hours: ~10:00–19:30 (may vary by season)
  - Price: ₩15,000–16,000 per 30 minutes (cash/bank transfer discount available)
  - Reservation: Walk-in queue system; arrive early at peak hours
  - **⚠️ WARNING**: 절영해안산책로 (coastal walkway) is under construction and closed until December 2026 due to wall collapse risk. Access via village alley lanes instead.
  - Inserted into Day 4 (11/16) itinerary at 15:00.

### Transportation & Routes
- Prioritize low-friction pathways for suitcases and parents (avoiding steep slopes, stairs, and long walks).
- Sunny/Rain weather versions with indoor backups are prepared for every day.

### Risk Levels
- Classify destinations as `SAFE`, `WARNING`, or `UNSAFE` depending on status. Provide active alternatives.

---

## Verification & Testing Policy
- Always verify all changes using:
  - Syntax scans (`node -c`).
  - Mobile responsiveness and accessibility checks.
  - Offline compatibility testing.
  - Git auto-committing with Conventional Commits.
