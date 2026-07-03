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
  status: OrderStatus;
  detailTab: DetailTab;
  expanded: boolean;
  items: OrderItem[];
}

export interface Transaction {
  date: string;
  method: string;
  orderId: string;
  amount: number;
}
