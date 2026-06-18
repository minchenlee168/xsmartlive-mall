# 觀眾版 APP — 主題色規劃 × 元件模組化規劃

> 對象:前端工程團隊
> 技術前提:沿用現有 Vue 3 prototype，以 WebView / PWA 形式打包成觀眾版 APP
> 範圍:直播觀看頁、商城瀏覽、購物與結帳、會員中心
> 現有技術棧:Vue 3 + PrimeVue 4（Aura preset）+ Tailwind 4 + Pinia + Vue Router

---

## 一、現況盤點

現有 prototype 已經有一套運作中的主題系統,這是規劃的基礎,不需要打掉重練,而是「補強分層」與「擴充直播情境」。

目前的做法是:`src/stores/theme.ts` 定義 8 組主題（紫、紅、藍、綠、橘、柑橘撞色、奶茶、科技藍）,切換時把一組 CSS 變數寫進 `document.documentElement`,所有引用 `var(--primary*)` 的元件即時更新。`design-system-styles.json` 已記錄 token 的語意與用途。

現有 token 分兩類:會隨主題切換的（`--primary`、`--primary-bg`、`--primary-hover-bg`、`--tabs-bg`、`--page-bg`、`--accent`、`--brand`）,以及固定不變的（`--surface-*`、`--rose-500`、`--border-*`、`--text-muted`、密度 token `--page-pad-*`）。

需要補強的兩個缺口:

1. **語意層不完整** — 目前只有品牌色與少數固定色,缺少「狀態色（成功/警告/危險/資訊）」「文字階層」「直播專用色」的正式 token,這些目前散落在各元件硬寫。
2. **缺直播元件** — 觀眾版 APP 的核心是直播觀看頁,但現有 17 個元件全是商城導向,直播播放器、聊天室、商品浮層等都還不存在。

---

## 二、主題色 token 規劃

### 2.1 三層 token 架構

建議把顏色明確分成三層,讓「換膚」「換情境」「改元件」彼此不互相干擾。

| 層級 | 名稱 | 角色 | 範例 | 是否隨主題變動 |
|---|---|---|---|---|
| L1 原始色階 | Primitive | 純色票,不帶語意,只是調色盤 | `--purple-500: #7008e7` | 否（固定） |
| L2 語意 token | Semantic | 描述「用途」,指向 L1 或主題值 | `--color-primary`、`--color-danger`、`--text-strong` | 部分 |
| L3 元件 token | Component | 元件內部專用,指向 L2 | `--btn-primary-bg`、`--live-chat-bg` | 否（衍生） |

落地原則:元件只引用 L2 / L3,**不要直接寫死十六進位色碼**。主題切換只覆寫一小撮 L2 的 key（如 `--color-primary`、`--color-primary-bg`),其餘 L3 透過 `color-mix()` 自動衍生(現有 `--icon-primary-*` 已是這個模式,延用即可)。

### 2.2 語意 token 清單（建議定案）

沿用現有命名慣例(底線分隔、`--` 前綴),把現況補齊成完整一組。標「沿用」者為現有,標「新增」者為建議補上。

**品牌與主色**

| Token | 用途 | 狀態 |
|---|---|---|
| `--primary` | 純色:文字、border、icon、spinner（不可為漸層） | 沿用 |
| `--primary-bg` | 背景值:button / badge / FAB（可漸層） | 沿用 |
| `--primary-hover-bg` | 互動 hover / active 背景 | 沿用 |
| `--primary-200` | 主色淡版:outlined border、spinner track | 沿用 |
| `--primary-surface` | 卡片/標籤/選中態底色（`color-mix` 衍生） | 沿用 |
| `--tabs-bg` | 分類標籤列背景（撞色主題可獨立設色） | 沿用 |
| `--brand` / `--brand-bg` | 保留品牌色:分類 tab、搜尋鈕、客製 icon | 沿用 |
| `--accent` / `--accent-hover` | 互補強調色:次要按鈕、徽章 | 沿用 |

**狀態色（新增 — 目前散落硬寫,建議收斂）**

| Token | 用途 | 建議值 |
|---|---|---|
| `--color-success` | 成功、已完成、庫存充足 | `#16a34a` |
| `--color-warning` | 提醒、即將售罄、倒數 | `#f59e0b` |
| `--color-danger` | 售價、刪除、禁止棄標、錯誤 | `#f43f5e`（現 `--rose-500`） |
| `--color-info` | 一般資訊標籤（低溫配送等） | `#3b82f6` |
| `--price` | 商品售價專用（語意化售價色） | 指向 `--color-danger` |

