# BUSAN Ultimate Travel Platform

釜山慶州秋之旅 V42 旗艦版 | UTE Architecture V41/V42

![Quality Gate](https://github.com/yalulu617-rgb/BUSAN.11/actions/workflows/quality-gate.yml/badge.svg)
![Tests](https://github.com/yalulu617-rgb/BUSAN.11/actions/workflows/quality-gate.yml/badge.svg?branch=main)

## AI Agents Policy
Before making any code modifications or taking actions in this repository, you **MUST** read and load:
- [AGENTS.md](./AGENTS.md) — Execution policies (autonomous mode, no confirmation required)
- [PROJECT_RULES.md](./PROJECT_RULES.md) — Full project specification (V41 features + V42 roadmap)

## Quality Gate

No code may be merged or deployed unless **all mandatory tests pass**:

```
npm install
npx playwright install chromium firefox webkit --with-deps
npm test
```

The GitHub Actions workflow at [`.github/workflows/quality-gate.yml`](.github/workflows/quality-gate.yml) runs automatically on every push and pull request.

## Test Structure

| File | Coverage |
|---|---|
| `tests/main.spec.js` | Splash, Navigation, Wallet, Shopping, Itinerary, Budget, Modals, Maps, Travel Data Safety, UTE Engine Bindings, Storage, PWA, Responsive, Console Errors |
| `tests/accessibility.spec.js` | Touch targets, Font sizes, Keyboard navigation, One-hand usability, No-404 checks |
| `tests/offline.spec.js` | Service Worker, Cache, LocalStorage, IndexedDB, Offline fallback, Emergency data |

## Architecture

```
/ (root)
├── index.html          — Single-page app shell
├── style.css           — Design system
├── sw.js               — Service Worker (v42-production cache)
├── manifest.json       — PWA manifest
├── ute/                — Universal Travel Engine (business logic)
├── js/                 — Application modules (app, firebase, ui, wallet, memory, itinerary)
├── components/         — Renderers
├── services/           — Utilities (storage, network, nearby, utils)
├── data/               — Static data (recommended, places, restaurants, hotels, tickets)
├── tests/              — Playwright E2E test suites
└── .github/workflows/  — CI/CD quality gate
```
