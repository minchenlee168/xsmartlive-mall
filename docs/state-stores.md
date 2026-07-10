# State — Pinia Stores

`src/pinia/` 目錄下的 store 都用 setup store 語法（`defineStore('id', () => { ... })`）。所有型別集中在 `src/types/`，store 內 `export type` 對外 re-export，讓外部只從 store 引一次即可。

## cart（`pinia/cart.ts` + `types/cart.ts`）

### 資料形狀

```ts
CartGroup { id, sellerName, tags: CartTag[], items: CartItem[] }
CartTag   { label, type: 'info' | 'danger' | 'secondary' }
CartItem  {
  id, productId?, name, image?, spec, qty, price, original?, checked,
  isBundle?, bundleExpanded?, bundleItems?: CartBundleItem[],
  bulkDiscount?: BulkDiscount,   // 買多優惠
}
CartBundleItem { name, image?, spec, qty }
BulkDiscount   { minQty, unitPrice, note }
```

**每台購物車 = 一組 `CartGroup`**。`tags` 除了配送方式（`常溫` / `冷凍`）也可能有 `禁止棄標`（`danger`）— 有這個 tag 的 group 不能刪商品。

### 配送 tag 命名

目前使用「常溫」與「冷凍」（沒有「一般配送」/「低溫配送」——是舊命名，已改）。之後如果新增配送類型，在 group `tags` 加 label 就好，UI 是純顯示。

### bulkDiscount — 買多優惠

`qty >= minQty` 時每件單價變 `unitPrice`；`note` 用於購物車 / 結帳 UI 提示。**目前只有商品 100（新春海陸雙享套組）有這條**，做為原型示範。想擴充 → 在 `pinia/cart.ts` 對應 `CartItem` 塞 `bulkDiscount`。

計算公式（見 `CartPage.vue` / `CheckoutPage.vue`）：

```ts
hasBulkDiscount(i)     = !!i.bulkDiscount && i.qty >= i.bulkDiscount.minQty
effectiveUnitPrice(i)  = hasBulkDiscount(i) ? i.bulkDiscount.unitPrice : i.price
bulkDiscountAmount(i)  = hasBulkDiscount(i) ? (i.price - i.bulkDiscount.unitPrice) * i.qty : 0
```

結帳頁**優惠券以「買多優惠後金額」為基底**再折抵，順序不能倒（見 `discountOf(c)`）。

### bundleItems — 組合商品

- **固定組合**：`isBundle: true` + `bundleItems`（相對應目錄 product 的 `bundleItems`）。子品規格不能改。
- **任選組合**：`isBundle: true` + catalog product 的 `isPickBundle: true`；購物車頁允許改子品規格與數量，最終總和 = `pickCount × item.qty`。
- 判斷「是不是任選組合」不看 CartItem 本身，看 `products.find(p => p.id === item.productId)?.isPickBundle`。

### store API

```ts
addItem(p, spec = '預設', qty = 1, customBundleItems?) — 加入商品
  - 一律加進第一台「非禁止棄標」的 group；沒有就 unshift 一台「我的商店」
  - 同 productId + 同 spec → 合併累加 qty，不新開一列
  - 從 catalog 補齊 isBundle / bundleItems；任選組合帶 customBundleItems
removeItem(groupId, itemId) — 刪商品
totalCount — computed，所有 group 商品總數（顯示在 NavBar 購物車 icon badge）
```

### 跨頁面連動

- `CartPage` v-model 直接綁 `cart.groups[i].items[j].qty` / `.checked` / `.spec`。
- `CheckoutPage` 也**直接引用** cart store items（不 clone），所以改結帳頁的數量會反寫回 cart。清空 checked 商品在 `handlePlaceOrder` 內 `filter(i => !i.checked)`。

## orders（`pinia/orders.ts` + `types/order.ts`）

### 資料形狀

