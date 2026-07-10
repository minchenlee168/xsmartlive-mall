# 直播電商領域 pattern

這個原型跟一般電商幾個關鍵差異。做 UI / UX / 流程決策前先過一遍每一項是否適用；不確定就先跟使用者確認，不要自作主張。

適用對象：ui-designer、ux-designer、主 agent 皆應熟悉。

## 1. 購物車 = 多台（賣家 / 場次 / 粉絲團貼文各一組）

- `cart.groups[]` 每組獨立：`sellerName / tags / items / shippingMethods / paymentMethods / checkoutMode`
- 結帳頁按組拆卡片顯示，訂單也**按組拆成獨立訂單**（見 `CheckoutPage.handlePlaceOrder`）
- **狀態範圍要分清楚**：優惠券、紅利點數目前**全域共用**；運費、發票、金額小計**每組獨立**
- 動流程 / 版面前先確認「這個狀態是全域 vs 每組」，別打破現行區分

## 2. checkoutMode 四種模式互動差異（`src/types/cart.ts`）

- `default`：整台一起結，不可勾單品，顯示「禁止棄標」tag
- `pickable`：可勾選要結的品項，允許分批下單
- `abandon`：棄標流程，可取消先前喊下的商品
- `paused`：暫停收單，只能瀏覽（維護 / 備貨 / 活動間隔）
- **加互動元件時逐一過**：新按鈕 / drawer 在四種模式下**是否都合理**？`paused` 通常要整組 disable；`abandon` 的勾選語意跟 `pickable` 可能相反

## 3. 運送 / 付款方式取交集

- 多組合併結帳只顯示**所有組都支援的**方式（`supportedShippingMethods` / `supportedPaymentMethods`）
- 交集只剩一種 → 直接鎖定；多種 → 使用者主動選，選完才顯示相關費用（避免看到虛列金額）
- 因交集被隱藏 → 用 info 說明列告訴使用者「部分方式因購物車不共同支援已隱藏」，不要靜默

## 4. 優惠券作用範圍是層級的

- 全站 → 場次 → 粉絲團貼文 → 指定商品 id（越窄越專屬）
- 判斷順序：`applicableItemIds`（指定商品）→ `minSpend`（門檻）→ scope 描述
- 未達門檻 → 顯示**具體原因**（金額不足 / 商品不符），不要只 disable 讓使用者猜
- 自動套用最優 vs 手動選同時存在：**手動生效時要隱藏「自動套用」hint**，避免兩個訊息並存
- 輸入碼 / 掃 QR / radio 選單 → 走**同一套「選中 → 確定」流程**，別讓 code 是快速通道、清單是慢速通道兩套規則

## 5. 買多優惠 / 組合商品的特殊規則

- **買多優惠**綁在商品 id 上（`bulkDiscountRules`），任何購物車該商品達門檻自動觸發，用綠色 tag 標「已達買多優惠」
- **固定組合**：`bundleItems` 內容不可改
- **選 N 件組合**：`pickCount` 規範必選數量；超選 / 少選要用**非阻塞的 banner / toast** 提示，**不要 disable 加車按鈕**（讓使用者看到問題自己修正）

## 6. 加入購物車的即時反饋節奏

- `ui.showAddedToCart(productName)`：非阻塞 Dialog + 3 秒自動消失（`App.vue` 全域）
- 直播「一秒賣光」的心理節奏 → 反饋要**立即** + **不阻擋下一次加車**
- Toast 只用 `ui.toast(...)`；全站同時只顯示一則，新的會覆蓋舊的（`pinia/ui.ts`）

## 7. 直播主未用商城模式（Seller-only mode）

- 開啟後隱藏「商城首頁 / 分類 / 主題館」，僅保留其他功能
- 加流程若牽涉這三頁，要考慮**未用商城模式下的替代路徑**（例如從會員中心進入）
- 開關在 `FloatingControls.vue` 的購物車設定，實際狀態影響 `NavBar` / `CategoryTabs` 顯示

## 8. 場次 / 商品時效性

- 商品可能在**直播中 / 售完 / 場次結束後**不可購買（目前原型未完整實作）
- 新增流程若碰到「商品剛剛結束」邊界，要跟使用者確認顯示邏輯（下架 vs 灰階 vs 導引相似商品）
- 別預設「商品永遠可買」寫死流程
