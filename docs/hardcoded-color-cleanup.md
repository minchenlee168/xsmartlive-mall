# 寫死顏色清理清單（working checklist）

> 掃描指令：`grep -rnE '#[0-9a-fA-F]{6}' src/components src/views`（排除 `style.css`），共 **133 行**。
> 依 [design-tokens.md](./design-tokens.md)「顏色分類決策框架」歸類。**不是全部都要改**——先看類別的「動作」欄。
> 產出日期基準：check-out 分支。行號可能隨改動位移，動手前用檔名關鍵字重新定位。

## 進度（2026-07-15）

- ✅ **A 第三方品牌色** — 已抽 `src/utils/brand-colors.ts`（`SOCIAL_BRAND_COLORS` / `GOOGLE_LOGO_COLORS` / `CVS_BRAND_COLORS`）；`ProductDetailPage`/`LoginPage`/`SocialSignupPage`/`MemberCenterPage` 改引用。CSS 內 Google/LINE logo 美術加豁免註解保留。
- ✅ **C 售價 / 狀態色** — 新增 `--danger`/`--success`/`--success-border` token；`ProductCard`/`CartPage`/`MyOrdersSection` 的售價紅、加車綠改用 token。
- ✅ **D 中性灰（可對映部分）** — `#e2e8f0→--border-light`、`#334155→--surface-700`、`#64748b→--text-muted`、`#f1f5f9→--surface-100`、`#020617→--surface-950`，跨 8 檔替換完成。
- ⏸ **保留未動**：白 `#ffffff`（不需 token）、無對應 token 的灰（slate-50/300/400/600/900，如 `#cbd5e1`/`#94a3b8`/`#475569`）、`AppToast` 內部色盤、appearance 專屬美術（`#1e2530`/`#932c2c` 等）。若要清這批需**擴充 surface ramp token**，屬另一項設計系統決策。

## 類別與動作

| 類別 | 動作 | 風險 | 優先 |
| --- | --- | --- | --- |
| **E 主題色寫死** | 換 `var(--primary)` 等 token | 換膚會壞 | 🔴 高 |
| **A 第三方品牌色** | 抽共用白名單 `src/utils/brand-colors.ts` | 目前各處不一致 | 🟠 中 |
| **C 售價 / 狀態色** | 統一 `text-red-500` 等固定階層（或抽 `--price`） | 深淺不一 | 🟠 中 |
| **D 中性灰寫死** | 換 `slate-*` / `--surface-*` / `--border-*` | 純一致性 | 🟡 低 |
| **B 插畫 / SVG 資產** | **豁免**，保留 | — | ⚪ 不改 |
| **F 主題 / 元件 token 定義本身** | **豁免**（這是定義來源） | — | ⚪ 不改 |

---

## 🔴 E — 主題色寫死（優先改）

會跟主題撞色、換膚不連動的紫 / 品牌色：

- [ ] `components/FloatingControls.vue:326` — `#020617`（暗色，屬中性 D，非主題色；歸 D）
- [ ] `views/HomePage.vue:594-638` — 粉紅 / 焦糖漸層（首頁裝飾）**不隨主題變**；若首頁要跟主題連動需改 token，否則列為「刻意的季節裝飾」豁免
- [ ] `components/AuroraShell.vue:193-294` — Aurora 專屬棕 / 桃色（`#6b2d18`、`#b98570`、桃色漸層）：屬 **appearance-aurora 專屬美術**，跟著該主題走，可豁免

> 註：`CheckoutPage` 的 7-11 `#ee1c25` / 全家 `#00a040`（design-tokens.md 舉的例）在 **main 分支**的門市徽章；check-out 分支改用超商品牌選單，本次掃描未出現。合併時留意。

**實際「該修的純主題紫」本次掃描很少**——主色多數已走 token，這是好事。

---

## 🟠 A — 第三方品牌色（抽白名單）

現況**不一致**：有的用常數、有的 inline，散在 4 個檔：

- [ ] `views/ProductDetailPage.vue:18` — `FACEBOOK_BLUE = '#1877F2'`（已是常數 ✅，移到共用檔）
- [ ] `views/LoginPage.vue:321` — FB `#1877f2`
- [ ] `views/LoginPage.vue:442-445` — Google 四色 `#ea4335 #fbbc05 #34a853 #4285f4`
- [ ] `views/LoginPage.vue:460` — LINE `#06c755`
- [ ] `views/SocialSignupPage.vue:44,53,62,71` — FB / Google / LINE / 黑 `#1877f2 #ea4335 #06c755 #000000`
- [ ] `views/MemberCenterPage.vue:337,343,349,365,370` — Google `#1a73e8 #0f9d58 #ea4335`、LINE `#06c755`、黑 `#000000`

