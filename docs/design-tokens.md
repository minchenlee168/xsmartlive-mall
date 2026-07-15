# Design Tokens — 顏色 / 間距 / 陰影 / RWD

CSS 變數集中在 `src/style.css` 的 `:root`，主題 preset 在 `pinia/theme.ts`，density 在 `pinia/density.ts`。所有頁面 / 元件**不要 hard code 顏色 & 間距**，用 token。

## 主色（primary）

| Token | 用途 |
| --- | --- |
| `--primary` | **純色**：文字、border、icon、spinner（不能吃漸層） |
| `--primary-bg` | **背景**：可為漸層；button / tab / badge 用這個 |
| `--primary-hover-bg` | hover 時的背景 |
| `--primary-50`~`--primary-950` | ramp — 給 PrimeVue Aura preset 對應（`main.ts`） |
| `--primary-200` | 淺色高亮（focus / selected 背景） |
| `--primary-surface` | `color-mix(var(--primary) 12%, #fff)` — 卡片 / tag / active state 用的淺色底 |

**寫法規範**：

```html
<!-- 文字用純色 -->
<span style="color: var(--primary)">$1,280</span>

<!-- 背景可用漸層 -->
<div style="background: var(--primary-bg)"></div>
```

反例：`<div style="background: var(--primary)">` — Aurora / Midnight 等主題 `--primary-bg` 是漸層時看起來會扁掉。

## Brand（保留色）

`--brand` / `--brand-bg` / `--brand-hover-bg` — 給**分類 tabs / 搜尋鈕 / 客製 icon** 用的保留色。預設 = `--primary`；某些主題（如 `red`）會另外設定 brand，讓這幾個元素維持紅色，但其他地方跟 `--primary` 走。

`red` 主題示範：`--primary` 是綠松 `#4f8a8a`，`--brand` 保留 `#c75c58`，讓分類 tab / 搜尋鈕還是紅底。

## Accent（次要）

`--accent` / `--accent-200` / `--accent-hover` — 次要按鈕 / badge / tag 用。每個主題自己給值，跟 `--primary` 撞色搭配。

## Custom icon shades

從 `--brand` 用 `color-mix` 導出：`--icon-primary-strong` / `--icon-primary-mid` / `--icon-primary-soft` / `--icon-primary-light` / `--icon-primary-bg`。

換主題時全部自動跟著算，不用手動維護。

## 頁面背景

`--page-bg` — 由主題決定；純色（大部分主題）或漸層（milktea / aurora / midnight / bloom / retro / techblue）。

`html`、`body`、`.min-h-screen` 都吃這個 → PC 版即使 shell 有 `max-w-7xl` 兩側也不會空白。

## 間距（density-driven）

密度 tokens — 由 `pinia/density.ts` 一次改：

| Token | wide | compact | 用途 |
| --- | --- | --- | --- |
| `--page-pad-x` | 16px | 8px | 頁面左右內距 |
| `--page-pad-y` | 16px | 8px | 頁面上下內距 |
| `--stack-gap` | 16px | 8px | 卡片之間的間距 |
| `--card-pad` | 16px | 8px | 卡片內距 |

寫 layout：

```html
<main style="padding: var(--page-pad-y) var(--page-pad-x); gap: var(--stack-gap);">
  <section class="card-pad"><!-- ... --></section>
</main>
```

`.card-pad` utility 就是 `padding: var(--card-pad)`。不要用 `p-4`，改 density 不會跟著變。

## 陰影

`--card-shadow` 對應 `.shadow-card`：

```css
--card-shadow: 0px 1px 3px rgba(0,0,0,.1), 0px 1px 2px -1px rgba(0,0,0,.1);
```

所有卡片統一用 `.shadow-card`。想改陰影階級就動 token。

## Border / 分隔線

- `--border-color` `#e5e5e5`
- `--border-light` `#e2e8f0`
- `--text-muted` `#64748b`

CartPage / CheckoutPage 用 `.cart-divider::after` / `.cart-divider-top::before` 畫左右內縮的 hairline。搬到別的頁需要同一效果 → 抄那份 scoped `<style>`。

## Frame CSS 變數

見 [architecture.md](./architecture.md) 「Viewport frame」。`--frame-left` / `--frame-width` / `--frame-bottom` 供**任何 `position: fixed` 元素**對齊到 frame 內。開發自己的抽屜 / sticky footer 時要用。

## 新增主題 checklist

想加第 N+1 套主題：

1. `pinia/theme.ts` 的 `themes[]` 加一組：
   - 必填：`id`, `label`, `swatch`（單色）或 `swatchGradient`（漸層 swatch）
   - 必填 `vars`：`--primary`、`--primary-200`、`--primary-bg`、`--primary-hover-bg`、`--accent`、`--accent-200`、`--accent-hover`、`--tabs-bg`、`--page-bg`
2. 若這套主題需要**保留品牌色**：加 `--brand`、`--brand-bg`、`--brand-hover-bg`（`red` 是範例）；`OPTIONAL_KEYS` 已處理主題切換時的清空邏輯。
3. 若這套主題**要客製 UI 樣式**（如 midnight 的深底、Aurora 的 shell）：在 `App.vue` 的 scoped `<style>` 加 `.appearance-<id>` 選擇器（用 `:deep()` 穿透）。
4. **不用動 `main.ts`**：Aura preset 已經把 `--primary-50`~`--primary-950` bridge 進去，PrimeVue 元件會跟著換色；只要主題有給這幾個 ramp 值。
5. 若這套只是換色不換 layout，`--primary-50`~`--primary-950` 沒設也 OK — 會 fallback 到 `:root` 預設的紫色 ramp（實務上要補齊，否則 button 的 hover ring 顏色會跟主色不搭）。

