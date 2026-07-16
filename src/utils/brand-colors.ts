/**
 * 第三方 / 別家品牌色白名單。
 *
 * 這些色本來就固定、不隨商城主題（theme）變，但**必須集中在此**，
 * 不可在各元件內就地寫死 hex（難維護、難盤點）。
 * 詳見 docs/design-tokens.md「第三方品牌色」。
 */

/** 社群 / 第三方登入品牌主色。 */
export const SOCIAL_BRAND_COLORS = {
  facebook: '#1877f2',
  line: '#06c755',
  google: '#ea4335',
  tiktok: '#000000',
  whatsapp: '#25d366',
} as const;

/** Google 標誌四色 — 僅用於重繪 Google logo（conic-gradient 等美術情境）。 */
export const GOOGLE_LOGO_COLORS = {
  red: '#ea4335',
  yellow: '#fbbc05',
  green: '#34a853',
  blue: '#4285f4',
} as const;

/** 超商品牌色 — 門市徽章（main 分支門市取貨徽章使用）。 */
export const CVS_BRAND_COLORS = {
  '7-11': '#ee1c25',
  family: '#00a040',
} as const;
