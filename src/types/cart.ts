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
  /** 商品備註（顯示於商品列下方，例如冷藏須知、賣家提醒） */
  note?: string;
  /** 直播下標後尚未選規格：購物車需補選 SKU 才能結帳（見 [[live-bid-deferred-spec-plan]]）。 */
  specPending?: boolean;
  /** 後選規格選定的 SKU id（對應 products.ts 的 skus[].id / 庫存）。 */
  selectedSkuId?: string;
  /** 批次下標：同商品聚合成一列（qty = 下標總數），規格用分配矩陣批次填。 */
  isBidBatch?: boolean;
  /** 批次規格分配：skuId → 分配數量；總和需等於 qty 才可結帳。 */
  specAllocation?: Record<string, number>;
}

export interface CartTag {
  label: string;
  type: 'info' | 'danger' | 'secondary' | 'success';
}

/** 運送方式 id — 對應結帳頁的物流選單（home 宅配 / store 超商取貨 / pickup 自取 / post 郵局宅配） */
export type ShippingMethodId = 'home' | 'store' | 'pickup' | 'post';
/** 付款方式 id — 對應結帳頁的金流選單 */
export type PaymentMethodId =
  | 'credit'
  | 'credit-digital'
  | 'apple-pay'
  | 'atm'
  | 'cvs-code'
  | 'transfer'
  | 'line-pay'
  | 'ipass'
  | 'cod'
  | 'self-pickup';

/**
 * 每台購物車的結帳模式：
 * - default:   一次結清整台購物車，無法勾選部分商品
 * - pickable:  可勾選要結帳的品項，允許分批下單
 * - abandon:   直播 / 團購「棄標」流程，可放棄先前喊下的商品
 * - paused:    暫停收單（維護、備貨、活動間隔），僅供瀏覽
 */
export type CheckoutMode = 'default' | 'pickable' | 'abandon' | 'paused';

export interface CartGroup {
  id: number;
  sellerName: string;
  tags: CartTag[];
  items: CartItem[];
  /** 該賣家 / 場次支援的運送方式；合併結帳時取所有 group 的交集 */
  shippingMethods: ShippingMethodId[];
  /** 該賣家 / 場次支援的付款方式；合併結帳時取所有 group 的交集 */
  paymentMethods: PaymentMethodId[];
  /** 結帳模式（見 CheckoutMode） */
  checkoutMode: CheckoutMode;
  /** 該台的加購推薦商品 ID 清單；空 / undefined 表示該台沒有加購區 */
  addOnProductIds?: number[];
}

/** 分派規則條件：目前支援分類、單一商品 id 兩種。 */
export type RoutingCondition =
  { type: 'category'; value: string } | { type: 'productId'; value: number };

/** 分派規則：加入商品時第一條命中的規則決定進哪台購物車。 */
export interface RoutingRule {
  id: string;
  condition: RoutingCondition;
  targetCartId: number;
}

/** 多件優惠規則：綁在商品 id 上，套用到所有同商品的購物車項目。 */
export interface BulkDiscountRule {
  id: string;
  productId: number;
  discount: BulkDiscount;
}
