# PrimeVue 使用約定 — 坑點與 pt 範例

`main.ts` 全域註冊了常用元件（`Button`、`InputText`、`InputNumber`、`Password`、`Select`、`Checkbox`、`RadioButton`、`SelectButton`、`Drawer`、`Dialog`、`Carousel`、`Tag`、`Badge`、`OverlayBadge`、`Toast`、`Tabs`+`TabList`+`Tab`+`TabPanels`+`TabPanel`、`Menu`、`DatePicker`、`InputGroup`+`InputGroupAddon`、`IconField`、`InputIcon`、`Paginator`、`Timeline`、`ProgressSpinner`）。**不要在 view 內再 import** — 直接用。

主題橋接：`main.ts` `AppPreset = definePreset(Aura, ...)` 把 `primary.50 ~ 950` 都指到 CSS 變數，所以主題切換時 PrimeVue 元件自動跟著換色。改主題不用動 PrimeVue preset。

## 樣式繼承規則（CLAUDE.md 提過的重點）

- 元件字體類（`text-*`、`font-*`）— 可繼承
- **非字體類（`bg-*`、`border-*`、`p-*`、`m-*`）— 不可繼承**，要動元件內部樣式必須用 `pt` (passthrough)

## `pt` — 何時該用、怎麼寫

**先問**：能不能用元件自己提供的 prop (`severity` / `outlined` / `text` / `rounded` / `size` / `class`) 搞定？能就別碰 `pt`。**只有這些搞不定時**才伸手進 slot：

```html
<Button
  severity="secondary"
  class="!min-h-11 !w-full !justify-between"
  :pt="{
    root: { class: '!bg-slate-100 !border-none !text-slate-700' }
  }"
  @click="..."
>
```

**規則**：
- `pt` 的 key 對應該元件的 slot（`root`、`header`、`content`、`footer`、`mask`、`input`、`inputText`、`incrementButton`、`decrementButton`…）；不確定 → 官方文件 or `console.log` 元素 DOM 找 class 前綴。
- 直接寫 `class:` 或 `style:`。class 用 Tailwind 時記得**加 `!`**（否則被 primevue layer 蓋掉，見 style.css 開頭的 `@layer` 宣告）。
- `pt` 內字串會 append，不會覆蓋原有 class。

### 常用 `pt` 範例

**Dialog padding 收緊 + 遮罩靠 frame 對齊**（見 `CartPage.vue` / `CheckoutPage.vue`）：

```html
<Dialog
  :pt="{
    header: { style: 'padding: 16px 20px' },
    content: { style: 'padding: 0 20px 16px' },
    footer: { style: 'padding: 12px 20px' },
    mask: {
      style: 'left: var(--frame-left, 0);
              width: var(--frame-width, 100vw);
              height: calc(100vh - var(--frame-bottom, 0px))',
    },
  }"
>
```

**Dialog 完全去 chrome（純圖預覽）**：

```html
<Dialog
  :show-header="false"
  :pt="{
    content: { style: 'padding: 0; background: transparent; box-shadow: none' },
  }"
>
```

## Dialog / Drawer 在 frame 模式下的定位

這是最容易踩雷的地方。frame 模式（使用者選 mobile / tablet）時 frame 是 `position: relative` + 固定寬度，但 PrimeVue Dialog / Drawer 預設用 **`position: fixed`** — 會直接定位到 viewport 而不是 frame。

### 解法一：走 CSS 變數（PrimeVue Drawer）

`style.css` 已針對 `.frame-mode`（`<html>` 上的 class）覆寫 `.p-drawer-mask` 定位：

```css
html.frame-mode .p-drawer-mask {
  left: var(--frame-left, 0) !important;
  width: var(--frame-width, 100vw) !important;
  height: calc(100vh - var(--frame-bottom, 0px)) !important;
}
```

Drawer panel 由 mask flex 佈局自然貼齊底部，**不要**再手動對 `.p-drawer` 加 `left/bottom/width`（會跟 flex 疊加，被推出範圍）。

### 解法二：自製 Teleport 抽屜（CheckoutPage 的 coupon / ship drawer）

複雜互動（有分步驟切 view / 內部有表單）不用 PrimeVue Drawer，改自己刻。範例在 `CheckoutPage.vue` bottom `<Teleport to="body">` 段落：

