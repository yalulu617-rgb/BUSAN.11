# V37.2 Architecture Governance (架構治理規範)

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