**文字與表面（部分沿用、補齊階層）**

| Token | 用途 | 狀態 |
|---|---|---|
| `--text-strong` | 商品標題、主要文字 | 新增（現用 `--surface-950`） |
| `--text-base` | 一般內文 | 新增（現用 `--surface-700`） |
| `--text-muted` | 原價刪除線、placeholder | 沿用 |
| `--page-bg` | 頁面底色（可漸層） | 沿用 |
| `--surface-card` | 卡片 / 面板底色 | 新增（白） |
| `--border-light` / `--border-color` | 分隔線、卡片框 | 沿用 |

### 2.3 直播專用 token（新增重點）

直播觀看頁的視覺情境和商城不同 — 多為深色播放底 + 高對比浮層 + 即時互動色。獨立一組 token,讓直播頁可在不影響商城的情況下單獨調校,也方便日後做深色模式。

| Token | 用途 | 建議值 |
|---|---|---|
| `--live-bg` | 播放器外圍 / 直播頁底 | `#0f0f12`（深） |
| `--live-overlay` | 商品浮層、控制列半透明底 | `rgba(0,0,0,0.45)` |
| `--live-text-on-dark` | 深底上的文字 | `#ffffff` |
| `--live-accent` | 直播主行動色(追蹤、下標)、預設指向 `--primary-bg` | `var(--primary-bg)` |
| `--live-online` | 線上 / 直播中狀態點 | `#22c55e` |
| `--live-heart` | 愛心 / 按讚動效 | `#ff4d6d` |
| `--live-bid` | 喊單 / 競標 / 限時搶 強調 | `#f59e0b` |
| `--live-badge-live` | 「LIVE」紅標背景 | `#ef4444` |

### 2.4 落地方式（沿用現有機制 + 擴充）

繼續用 `useThemeStore.set()` 寫 CSS 變數的模式,擴充三點:

1. **`Theme` 介面擴充** — `vars` 物件加入直播 token 的可覆寫 key(讓不同主題能配不同直播強調色),未覆寫時 fallback 到 `:root` 預設。沿用現有 `OPTIONAL_KEYS` 的清除機制避免色彩外洩。
2. **持久化** — APP 端用戶選的主題、密度、幣別、語言應存進 `localStorage`（或 APP 的儲存層）,啟動時還原。現有 store 尚未持久化,需補上。
3. **深色模式預留** — 直播頁本身已是深底;若未來商城要全站深色,在 L2 語意層加一組 `[data-theme="dark"]` 覆寫即可,元件不需改動。建議現在就把元件全部改吃 L2/L3 token,為深色模式鋪路。

### 2.5 主題切換影響範圍（驗收清單）

切主題時應同步更新:NavBar（Logo、搜尋鈕）、CategoryTabs（整條背景）、BannerCarousel（分類 badge）、ThemeBanner（底色與斜紋）、ProductCard（加購物車鈕、選規格鈕）、ProductGrid（spinner）、FloatingControls（FAB）。新增直播頁後再加上:LivePlayer 控制列強調色、LiveActionBar、PinnedProductBar 的下標鈕。

---

## 三、元件模組化規劃

模組化的目標是讓觀眾版 APP 的四大範圍能共用同一套元件,避免商城頁與直播頁各寫一份商品卡。現有元件多數仍把資料寫死在元件內(如 ProductGrid 直接 import `products`),APP 化的第一步就是**資料與呈現解耦**:元件只吃 props / store,不自己抓資料。

採原子設計分層:基礎 → 業務 → 區塊 → 頁面,另加一組直播專用元件。

### 3.1 基礎 UI 元件（Atoms）

多數是 PrimeVue 元件的薄包裝,目的是統一全站樣式入口、收斂 token,讓換膚與改規格只需動一處。

