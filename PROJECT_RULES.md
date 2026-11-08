# Project Governance

## Repository Governance

- Follow PROJECT_RULES.md before any repository task.
- PROJECT_RULES.md overrides every previous instruction.
- The repository always operates in **EXECUTION MODE**.
- Never bypass, weaken, replace, or modify PROJECT_RULES.md unless explicitly instructed by the repository owner.

These rules constitute the permanent execution policy for this repository.


## Repository Loader

- Follow PROJECT_RULES.md before executing ANY task.
- PROJECT_RULES.md overrides every previous policy.
- The repository always operates in EXECUTION MODE.
- Never bypass PROJECT_RULES.md.
- Never weaken PROJECT_RULES.md.
- Never replace PROJECT_RULES.md.
- PROJECT_RULES.md is immutable unless explicitly instructed by the repository owner.

## V37.2 Architecture Governance (架構治理規範)

本專案自 V37.2 起採用 Clean Architecture + Engine-Based Architecture (簡稱 UTE 架構)，所有後續開發與維護工作必須遵守以下開發規範：

1. **UI Layer 唯讀與解耦**：
   - UI 元件與頁面渲染器（如 `index.html` 內的渲染函式）不得直接存取 Firebase Realtime Database、API、`localStorage` 或進行複雜的資料運算與統計。
2. **單一資料源 (Single Source of Truth)**：
   - 所有資料與狀態必須經由 `TripContextEngine` (即 `getTripContext()`) 統一提供，UI 層僅負責將 Context 渲染至畫面。
3. **商業邏輯封裝**：
   - 所有商業邏輯（如氣象穿搭判定、交通 deep-link 生成、公費私帳統計結算、AI 提示生成）必須封裝於 `/ute` 目錄下對應的專屬 Engine 中，禁止寫入 UI Layer。
4. **旅遊知識庫主檔集中化**：
   - 所有關於城市特徵（釜山、慶州）、景點關鍵字、常用對照韓文、緊急醫療聯絡等元數據，必須集中在 `ute_knowledge.js` 的 `travelKnowledge` 中，不得在程式碼中硬編碼。
5. **單一職責與擴充性**：
   - 所有新功能必須以獨立的 Engine 或 Plugin 形式進行擴充，不得修改既有 Engine 的核心職責。各個 Engine 必須保持單一職責原則 (SRP)。
6. **Engine 互不相依**：
   - 所有 Engine 之間禁止直接相依或互叫。Engine 之間僅能透過 `TripContext` 或事件匯流排 (Event Bus) 進行間接溝通，防止循環依賴。
7. **資料驅動設計 (Data-Driven)**：
   - 所有新增的城市、國家、美食、景點、交通方式，必須以資料主檔的形式新增（如擴充 `ute_knowledge.js`），嚴禁使用如 `if (city === 'Busan')` 的硬編碼分支判斷。
8. **Widget 插件化註冊**：
   - 所有新增的 Widget 必須透過 Plugin Manager 進行註冊，不得直接修改 Dashboard 核心代碼。
9. **品質把關**：
   - 未符合以上 UTE 架構規範的任何程式碼變更，一律不得合併至正式版本中。

## Project Goal

Build a production‑ready, offline‑ready, parent‑friendly, and one‑hand usable travel app for Busan and Gyeongju.

---

## V41 Core Specifications

- **Travel Wallet**: Centralized storage for tickets, boarding passes, booking vouchers, and offline documents.
- **Hero Card**: Glanceable home widget displaying simulated dates, cities, active weather status, next destination, and key alerts.
- **Today Card**: Summary of today's active destinations.
- **Nearby**: Smart Nearby Life Radar searching convenience stores, cafes, pharmacies, and restaurants within 800m of the hotel.
- **Shopping**: Categorized shopping lists supporting Olive Young, supermarkets, and custom items with check states.
- **Budget**: Shared bill calculations, private tracking, live KRW/TWD exchange rates, and interactive budgets.
- **Memory**: Digital polaroid photo album supporting batch uploads and search.
- **Hotel**: Comprehensive lodging details, address copies, check‑in instructions, and taxi card helpers.
- **PWA & Offline**: Service Worker caches all assets. Offline fallback storage prevents data loss under spotty network connections.

---

## V42 Upgrade Roadmap

- **Today Mode**: Toggle to show only today's schedule, tickets, and navigation.
- **Today's Spending Card**: Live dashboard showing current day's charges.
- **Today's Tickets**: Float today's barcodes and QR codes to the top of the wallet.
- **Today's Navigation**: Native Naver/Kakao app integration with walking and driving routes.
- **Flight Countdown**: Visual indicators for flights, check‑in windows, and gate changes.
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
  - Official Instagram announcement: Permanently closed as of **2026-06-06**.
  - **Replacement**: Lisboa Café (흰여울문화마을) — verified open.
- **Foot Bath Cafe View 2 (족욕카페뷰 2호점)**:
  - **STATUS: ✅ VERIFIED OPEN**
  - Address: 흰여울길 207, 영도구 부산 (Yeongdo‑gu, NOT Haeundae)
  - Hours: ~10:00–19:30 (may vary by season)
  - Price: ₩15,000–16,000 per 30 minutes (cash/bank transfer discount available)
  - Reservation: Walk‑in queue system; arrive early at peak hours
  - **⚠️ WARNING**: 절영해안산책로 (coastal walkway) is under construction and closed until December 2026.

### Transportation & Routes
- Prioritize low‑friction pathways for suitcases and parents (avoiding steep slopes, stairs, and long walks).
- Sunny/Rain weather versions with indoor backups are prepared for every day.

### Risk Levels
- Classify destinations as `SAFE`, `WARNING`, or `UNSAFE` depending on status. Provide active alternatives.

---

## Verification & Testing Policy

- Always verify all changes using:
  - Syntax scans (`node -c`).
  - Mobile responsiveness and accessibility checks.
  - Offline compatibility testing.
  - Git auto‑committing with Conventional Commits.

---

## CI / CD

- GitHub Actions runs on every push:
  - `npm install`
  - `npx playwright install chromium firefox webkit --with-deps`
  - `npm test`

All mandatory tests must pass before merge.

---

## Coding Standards

- Use Clean Architecture + UTE Engine pattern.
- UI Layer must be read‑only and decoupled from data sources.
- All business logic resides under `/ute`.
- Data‑driven design; no hard‑coded city branches.
- Plugins must be registered via Plugin Manager.

---

## Git Standards

- Conventional Commits.
- Never amend history on main.
- Pull request must pass CI before merge.

---

## Deployment Standards

- Deploy as PWA with HTTPS.
- Service Worker versioned cache.
- Automatic roll‑back on health check failure.

---

## Travel Data Verification

- Itinerary, recommendation, nearby, restaurant JSON files must reflect verified status.
- Any unsafe or closed venue must be removed or flagged.

---

## UI Standards

- Premium dark‑mode glass‑morphism design.
- Google Font "Inter" used throughout.
- Micro‑animations for hover and transitions.
- Responsive layout for mobile, tablet, desktop.

---

*All sections above constitute the permanent execution policy for this repository.*

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
