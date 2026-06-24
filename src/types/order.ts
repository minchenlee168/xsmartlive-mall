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

export interface OrderItem {
  image?: string;
  name: string;
  spec: string;
  price: number;
  qty: number;
  packages: PackageInfo[];
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
