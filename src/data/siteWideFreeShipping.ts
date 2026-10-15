/**
 * 全站免運（demo 開關模擬後台活動）。開啟後購物車級「期間首購後免運」休眠，
 * 全站免運依選定類型於結帳套用。各類型在原型用簡單預設條件，之後可細調。
 */
export type SiteWideFreeShippingType =
  | 'first-purchase' // 首購免運（新客第一筆就免運）
  | 'first-purchase-then-free' // 期間首購後免運（第一筆付、之後每筆免運）
  | 'single-item' // 單品免運（買到指定商品即整筆免運）
  | 'min-amount' // 滿額免運
  | 'min-qty' // 滿件免運
  | 'period'; // 期間免運（直接免運）

export const SITE_WIDE_FREE_SHIPPING_TYPES: {
  value: SiteWideFreeShippingType;
  label: string;
}[] = [
  { value: 'first-purchase', label: '首購免運' },
  { value: 'first-purchase-then-free', label: '期間首購後免運' },
  { value: 'single-item', label: '單品免運' },
  { value: 'min-amount', label: '滿額免運' },
  { value: 'min-qty', label: '滿件免運' },
  { value: 'period', label: '期間免運' },
];

/** 全站折抵列標籤文案（依類型）。 */
export const siteWideFreeShippingLabel = (
  type: SiteWideFreeShippingType,
): string =>
  SITE_WIDE_FREE_SHIPPING_TYPES.find((t) => t.value === type)?.label ??
  '全站免運';

/** 滿額免運門檻（元，依「扣買多後」金額計）。 */
export const SITE_WIDE_MIN_AMOUNT = 1000;
/** 滿件免運門檻（件數）。 */
export const SITE_WIDE_MIN_QTY = 3;
/** 單品免運：訂單含這些商品即整筆免運（原型指定）。 */
export const SITE_WIDE_FREE_SHIPPING_PRODUCT_IDS: number[] = [16, 100, 400];
