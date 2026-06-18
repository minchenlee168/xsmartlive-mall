/**
 * 金額顯示：加千分位、預設加 $ 前綴。
 * 改 currency 符號時傳第二參數覆寫。
 */
export const formatPrice = (n: number, prefix = '$'): string =>
  `${prefix}${Math.round(n).toLocaleString()}`;

/** 純千分位數字，不加任何符號（如紅利點數、優惠折抵）。 */
export const formatNumber = (n: number): string => n.toLocaleString();
