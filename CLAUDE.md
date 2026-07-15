# xsmartlive-mall 開發規範

本 repo 為商城前台原型（Vite + Vue 3 + Tailwind 4 + PrimeVue 4），與主專案 [xsmartlive-frontend](https://github.com/ariesweng/xsmartlive-frontend)（Nuxt 4）共用設計與規範。本檔記錄原型開發時 Claude / 工程師應遵守的注意事項。

## 規範檢查（開發前 / 後）

改動前後依任務類型過對應把關，別憑印象直接改：

- **改 `.vue` 顏色 / 樣式後**：跑 `node scripts/check-colors.mjs <改動檔>`，擋新增的寫死色（baseline 只報新增、不騷擾既存）。此檢查也已掛 PostToolUse hook 自動執行。
- **視覺 / 排版 / RWD 調整前**：交給 `ui-designer` subagent。
- **互動流程 / 狀態轉換 / 空狀態設計前**：交給 `ux-designer` subagent。
- **動 store / 購物車 / 結帳 / 優惠券 / 紅利 / 運費 / 訂單邏輯前**：交給 `mall-domain-reviewer` subagent 審領域規則。
- **commit 前或想全面檢查規範**：交給 `spec-reviewer` subagent（顏色 token、arbitrary value、RWD、pt、風格）。
- 規範細節見 `docs/`（[design-tokens](./docs/design-tokens.md)、[livestream-patterns](./docs/livestream-patterns.md)、[primevue-conventions](./docs/primevue-conventions.md) 等）。

## 注意事項

- PrimeVue 元件內部有自己的樣式封裝，繼承對其內部結構不一定有效，如需調整請使用 `pt`（passthrough）
- 非字體類屬性（`bg-*`、`border-*`、`p-*`、`m-*`）不可繼承，不適用此規則

## 格式化

- 使用 Prettier + `prettier-plugin-tailwindcss`，config 與主專案一致（singleQuote、tabWidth: 2、trailingComma: all、含分號）
- 提交前跑 `pnpm format` 自動排序 Tailwind class 並格式化

## 程式碼風格（與主專案 xsmartlive-frontend 一致）

- `<script setup>` 內統一用 `const arrow` 宣告函數，不用 `function`
- Boolean 變數以 `is/has/can/should` 開頭（如 `isVisible`、`hasError`）
- 事件處理函數以 `handle` 開頭（如 `handleSubmit`、`handlePageChange`）
- 常數使用 SCREAMING_SNAKE_CASE，定義於檔案上方
- 避免 magic number，數字常數必須有具語義的名稱
- 元件 props 必須賦值給 `const props = defineProps<{}>()`，有預設值用 `withDefaults()`
- 不在 template 中直接呼叫 store，透過 computed 封裝後使用

## Arbitrary Value 使用規範

- 優先使用 Tailwind 語義化 class（如 `text-3xl`、`text-slate-700`），避免 arbitrary value（如 `text-[30px]`、`text-[#334155]`）
- 只有當數值確實不在 Tailwind 預設比例尺或色票中時，才使用 `[value]` 形式

## RWD 響應式設計規範

### 斷點定義（Tailwind CSS 4 預設）

| 斷點   | 前綴   | 最小寬度 | 適用裝置          |
| ------ | ------ | -------- | ----------------- |
| Mobile | （無） | 0px      | 手機（預設）      |
| SM     | `sm:`  | 640px    | 大手機 / 直式平板 |
| MD     | `md:`  | 768px    | 橫式平板          |
| LG     | `lg:`  | 1024px   | 桌機              |
| XL     | `xl:`  | 1280px   | 大桌機            |

### 容器查詢（Container Query）斷點

本原型用 App.vue 的 `@container` frame 配合 container query 做裝置模擬。**容器查詢前綴的數值跟一般斷點完全不同**，常見對照：

| 容器前綴 | 寬度  | 用途                         |
| -------- | ----- | ---------------------------- |
| `@3xl:`  | 768px | 平板＋（對應 `md:`）         |
| `@4xl:`  | 896px | 平板大尺寸                   |
| `@5xl:`  | 1024px | 桌機（對應 `lg:`）          |
| `@7xl:`  | 1280px | 大桌機（對應 `xl:`）         |

**避坑：**不要用 `@md:`（448px）當「平板以上」——`@md:` 在 480px 大手機橫向就會 fire，不是平板。手機↔平板的切換點固定用 `@3xl:`。

### 開發原則

- **Mobile First**：樣式從手機版開始寫，再透過 `md:`、`lg:` 往上覆蓋
- 禁止用固定 `px` 寬度限制版面，改用 `max-w-*` + `w-full` 組合
- 文字大小依斷點調整，手機版避免 `text-xs` 以下（可讀性）
- 觸控區域最小 44×44px（`min-h-11 min-w-11`），按鈕與連結皆須符合
- 避免 `overflow-hidden` 遮蓋重要內容，搭配 `truncate` 或 `line-clamp-*` 控制

### 常見佈局寫法

```html
<!-- 手機單欄、桌機雙欄 -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2"></div>

<!-- 手機堆疊、桌機並排 -->
<div class="flex flex-col gap-3 lg:flex-row"></div>

<!-- 容器最大寬度限制並置中 -->
<div class="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8"></div>
```

### 圖片與媒體

- 圖片一律加 `class="w-full object-cover"`，搭配固定高度容器控制比例
- 使用 `aspect-*`（如 `aspect-video`、`aspect-square`）取代固定 `height`
- 避免寬高寫死的 `<img>`，確保不同螢幕比例不破版

### 元件開發注意事項

- 新增元件須在手機（375px）、平板（768px）、桌機（1280px）三種寬度下測試
- Modal 手機版需全螢幕或接近全螢幕，桌機版限制最大寬度：

```html
<div class="w-full md:max-w-lg md:rounded-xl"></div>
```

- 表格在手機版需有橫向捲動：

```html
<div class="overflow-x-auto">
  <table>
    ...
  </table>
</div>
```

- 下拉選單、Tooltip 需確認手機版不超出視窗邊界

### 禁止事項

- 禁止用 JS 偵測螢幕寬度來切換樣式，統一使用 Tailwind 響應式前綴
- 禁止在 CSS 中直接使用 `@media`（除非 Tailwind 無法涵蓋的特殊情境，需加註解說明）
- 禁止對會隨內容增長的容器設定固定 `height`，改用 `min-h-*`
