# docs/ — 商城前台原型開發參考

給 Claude / 工程師在改動這個 repo 時用的**執行手冊**。CLAUDE.md 已經說明格式 / 命名 / RWD 規範，這裡補上「跨檔案的機制」——動了 A 檔要順手看哪些 B / C / D，還有為什麼這樣寫。

## 索引

| 檔案 | 什麼時候該打開 |
| --- | --- |
| [livestream-patterns.md](./livestream-patterns.md) | 直播電商領域 8 條 pattern（購物車拆組、checkoutMode、優惠券層級、加車節奏、未用商城模式等）—做 UI / UX 決策前先過一遍 |
| [architecture.md](./architecture.md) | 摸清路由 / 頁面關係、Aurora shell 與 `@container` frame 的定位邏輯、換頁 loading / 登入守衛 |
| [state-stores.md](./state-stores.md) | 動 Pinia store（cart / orders / ui / theme / density / viewport / auth）— 資料格式、常用操作、跨頁面連動 |
| [design-tokens.md](./design-tokens.md) | 顏色 / 間距 / 陰影 token；顏色分類決策框架；狀態色 / 第三方品牌色規範；新增主題 preset；在 `@container` 內寫 RWD 的取捨 |
| [hardcoded-color-cleanup.md](./hardcoded-color-cleanup.md) | 全站寫死 hex 的分類清理清單（working checklist）— 哪些要換 token / 哪些豁免，附優先順序 |
| [primevue-conventions.md](./primevue-conventions.md) | PrimeVue 元件坑點 —`pt` 使用時機、Dialog / Drawer 在 frame 模式下的定位、Select / InputNumber 尺寸 |

## 使用習慣

- 先讀 CLAUDE.md（樣式 / RWD / 命名）——這裡不重複那部分。
- 動購物車或結帳流程 → **state-stores.md**（CartItem 有 `bulkDiscount`、`bundleItems`）+ **primevue-conventions.md**（Drawer 定位）。
- 動主題 / 換色 → **design-tokens.md**（主題 preset 要同時掛 CSS var 與 PrimeVue Aura preset）。
- 加新頁面 → **architecture.md**（登入守衛白名單、Aurora shell 例外、NavBar / Footer 邏輯）。

寫新 memory 前先來翻這邊，避免 CLAUDE.md 已經寫過的又寫一次。
