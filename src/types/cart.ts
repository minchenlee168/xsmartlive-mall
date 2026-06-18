export interface CartBundleItem {
  name: string;
  image?: string;
  spec: string;
  qty: number;
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
}

export interface CartTag {
  label: string;
  type: 'info' | 'danger' | 'secondary';
}

export interface CartGroup {
  id: number;
  sellerName: string;
  tags: CartTag[];
  items: CartItem[];
}
