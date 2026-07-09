# 架構 — 頁面 / 路由 / Shell / Frame

## 路由地圖

`src/router/index.ts`：

| Path | View | 備註 |
| --- | --- | --- |
| `/` → `/shop` | — | 進站導首頁 |
| `/shop` | `HomePage.vue` | 首頁（Banner / 分類 / 熱銷 / Flash sale） |
| `/theme` | `ThemeHallPage.vue` | 主題館 |
| `/category/:tab` | `CategoryPage.vue` | 分類頁；`:tab` 對應 CategoryTabs |
| `/product/:id` | `ProductDetailPage.vue` | 商品內頁 |
| `/cart` | `CartPage.vue` | 購物車（**需登入**） |
| `/checkout` | `CheckoutPage.vue` | 結帳（**需登入**） |
| `/search` | `SearchPage.vue` | 搜尋 |
| `/member` | `MemberCenterPage.vue` | 會員中心（帶 `?tab=orders` 等 query） |
| `/login`, `/register`, `/social-signup`, `/forgot` | Auth 頁 | 走**特殊 layout**，見下 |
| `/terms`, `/privacy`, `/help` | `InfoPage.vue` | 條款 / 隱私 / 幫助（同一元件靠 path 切內容） |

### 登入守衛

`AUTH_REQUIRED = ['/cart', '/checkout']` — 未登入去這兩頁會 `toast('請先登入會員')` 並導 `/login?redirect=<原 fullPath>`。要新增受保護頁，加到這陣列即可。

### 換頁 loading

`router.beforeEach` 開 `ui.setRouteLoading(true)`，`afterEach` 500ms 後關。同一路徑（只改 query / hash）不會觸發。想改延遲改 `router/index.ts` 的 `setTimeout(500)`。

## Aurora shell — 只有 Aurora 走特殊外框

`App.vue` 判斷：

```ts
const isAurora = computed(() => themeStore.current.id === 'aurora');
const AUTH_PATHS = ['/login', '/register', '/forgot', '/social-signup'];
const useAuroraShell = computed(
  () => isAurora.value && !AUTH_PATHS.includes(route.path),
);
```

- 主題 `id === 'aurora'` 且**不在 auth 路徑** → 用 `<AuroraShell>` 包 `<RouterView />`（有側邊 / 底部 nav）。
- 其他主題或 auth 路徑 → 走 `<RouterView />` + `<AppFooter>`。
- Auth 頁在**任何主題**下都不顯示 Footer；`showFooter = route.path !== '/' && !AUTH_PATHS.includes(route.path)`。

**要加新主題** → 只需在 `src/pinia/theme.ts` `themes[]` 新增一組 vars；除非要仿 Aurora 另外做 shell，否則不用動 `App.vue`。

## Viewport frame — 模擬手機 / 平板

`FloatingControls`（右下浮動控制）讓使用者手動選 mobile (390×844) / tablet (768×1024) / PC。選 mobile/tablet 時 `App.vue` 給根 `<div ref="frameRef">` 加固定寬高 + 陰影，變成裝置模擬器。

### 三個關鍵 CSS 變數（`updateFrameVars()` 每次 resize 寫回 `<html>` inline style）

| 變數 | 意義 | 供誰用 |
| --- | --- | --- |
| `--frame-left` | frame 左邊在 viewport 的 px | `position: fixed` 抽屜對齊 frame |
| `--frame-width` | frame 寬度 | 同上 |
| `--frame-bottom` | viewport 底部到 frame 底部的距離 | Drawer 底部貼齊 frame，而不是視窗 |

`<html>` 同時掛 `frame-mode` class，`style.css` 用它條件式覆寫 PrimeVue Drawer mask 定位。

**改抽屜／彈窗**看 [primevue-conventions.md](./primevue-conventions.md)，那邊有完整範例。

### `@container` — RWD 用容器查詢，不是視窗查詢

`<div ref="frameRef" class="@container">`——所有頁面在這個 container 內。因此頁面**寫 `@3xl:`、`@7xl:` 等容器前綴**，而不是 `md:` / `lg:`。因為 frame 縮到 390px 時視窗還可能是 1440px。

前綴對照見 CLAUDE.md「容器查詢斷點」小節；避坑：手機 ↔ 平板切點固定 `@3xl:` (768px)，不要用 `@md:` (448px)。

## 元件分工

- `NavBar.vue` — 頂部（logo / 搜尋 / 分類 / 會員 icon / 購物車 icon）；auth 頁與 Aurora 頁不顯示。
- `CategoryTabs.vue` — 頂部下方的分類 tab bar；同上例外。
- `AppFooter.vue` — 頁尾；`showFooter` 控制。
- `FloatingControls.vue` — 右下開發用浮動控制列（主題 / density / viewport 切換）。
- `PageLoading.vue` — 換頁 loading 遮罩；讀 `ui.routeLoading`。
- `AuroraShell.vue` — Aurora 主題專屬 shell，內含側邊欄 + 底部 tab bar。

## 資料 / 型別

- `src/data/products.ts` — **靜態商品目錄**（單品 / 固定組合 / 任選組合），是 cart / product / category 的資料來源。改商品加規格 → 動這裡。
- `src/types/*.ts` — 型別集中處；`cart.ts`、`order.ts`、`theme.ts`、`viewport.ts`、`density.ts`、`prefs.ts` 都各有一份。store 內用 re-export 對外提供。

## Toast — 全域訊息

`ui.toast(msg, severity?)` → 走 PrimeVue `<Toast>`（`App.vue` `position="top-center"`）。**呼叫前 `removeAllGroups()`**，一次只顯示一則。severity 預設 `'success'`；`'warn'`、`'error'`、`'info'` 依情境。
