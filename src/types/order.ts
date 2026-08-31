export type TimelineStepKey =
  | 'unpaid'
  | 'to_ship'
  | 'shipped'
  | 'to_receive'
  | 'delivered'
  | 'completed';

export type DetailTab =
  | 'progress'
  | 'cancel'
  | 'return'
  | 'inquiry'
  | 'address'
  | 'payment';

export type OrderStatus = 'unpaid' | 'to_ship' | 'completed';

/**
 * 發票狀態（對應後台分類）：
 * - pending:  可開立發票 / 未分類 → 前台顯示「尚未開立」文字
 *             （尚未完成的訂單一律是這個：unpaid / to_ship）
 * - issued:   已開發票 → 前台顯示「線上列印」按鈕（只有 status === 'completed' 才會走到）
 * - voided:   已作廢 → 前台顯示「已作廢」文字
 * - none:     不開發票 → 前台顯示「不開立」文字（使用者結帳時選擇不開）
 */
export type InvoiceStatus = 'pending' | 'issued' | 'voided' | 'none';

export interface PackageInfo {
  no: string;
  qty: number;
  currentStep: TimelineStepKey;
  stepTimes?: Partial<Record<TimelineStepKey, string>>;
}

export type ReturnRequestStatus = 'pending' | 'approved' | 'rejected';

/** 組合商品的子品項（與購物車 CartBundleItem 同形，下單時原樣帶入）。 */
export interface OrderBundleItem {
  name: string;
  image?: string;
  spec: string;
  qty: number;
}

export interface OrderItem {
  image?: string;
  name: string;
  spec: string;
  price: number;
  qty: number;
  packages: PackageInfo[];
  /** 退換貨申請狀態；未申請時為 undefined */
  returnStatus?: ReturnRequestStatus;
  /** 駁回原因，僅在 returnStatus === 'rejected' 時使用 */
  returnRejectReason?: string;
  /** 組合商品：展開明細顯示「組合商品」標籤 + 子品清單。 */
  isBundle?: boolean;
  bundleItems?: OrderBundleItem[];
  /** 由加購區加入：展開明細顯示「加購」標籤。 */
  isAddOn?: boolean;
}

/**
 * 訂單金額明細（結帳時各組拆單後各自算好帶入）。
 * total（OrderRecord.total）為實付金額，等於：
 * goodsTotal − bulkDiscount − couponDiscount − rewardPointsUsed + shippingFee − shippingDiscount
 */
export interface OrderAmountBreakdown {
  /** 商品小計（原價 × 數量，未套任何優惠）。 */
  goodsTotal: number;
  /** 買多優惠折抵（正數＝折抵額）。 */
  bulkDiscount?: number;
  /** 套用的優惠券名稱（有套用才有）。 */
  couponName?: string;
  /** 優惠券折抵金額（正數＝折抵額）。 */
  couponDiscount?: number;
  /** 使用的紅利點數（1 點＝1 元，正數＝折抵額）。 */
  rewardPointsUsed?: number;
  /** 運費。 */
  shippingFee?: number;
  /** 運費折抵（達免運門檻時折抵全額運費，正數＝折抵額）。 */
  shippingDiscount?: number;
}

export interface OrderRecord {
  id: string;
  date: string;
  orderNo: string;
  qty: number;
  total: number;
  payment: string;
  delivery: string;
  invoice: string;
  invoiceStatus: InvoiceStatus;
  status: OrderStatus;
  detailTab: DetailTab;
  expanded: boolean;
  items: OrderItem[];
  /** 買家對這筆訂單的備註（留言給賣家）；下單時從結帳頁帶入。 */
  buyerNote?: string;
  /** 金額明細（優惠券 / 紅利 / 運費折抵等）；下單時從結帳頁帶入，顯示於訂購/付款資訊。 */
  amounts?: OrderAmountBreakdown;
}

export interface Transaction {
  date: string;
  method: string;
  orderId: string;
  amount: number;
}