```ts
OrderRecord {
  id, date, orderNo, qty, total, payment, delivery, invoice,
  status: 'unpaid'|'to_ship'|'completed'|'cancelled'|'returned',
  detailTab: 'progress'|'cancel'|'return'|'inquiry'|'address'|'payment',
  expanded, items: OrderItem[],
}
OrderItem { image?, name, spec, price, qty, packages: PackageInfo[],
            returnStatus?, returnRejectReason? }
PackageInfo { no, qty, currentStep: TimelineStepKey, stepTimes? }
```

### placeOrder — 結帳完寫入

`CheckoutPage.handlePlaceOrder` → `ordersStore.placeOrder({ items, total, payment, delivery })`：

- 產出訂單編號 `1000000020 + seq`、交易編號 `SO${yyyymmdd}${seq}`
- 每個 order item 綁一個 `PackageInfo`，`currentStep: 'unpaid'`
- **`orders.value.unshift(...)`** 把最新訂單放最前面；且把舊訂單的 `expanded` 都設為 `false`
- 同步 `unshift` 一筆 `Transaction`（會員中心「交易記錄」用）

**改進訂單資料流時**：`price` 要傳「實際成交單價」——目前是 `effectiveUnitPrice(i)`（買多優惠後）。不是 `i.price`。

## ui（`pinia/ui.ts`）

```ts
toast(message, severity = 'success')   — 全域訊息（top-center，2.5s，一次一則）
setToastService(svc)                    — App.vue 啟動時注入 PrimeVue useToast()
routeLoading / setRouteLoading(v)       — 換頁 loading 遮罩（router 守衛控）
frameScrollLocked / setFrameScrollLocked(v) — 底部抽屜開啟時鎖 frame scroll
```

**注意**：直接 `import { useToast } from 'primevue/usetoast'` 只能在 setup 內用。放到 store 才能全域呼叫，所以走 `ui.toast()` 這個 wrapper。

## theme（`pinia/theme.ts` + `types/theme.ts`）

12 套主題預設（purple / red / blue / green / orange / citrus / milktea / aurora / midnight / bloom / retro / techblue）。切主題 → `themeStore.set(theme)` → `applyTheme(theme)` 把 `theme.vars` 寫到 `document.documentElement.style`。

**要新增主題**看 [design-tokens.md](./design-tokens.md) 「新增主題 checklist」。

## density（`pinia/density.ts`）

`wide` (16px) / `compact` (8px) 兩檔，一次改四個 CSS var（`--page-pad-x`、`--page-pad-y`、`--stack-gap`、`--card-pad`）。寫 layout 時**用這些變數**，不要 hard code `p-4`，才會跟 density 連動。

## viewport（`pinia/viewport.ts`）

`FloatingControls` 手選 mobile/tablet/pc；`current` computed 會在使用者選 PC 時再依實際視窗寬**自動 fallback**成 mobile / tablet（< 768 / < 1024）。

**細節**：resize listener 直接綁在**模組層級**（非 `onMounted`），避免第一個使用該 store 的元件卸載後 listener 失效。

## auth（`pinia/auth.ts`）

```ts
isLoggedIn, displayName, avatarLetter,
rewardPoints (312), couponCount (15),
currency { symbol: 'NT$', code: 'TWD', label: '新台幣' },
login(name?), logout()
```

**原型級**：無實際 auth flow，`login()` 就把 `isLoggedIn = true`。要改為真 API 動這裡。

## prefs（`pinia/prefs.ts`）

使用者偏好（追蹤 / 收藏等）。暫時純 in-memory。

## 常見改動情境

- **加新配送類型** → 只改 cart store 的 `tags` label，UI 不用動。
- **加新的多件優惠情境** → CartItem 塞 `bulkDiscount`；CartPage / CheckoutPage 已通吃。
- **改優惠券計算邏輯** → `CheckoutPage` 內 `discountOf(c)`；**要以 `itemsAfterBulk` 為基底**，不是 `itemsSubtotal`。
- **加會員權益（點數 / 券張數）** → `auth.ts`。
- **加訂單狀態** → `types/order.ts` 的 `OrderStatus` + `MemberCenterPage` 對應 tab。
