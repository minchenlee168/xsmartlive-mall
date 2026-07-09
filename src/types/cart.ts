export interface CartBundleItem {
  name: string;
  image?: string;
  spec: string;
  qty: number;
}

/** 買多優惠：達 minQty 件後，每件單價變為 unitPrice */
export interface BulkDiscount {
  minQty: number;
  unitPrice: number;
  note: string;
}

export interface CartItem {
  id: string;
  productId?: number;
  name: string;
  image?: string;
  spec: string;
  qty: number;
  price: number;
  original?: number;
  checked: boolean;
  isBundle?: boolean;
  bundleExpanded?: boolean;
  bundleItems?: CartBundleItem[];
  bulkDiscount?: BulkDiscount;
}

export interface CartTag {
  label: string;
  type: 'info' | 'danger' | 'secondary';
}

/** 運送方式 id — 對應結帳頁的物流選單 */
export type ShippingMethodId = 'home' | 'store';
/** 付款方式 id — 對應結帳頁的金流選單 */
export type PaymentMethodId = 'credit' | 'atm' | 'cod';

export interface CartGroup {
  id: number;
  sellerName: string;
  tags: CartTag[];
  items: CartItem[];
  /** 該賣家 / 場次支援的運送方式；合併結帳時取所有 group 的交集 */
  shippingMethods: ShippingMethodId[];
  /** 該賣家 / 場次支援的付款方式；合併結帳時取所有 group 的交集 */
  paymentMethods: PaymentMethodId[];
}