**建議**：集中成

```ts
// src/utils/brand-colors.ts
export const SOCIAL_BRAND_COLORS = {
  facebook: '#1877f2',
  line: '#06c755',
  google: { red: '#ea4335', yellow: '#fbbc05', green: '#34a853', blue: '#4285f4' },
  // 7-11 / 全家（供 main 分支門市徽章）
  '7-11': '#ee1c25',
  family: '#00a040',
} as const;
```

---

## 🟠 C — 售價 / 狀態色（統一階層）

### 售價紅 `#ef4444`（散在多檔，最該統一）

- [ ] `components/ProductCard.vue:588`
- [ ] `views/CartPage.vue:773`（錯誤 outline）
- [ ] `components/member/MyOrdersSection.vue:551,721,809,1089,1147`

→ 統一成 `text-red-500`（= `#ef4444`），或抽 `--price` / `--danger` token。

### 加車成功綠 `#10b981` / `#059669`

- [ ] `components/ProductCard.vue:360-361`
- [ ] `views/CartPage.vue:955-956`

→ 統一成 `text-green-* / bg-green-*`（design-tokens.md 狀態色表）。

### AppToast 語義色（可接受的集中處，低優先）

- [ ] `components/AppToast.vue:77-121` — info/success/warning/error 的底色 + 邊框 + icon 色（`#f0f9ff`、`#f0fdf4`、`#fffbeb`、`#fef2f2` 等）

→ 這是手刻 toast 的**語義色集中地**，寫死在單一元件可接受。要更嚴謹再抽 `--success/-danger/-warning/-info` token；**低優先**。

### 其他語義 tag

- [ ] `components/CouponDrawer.vue:125` — 優惠券粉標 `#fce7f3` / `#be185d`

---

## 🟡 D — 中性灰寫死（換 slate / surface）

對照：`#ffffff`→白、`#f8fafc`→`slate-50`、`#f1f5f9`→`slate-100`/`--surface-100`、`#e2e8f0`→`slate-200`/`--border-light`、`#cbd5e1`→`slate-300`、`#94a3b8`→`slate-400`、`#64748b`→`slate-500`/`--text-muted`、`#475569`→`slate-600`、`#334155`→`slate-700`/`--surface-700`、`#0f172a`→`slate-900`、`#020617`→`slate-950`/`--surface-950`。

- [ ] `components/ThemeHallProducts.vue:129,130,142`
- [ ] `components/ProductCard.vue:444,445`
- [ ] `components/AppToast.vue:66,68,69,100,101,108,136,144,156,167`（中性部分）
- [ ] `components/AuroraShell.vue:329,369,404`
- [ ] `components/FloatingControls.vue:326`
- [ ] `views/PaymentSuccessPage.vue:127`
- [ ] `views/ProductDetailPage.vue:292`（`bg-[#d9d9d9]` 佔位灰 → `bg-slate-300`）
- [ ] `views/CartPage.vue:1290,1305,1306,1318`
- [ ] `views/CheckoutPage.vue:2056`
- [ ] `components/member/MyOrdersSection.vue:538,540,543,633,919,1014,1108,1123,1124,1136,1160`
- [ ] `views/MemberCenterPage.vue:806,898`（未綁定灰 `#94a3b8` → `slate-400`）

---

## ⚪ B / F — 豁免（不改）

- **B 插畫 / SVG**：
  - `components/MemberIcon.vue:78-149` — 會員等級徽章 SVG（金銀漸層），美術資產
  - `components/PageLoading.vue:39-144` — loading 動畫彩點 + SVG stroke `#616161`
- **F 定義來源**：
  - `components/FloatingControls.vue:168` — 主題選色器 `swatch: '#7008e7'`（顯示用資料）
  - `views/HomePage.vue:603,604`、`components/FlashSaleBar.vue:29,32` — 元件級自訂 token 的 fallback 值（`var(--x, #fallback)`）
  - `views/CartPage.vue:1024,1031`、`AuroraShell` 桃棕 — 特定 appearance 專屬美術

---

## 建議動手順序

1. **A 第三方白名單**（獨立、低風險、馬上收斂 4 檔散落）→ 先做，最有感。
2. **C 售價紅 `#ef4444`**（一個 replace 就統一 7 處）。
3. **D 中性灰**（量最大但純機械替換，可分檔慢慢清）。
4. E / B / F 多為豁免或已合規，最後掃尾。

> 全部清完可再跑一次掃描指令驗收；豁免項目建議在該行加 `<!-- brand-color: 第三方，豁免 -->` 註解，下次掃描一眼可辨。