```vue
<Teleport to="body">
  <Transition name="drawer-fade">
    <div v-if="visible" class="drawer-backdrop" @click="visible = false" />
  </Transition>
  <Transition name="drawer-slide">
    <div v-if="visible" class="drawer-panel">
      <!-- ... -->
    </div>
  </Transition>
</Teleport>
```

配 scoped `<style>`：

```css
.drawer-backdrop {
  position: fixed; top: 0;
  left: var(--frame-left, 0);
  width: var(--frame-width, 100vw);
  height: calc(100vh - var(--frame-bottom, 0px));
  background: rgba(0,0,0,.4); z-index: 100;
}
.drawer-panel {
  position: fixed;
  left: calc(var(--frame-left, 0px) + var(--frame-width, 100vw) / 2);
  bottom: var(--frame-bottom, 0px);
  transform: translateX(-50%);
  width: min(720px, var(--frame-width, 100vw));
  z-index: 110;
  background: white;
  border-radius: 16px 16px 0 0;
  max-height: 90vh; overflow-y: auto;
}

/* 手機視窗（非 frame）— 貼底、限寬 390px */
@media (max-width: 768px) {
  .drawer-backdrop { left: 0 !important; width: 100vw !important; }
  .drawer-panel { left: 50vw !important; bottom: 0 !important;
                  width: min(390px, 100vw) !important; }
}
```

**要點**：抽屜 `position: fixed` 脫離 `@container` 子樹 → 內部 RWD 一律用 `@media`，不能用容器前綴。

### Dialog max-width 手機收緊

`style.css` 已全域處理：`@media (max-width: 768px) { .p-dialog.p-component { max-width: calc(100vw - 32px) !important; } }` — 寬 Dialog 自動縮到視窗 - 32px，原本就窄的不受影響。

## 常用元件習慣

### `<Button>`

- `severity`：`secondary`、`danger`、`success`；不指定 = primary
- `outlined` / `text` / `rounded` / `size="small"`
- 觸控友善最小尺寸：`class="!min-h-11 !min-w-11"`（icon button）
- 純文字按鈕標題不要用 emoji（CLAUDE.md 規範）

### `<InputText>` / `<InputNumber>`

- 全局 CSS 已把 `.p-inputtext` / `.p-select` 撐到 `min-height: 44px`
- **數量步進器**用 `class="qty-stepper"`：預設 34px 高、按鈕 35×34、輸入格 48×34。手機 / 商品卡列表用 `class="qty-stepper is-sm"`：26px 高、按鈕 26×26、輸入格 36×26
- 標準 InputNumber 寫法：

```html
<InputNumber
  v-model="item.qty"
  :min="1"
  show-buttons
  button-layout="horizontal"
  increment-button-icon="pi pi-plus"
  decrement-button-icon="pi pi-minus"
  class="qty-stepper"
/>
```

### `<Select>`

- 兩種型別：`option-label + option-value` 傳物件陣列，或直接傳 `string[]`
- 全局 CSS 已修正 label / chevron 在 44px 內垂直置中（見 `style.css` `.p-select-label`）

### `<Tag>`

- `severity="info" | "danger" | "secondary" | "success" | "warn"`
- 折抵 / 已套用等提示常用 `severity="success"`，`class="!py-0.5 !text-xs"` 縮小

### `<Toast>` — 別自己塞

只有 `App.vue` 掛一顆 `<Toast position="top-center" />`。要顯示訊息 → `ui.toast(msg, severity?)`（`pinia/ui.ts`）。**呼叫前 `removeAllGroups()`**，一次一則。

### `<Dialog>` 關閉鍵焦點環

全域 CSS 已移除 `.p-dialog-close-button:focus` 的 outline（見 `style.css` 尾段）— 不用重複覆寫。

## 對外 tooltip

`main.ts` 註冊了 `v-tooltip` directive：

```html
<Button v-tooltip.top="'新增地址'" icon="pi pi-plus" />
```

## FontAwesome

`main.ts` 全域 `<FontAwesomeIcon>`；同時 `@awesome.me/kit-*` CSS 也載入，可以用 CSS class 直接寫（`<i class="fa-solid fa-cart-shopping">`）。**選一種**用，不要混。

## 何時**別**用 PrimeVue

- **列表卡片 layout** — Tailwind + `.shadow-card` 就夠，別套 `<Card>`（內部樣式跟 tokens 衝）
- **底部抽屜有多步驟 / 客製動畫** — 用自製 Teleport（見上）
- **收藏 / 點讚 icon 動畫** — 直接 Tailwind `transition` 就好，別包 `<OverlayBadge>`