| 元件 | 說明 | 現況 |
|---|---|---|
| `AppButton` | 統一 primary / outlined / text 變體,吃 `--primary-bg` 系列 | 散落各處,建議收斂 |
| `AppTag` | 標籤,對應狀態色（info/danger/secondary…） | CartTag 已有 type,可抽出 |
| `AppBadge` | 數字徽章（購物車數、未讀） | 散落 |
| `PriceText` | 售價 + 原價刪除線組合,吃 `--price` / `--text-muted` | 重複出現,應抽出 |
| `QtyStepper` | 數量選擇器（已有 `.qty-stepper` 樣式,PC/sm 兩尺寸） | 樣式已有,包成元件 |
| `AppAvatar` | 會員頭像 / 直播主頭像 | auth store 有 avatarLetter |
| `IconBase` / `MemberIcon` | 客製 SVG icon,吃 `--icon-primary-*` | MemberIcon 已存在 |
| `AppDialog` / `AppDrawer` | 對話框 / 抽屜底座（規格選擇、優惠券） | 包 PrimeVue |
| `AppToast` | 輕提示,接 `ui` store 的 toast | store 已有,元件待抽 |
| `CountdownTimer` | 倒數計時（限時搶購、競標）,吃 `--color-warning` | FlashSale 內含,可抽出 |

### 3.2 業務元件（Molecules）

承載商業語意、跨頁共用的元件。這是模組化收益最大的一層。

| 元件 | 共用範圍 | 現況 / 動作 |
|---|---|---|
| `ProductCard` | 商城瀏覽、直播浮層、會員收藏 | 已有且 props 完整（id/name/price/simple…）;直播版用 `simple` 變體即可 |
| `ProductGrid` | 首頁、分類、搜尋結果 | 已有,但**寫死 import products**,需改吃 `:items` prop |
| `CouponCard` | 會員中心、優惠券抽屜、結帳 | CouponDrawer 已有,抽出單張卡 |
| `CartItemRow` | 購物車、結帳明細 | CartPage 內含,抽成可重用 row（支援 bundle 展開） |
| `SellerHeader` | 購物車分組、直播間、商品頁 | cart 有 sellerName/tags,抽成元件 |
| `SearchBar` | NavBar、搜尋頁 | NavBar 內含,抽出獨立 |
| `MemberStatRow` | 會員中心（點數、優惠券數） | auth store 有 rewardPoints/couponCount |
| `AddressCard` | 結帳、會員中心 | 結帳頁新增 |

### 3.3 區塊元件（Organisms）

頁面級的大區塊,組合上面兩層。

| 元件 | 用途 | 現況 / 動作 |
|---|---|---|
| `NavBar` | 全站頂部（含搜尋、購物車、會員、幣別語言） | 已有但**479 行過大**,建議拆出 SearchBar、幣別語言切換、會員入口 |
| `CategoryTabs` | 分類標籤列（吃 `--tabs-bg`） | 沿用 |
| `CategorySidebar` / `CategoryGrid` | 分類導覽 | 沿用 |
| `BannerCarousel` | 首頁輪播 | 沿用,改吃 props 資料 |
| `FlashSale` / `FlashSaleBar` | 限時搶購 | 沿用,抽出 CountdownTimer |
| `ThemeBanner` / `ThemeHall*` | 主題館 | 沿用 |
| `AnnouncementSection` | 公告 | 沿用 |
| `CouponDrawer` | 優惠券抽屜 | 沿用 |
| `FloatingControls` | **開發用**裝置/主題/密度切換 FAB | APP 正式版應**移除或鎖進 dev-only** |

> 注意:`FloatingControls`、`viewport` store、`HelloWorld.vue` 是 prototype 預覽工具,觀眾版 APP 打包時應排除或以環境變數隱藏。

### 3.4 直播專用元件（全新 — 觀眾版核心）

現有 codebase 完全沒有,這是觀眾版 APP 相對於現有商城 web 的最大增量。建議獨立成 `src/components/live/` 目錄。

| 元件 | 用途 | 吃的 token |
|---|---|---|
| `LivePlayer` | 影音播放器(全螢幕/直立),含播放控制列 | `--live-bg`、`--live-overlay` |
| `LiveStatusBar` | 頂部:直播主資訊、LIVE 標、線上人數、追蹤鈕 | `--live-badge-live`、`--live-online` |
| `LiveChatRoom` | 即時聊天訊息流（含進場提示、系統訊息） | `--live-overlay`、`--live-text-on-dark` |
| `LiveChatInput` | 聊天輸入列 | `--live-accent` |
| `LiveActionBar` | 右側/底部互動:按讚、分享、購物車入口 | `--live-heart`、`--live-accent` |
| `PinnedProductBar` | 畫面上釘選的「正在賣」商品浮條 + 下標鈕 | `--live-overlay`、`--live-bid` |
| `LiveProductDrawer` | 上拉式直播商品清單（用 `ProductCard simple`） | 共用 AppDrawer + ProductCard |
| `BidPanel` | 喊單 / 競標 / 限時搶面板（+ CountdownTimer） | `--live-bid`、`--color-warning` |
| `HeartBurst` | 點讚愛心飄浮動效 | `--live-heart` |
| `LiveEntryCard` | 商城首頁的「直播中」入口卡 / 列表項 | `--live-badge-live` |

