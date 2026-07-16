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
  address: string;
  isDefault: boolean;
  chain?: CvsChain;
  storeName?: string;
}
