# xsmartlive Mall Prototype

xsmartlive 商城 UI 改版的設計原型,給設計 / PM / 利害關係人 review 用。

**線上預覽**: <https://minchenlee168.github.io/xsmartlive-all-prototype/>

## 用途

- 提供 Mall 模組改版的視覺與互動參考
- 設計確認後再「翻譯」到 [xsmartlive-frontend](https://github.com/ariesweng/xsmartlive-frontend) 主專案 (Nuxt) 實作
- **不是** production code,沒有真 API、資料寫死

## 技術棧

- Vue 3 + `<script setup>` + TypeScript
- Vite 8
- Tailwind CSS 4
- PrimeVue 4 (Aura)
- Pinia (狀態管理 — 主題、間距、裝置預覽)
- Vue Router

## 本地開發

```bash
pnpm install --ignore-workspace   # ← 一定要加 --ignore-workspace,避免被外層 pnpm workspace 接管
pnpm dev                          # http://localhost:5173 (或下一個可用 port)
```

## 部署

push 到 `main` → GitHub Actions 自動 build + deploy 到 GitHub Pages,約 1-2 分鐘生效。

```bash
git add .
git commit -m "<type>: 描述"
git push
```

不用手動跑 `pnpm build`。

## 專案結構

```
src/
├─ components/        # NavBar, BannerCarousel, ProductCard, FloatingControls 等
├─ views/             # HomePage, CategoryPage, ProductDetailPage 等
├─ stores/            # auth, cart, theme, density, viewport, prefs, ui
├─ router/            # vue-router 設定
├─ data/              # 寫死的假商品資料
├─ style.css          # design token (CSS variables)
└─ main.ts
public/               # logo / icons / member 圖示
```

## 浮動工具列 (右下角)

點右下紫色按鈕展開預覽工具:
- **裝置**: 切換預覽寬度 (mobile 390 / tablet 768 / PC 不限)
- **間距**: wide (16px) ↔ compact (8px),即時改全站 page padding / stack gap / card padding
- **主題色**: 8 色 (purple / red / blue / green / orange / citrus / milktea / techblue),即時改 `--primary` 系列 CSS variables

僅給設計 review 用,**正式版要拿掉**。

## Commit 規範

| type | 用途 |
|---|---|
| `feat` | 新功能/新區塊 |
| `fix` | 修 bug |
| `style` | 視覺微調 (不影響邏輯) |
| `refactor` | 重構 |
| `chore` | 雜事 (升級套件等) |
| `docs` | 文件 |

## 注意事項

- `vite.config.ts` 的 `base: '/xsmartlive-all-prototype/'` 是給 GitHub Pages 子路徑用,若改 custom domain 要改回 `'/'`
- 用 `pnpm` 不要用 `npm`,且記得帶 `--ignore-workspace`