直播元件盡量**復用業務層**(ProductCard、PriceText、QtyStepper、CountdownTimer、AppDrawer),只有播放器、聊天室、互動列是真正全新。

### 3.5 頁面層（Views / Pages）

| 範圍 | 頁面 | 現況 |
|---|---|---|
| 直播觀看 | `LiveRoomPage`、`LiveListPage` | **全新** |
| 商城瀏覽 | HomePage、CategoryPage、ProductDetailPage、SearchPage、ThemeHallPage | 已有 |
| 購物結帳 | CartPage、CheckoutPage | 已有 |
| 會員中心 | MemberCenterPage、LoginPage、RegisterPage、ForgotPasswordPage、InfoPage | 已有 |

---

## 四、共用狀態與工具規劃

模組化不只元件,Pinia store 與 composable 也要對齊 APP 需求。

現有 store:`theme`、`prefs`(幣別/語言)、`cart`、`auth`、`ui`(toast)、`density`、`viewport`。

建議調整與新增:

- **持久化** — `theme` / `prefs` / `density` 寫入本地儲存,APP 啟動還原。
- **`cart` 解耦** — 目前購物車塞了大量假資料,APP 版改為空初始 + API 載入。
- **新增 `live` store** — 直播間狀態(目前直播主、線上人數、釘選商品、聊天訊息流、按讚數)。
- **新增 `member` / API 層** — 會員資料、訂單、收藏改走後端,`auth` store 擴充登入態與 token。
- **移除 `viewport`** — 屬 prototype 預覽工具,APP 端不需要(改用真實裝置 viewport)。

---

## 五、命名與目錄規範建議

```
src/
  components/
    base/      # AppButton, AppTag, PriceText, QtyStepper, AppDrawer...
    business/  # ProductCard, CouponCard, CartItemRow, SellerHeader...
    layout/    # NavBar, CategoryTabs, FloatingControls(dev)...
    live/      # LivePlayer, LiveChatRoom, PinnedProductBar...
  views/
  stores/
  data/        # mock 資料,APP 版逐步換成 API
```

命名慣例:基礎元件統一 `App*` 前綴;直播元件統一 `Live*` 前綴;CSS token 沿用現有 `--kebab-case`,語意層用 `--color-*` / `--text-*` / `--live-*` 分群。

---

## 六、建議推進階段

第一階段(打地基):補齊 L2 語意 token 與直播 token、把元件改吃 token 不寫死色碼、加上主題/偏好持久化。

第二階段(模組化既有):抽出基礎層(PriceText、QtyStepper、AppButton…)與業務層(CouponCard、CartItemRow、SellerHeader),ProductGrid 改吃 props,拆 NavBar。

第三階段(直播增量):建 `live/` 元件與 `live` store、`LiveRoomPage`,復用既有業務元件。

第四階段(APP 化收尾):移除 prototype 預覽工具(FloatingControls / viewport / HelloWorld)、串接 API、WebView/PWA 打包設定(safe-area、狀態列、離線快取)。

---

## 附錄:現有資產對照

現有元件(17):AnnouncementSection、BannerCarousel、CategoryGrid、CategorySidebar、CategoryTabs、CouponDrawer、FlashSale、FlashSaleBar、FloatingControls、HelloWorld、MemberIcon、NavBar、ProductCard、ProductGrid、ThemeBanner、ThemeHallCarousel、ThemeHallFlashSale。

現有頁面(12):HomePage、ThemeHallPage、CategoryPage、ProductDetailPage、CartPage、CheckoutPage、SearchPage、MemberCenterPage、LoginPage、RegisterPage、ForgotPasswordPage、InfoPage。

現有 store(7):theme、prefs、cart、auth、ui、density、viewport。
