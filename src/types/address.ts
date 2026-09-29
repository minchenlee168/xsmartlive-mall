/** 超商鏈別（與會員門市、結帳頁 logo / 運費查表共用單一真相）。 */
export type CvsChain = '7-11' | 'FamilyMart';

/**
 * 收件地址：宅配地址與超商門市共用結構。
 * chain / storeName 只有「超商門市」才會有值。
 */
export interface Address {
  id: string;
  name: string;
  phone: string;
  /** 顯示用完整地址字串（各處列表 / 摘要沿用）。 */
  address: string;
  isDefault: boolean;
  chain?: CvsChain;
  storeName?: string;
  /**
   * 結構化欄位：宅配地址填寫時保留原始輸入，方便日後對接 API。
   * 台灣：country / city / district；海外：country / city / state / postalCode。
   * 台灣地址若只用 address 單一字串亦可，這些欄位皆為選填。
   */
  country?: string;
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
}