## 在 `@container` 內寫 RWD 的取捨

因為 frame 在 `@container` 裡（見 architecture.md），頁面內樣式**必須用容器前綴**：

```html
<!-- 對 -->
<div class="flex flex-col @3xl:flex-row">

<!-- 錯：@container 內視窗查詢不會依 frame 寬觸發，會依真實視窗寬 -->
<div class="flex flex-col md:flex-row">
```

**例外**：`position: fixed` 元素（Dialog / Drawer 抽屜）脫離 `@container` 子樹，這時應該用 `@media` — 見 `CheckoutPage.vue` scoped `<style>` 內的 `@media (max-width: 768px)`。

## Arbitrary value

CLAUDE.md 有寫但值得再強調：**優先語義化 class**（`text-3xl` / `text-slate-700`）；只有真的落在 Tailwind scale 之外才用 `[value]`。**主題色永遠走 CSS 變數**（`style="color: var(--primary)"`），不寫成 `text-[#7008e7]`——後者不會跟主題切換。

## 顏色分類決策框架

寫任何顏色前，先判斷它屬於哪一類，再決定寫法。這是避免「換膚壞掉」與「各頁灰階不一」的核心：

| 類別 | 判斷 | 寫法 |
| --- | --- | --- |
| **品牌 / 主色 / accent** | 換主題時**應該**跟著變的色 | 走 token：`var(--primary)`、`var(--primary-surface)`、`var(--accent)`（見上方各節） |
| **中性色（灰階文字 / 邊框 / 背景）** | 不隨主題變的灰 | Tailwind `slate-*`（`text-slate-700`、`border-slate-200`、`bg-slate-100`）。對照：`slate-100 ≈ --surface-100`、`slate-500 ≈ --text-muted` |
| **狀態色（成功 / 錯誤 / 警示）** | 語義固定，不隨主題變 | 固定 Tailwind 語義色，見下「狀態色」表 |
| **第三方品牌色（超商 / 社群）** | 本來就固定的別家品牌色 | 白名單常數，見下「第三方品牌色」 |

> ⚠️ **不要用數字 ramp（`--primary-500` / `--primary-700` …）當 app UI 的深淺色。**
> `theme.ts` 只覆蓋 `--primary` 基色與 `--primary-200`；`--primary-50~950` 在 `style.css` 是**寫死紫色**，僅供 PrimeVue Aura preset bridge（見「新增主題 checklist」第 5 點）。要深淺變化請用 `--primary-surface`，或 `color-mix(in srgb, var(--primary) N%, #fff / #000)`，這樣才跟著換膚。

## 狀態色（成功 / 錯誤 / 警示）

全站**統一用以下固定階層**，不要各頁自選深淺。**兩種寫法擇一，但同一個值**：

- **template class**（一般情況優先）：用 Tailwind 語義色
- **inline `:style` / 動態三元**（無法用 class 時）：用 `:root` 的語義 token（`var(--danger)` 等）

| 狀態 | Tailwind class | 對應 token（inline 用） | 淺底 |
| --- | --- | --- | --- |
| 成功 / 加車 | `text-green-600` | `--success`（填色）/ `--success-border`（邊框） | `bg-green-50` |
| 錯誤 / 售價紅 | `text-red-500` | `--danger` | `bg-red-50` |
| 警示 / 提示 | `text-amber-700` | （暫無，用 class） | `bg-amber-50` |

> `--danger` = red-500、`--success` = emerald-500、`--success-border` = emerald-600，定義於 `style.css :root`。
> 售價紅、加車成功綠已改用這些 token（`ProductCard` / `CartPage` / `MyOrdersSection`）；warning 目前仍走 class。

## 第三方品牌色（超商 / 社群）

7-11、全家、LINE、IG 等別家品牌色**不走主題 token**（它們本來就固定），但**必須集中管理**，不可在元件內就地寫 hex（難維護、難盤點）。

```ts
// 建議集中在 src/utils/brand-colors.ts
export const CVS_BRAND_COLORS = {
  '7-11': '#ee1c25',
  family: '#00a040',
} as const;
```

反例（現況待修，`CheckoutPage.vue`）：

```html
<!-- ❌ 就地寫死 -->
<span :style="addr.chain === '7-11' ? 'background: #ee1c25' : 'background: #00a040'" />
```

## 現況待修（review checklist）

盤點時可逐項勾：

- [ ] `CheckoutPage.vue` 超商品牌色 `#ee1c25` / `#00a040` 寫死 → 抽 `CVS_BRAND_COLORS` 常數
- [ ] `--primary-50~950` ramp 未隨主題覆蓋 → 盤點 app UI 使用處，改用 `--primary-surface` / `color-mix`
- [ ] 全站掃寫死 hex：`grep -rnE '#[0-9a-fA-F]{6}' src/components src/views`，逐一歸類（主題色→token / 第三方→白名單 / 中性→`slate-*`）
- [ ] 狀態色深淺是否統一到上表（`text-green-600` / `text-red-500` / `text-amber-700`）
