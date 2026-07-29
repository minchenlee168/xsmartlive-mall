import { usePrefsStore } from '../pinia/prefs';

/**
 * 金額顯示：把「台幣基準金額(TWD)」依目前選擇的貨幣換算並加上符號。
 * 於 template 中呼叫，會隨 prefs.currency 變動自動重算（reactive）。
 *
 * 全站商品 / 購物車 / 結帳的價格數字皆以台幣為基準儲存；顯示時一律走此處換算，
 * 切換右上角貨幣即可反映不同匯率。
 */
export const useMoney = () => {
  const prefs = usePrefsStore();

  /** 換算後的數值（未加符號、未格式化）。 */
  const convert = (twd: number): number => twd * prefs.currency.rate;

  /** 千分位 + 依貨幣小數位，不含符號（如 15.50 / 490 / 2,303）。 */
  const amount = (twd: number): string =>
    convert(twd).toLocaleString('en-US', {
      minimumFractionDigits: prefs.currency.decimals,
      maximumFractionDigits: prefs.currency.decimals,
    });

  /** 完整顯示：符號 + 金額（如 US$15.50 / NT$490 / ¥2,303）。 */
  const money = (twd: number): string =>
    `${prefs.currency.symbol}${amount(twd)}`;

  return { convert, amount, money };
};
