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

export type OrderStatus =
  | 'unpaid'
  | 'to_ship'
  | 'completed'
  | 'cancelled'
  | 'returned';

/**
 * 發票狀態（對應後台分類）：
 * - pending:  可開立發票 / 未分類 → 前台顯示「尚未開立」文字
 *             （尚未完成的訂單一律是這個：unpaid / to_ship / cancelled）
 * - issued:   已開發票 → 前台顯示「線上列印」按鈕（只有 status === 'completed' 才會走到）
 * - voided:   已作廢 → 前台顯示「已作廢」文字
 *             （申請通過的退換貨：status === 'returned'）
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
}

export interface Transaction {
  date: string;
  method: string;
  orderId: string;
  amount: number;
}
