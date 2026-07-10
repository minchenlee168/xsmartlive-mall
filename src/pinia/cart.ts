import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { products } from '../data/products';
import type {
  CartGroup,
  CartItem,
  CartBundleItem,
  RoutingRule,
  RoutingCondition,
  CheckoutMode,
  BulkDiscount,
  BulkDiscountRule,
} from '../types/cart';

// 型別 re-export，方便 store 使用者只 import 一處
export type {
  CartGroup,
  CartItem,
  CartBundleItem,
  CartTag,
  BulkDiscount,
  ShippingMethodId,
  PaymentMethodId,
  RoutingRule,
  RoutingCondition,
  CheckoutMode,
  BulkDiscountRule,
} from '../types/cart';

export const useCartStore = defineStore('cart', () => {
  const groups = ref<CartGroup[]>([
    {
      id: 1,
      sellerName: '07/09 廚娘小桂の直播廚房',
      tags: [{ label: '冷凍', type: 'info' }],
      // 冷凍商品僅支援宅配，且不收貨到付款
      shippingMethods: ['home'],
      paymentMethods: ['credit', 'atm'],
      checkoutMode: 'pickable',
      // 直播商品加購區：這台推薦的加購商品 id（對應 CartPage 的 ADD_ON_PRODUCTS）
      addOnProductIds: [9001, 9002, 9006],
      items: [
        {
          id: 'i1',
          productId: 100,
          name: '新春海陸雙享套組',
          image: products.find((p) => p.id === 100)?.image,
          spec: '雙人份',
          qty: 1,
          price: 1280,
          original: 1580,
          checked: true,
          isBundle: true,
          bundleExpanded: true,
          note: '直播現場限定價，售完不補；下訂後 3–5 個工作天出貨。',
          bundleItems:
            products
              .find((p) => p.id === 100)
              ?.bundleItems?.map((b) => ({
                name: b.name,
                image: b.image,
                spec: b.spec,
                qty: b.qty,
              })) ?? [],
        },
        {
          id: 'i1b',
          productId: 101,
          name: '新手主廚三件組（固定組合）',
          image: products.find((p) => p.id === 101)?.image,
          spec: '預設',
          qty: 1,
          price: 899,
          original: 1290,
          checked: true,
          isBundle: true,
          bundleExpanded: true,
          bundleItems:
            products
              .find((p) => p.id === 101)
              ?.bundleItems?.map((b) => ({
                name: b.name,
                image: b.image,
                spec: b.spec,
                qty: b.qty,
              })) ?? [],
        },
        {
          id: 'i2',
          productId: 102,
          name: '挪威生鮮鮭魚切片 厚切真空包裝',
          image: products.find((p) => p.id === 102)?.image,
          spec: '500g',
          qty: 1,
          price: 380,
          original: 480,
          checked: true,
          note: '本商品需冷藏保存，收貨後請立即冷凍。',
        },
        {
          id: 'i3',
          productId: 103,
          name: '古早味手工冷凍水餃 高麗菜豬肉口味',
          image: products.find((p) => p.id === 103)?.image,
          spec: '60顆/盒',
          qty: 1,
          price: 199,
          original: 250,
          checked: true,
          note: '料理方式：滾水下鍋煮 8 分鐘即可食用。全程冷凍配送。',
        },
      ],
    },
    {
      id: 2,
      sellerName: '07/08 妞妞ㄉ童裝小舖',
      // 「禁止棄標」語意已由 checkoutMode: 'default' 表達，tag 只保留溫層資訊
      tags: [{ label: '常溫', type: 'secondary' }],
      shippingMethods: ['home', 'store'],
      paymentMethods: ['credit', 'atm', 'cod'],
      checkoutMode: 'default',
      addOnProductIds: [9003, 9004, 9005, 9006],
      items: [
        {
          id: 'i4',
          productId: 13,
          name: '新款組合 包屁衣韓版小洋裝雙件組',
          image: products.find((p) => p.id === 13)?.image,
          spec: '66cm',
          qty: 1,
          price: 290,
          original: 350,
          checked: true,
          isBundle: true,
          bundleExpanded: true,
          note: '雙件為固定搭配，不接受單件替換；請於備註寫下想要的月齡。',
          bundleItems: [
            {
              name: '新款 包屁衣韓版小洋裝 秋冬刺繡款',
              image: products.find((p) => p.id === 3)?.image,
              spec: '',
              qty: 1,
            },
            {
              name: '新款 包屁衣韓版小洋裝 秋冬刺繡款',
              image: products.find((p) => p.id === 7)?.image,
              spec: '白-S',
              qty: 1,
            },
          ],
        },
        {
          id: 'i5',
          productId: 7,
          name: '限量 MM巧克力男寶寶搞怪包屁衣',
          image: products.find((p) => p.id === 7)?.image,
          spec: '66cm,藍色',
          qty: 1,
          price: 300,
          checked: true,
          note: '此款為直播限定色，不參與退換貨。',
        },
      ],
    },
  ]);

  /** 分派規則：加入商品時，第一條命中的規則決定進哪台購物車；沒命中走 fallback。 */
  const routingRules = ref<RoutingRule[]>([]);

  /** 多件優惠規則：綁定商品 id，套用到現有 + 未來加入的購物車項目。 */
  const bulkDiscountRules = ref<BulkDiscountRule[]>([
    {
      id: 'bd_seed_100',
      productId: 100,
      discount: {
        minQty: 2,
        unitPrice: 1080,
        note: '買 2 件以上每件 $1,080（省 $200/件）',
      },
    },
  ]);

  /** 今天的 MM/DD 字串 — 給新建購物車 sellerName 當前綴。 */
  const todayMMDD = (): string => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}`;
  };

  /** 查詢單一商品的買多優惠設定；沒設定 → undefined。 */
  const findBulkDiscountFor = (
    productId: number | undefined,
  ): BulkDiscount | undefined => {
    if (productId == null) return undefined;
    return bulkDiscountRules.value.find((r) => r.productId === productId)
      ?.discount;
  };

  /** 將優惠規則同步套到所有現有購物車項目（規則新增 / 修改 / 刪除時呼叫）。 */
  const syncBulkDiscountsToItems = () => {
    groups.value.forEach((g) => {
      g.items.forEach((i) => {
        i.bulkDiscount = findBulkDiscountFor(i.productId);
      });
    });
  };
  // 首次執行一次，把 seed 規則貼到 seed 商品上
  syncBulkDiscountsToItems();

  const totalCount = computed(() =>
    groups.value.reduce((sum, g) => sum + g.items.length, 0),
  );

  /** 依規則挑目標購物車：先跑 routingRules（上→下），沒命中回傳 undefined。 */
  const findRoutedCart = (productId: number): CartGroup | undefined => {
    const product = products.find((pr) => pr.id === productId);
    for (const rule of routingRules.value) {
      const target = groups.value.find((g) => g.id === rule.targetCartId);
      if (!target) continue;
      const cond = rule.condition;
      if (cond.type === 'productId' && cond.value === productId) return target;
      if (
        cond.type === 'category' &&
        product?.category &&
        cond.value === product.category
      )
        return target;
    }
    return undefined;
  };

  function addItem(
    p: {
      id: number;
      name: string;
      price: number;
      original?: number;
      image?: string;
    },
    spec = '預設',
    qty = 1,
    options?: {
      customBundleItems?: CartBundleItem[];
      /** 強制加到指定 cart（跳過分派規則）；用於加購區「選定 cart 加購」 */
      targetCartId?: number;
      /** 新增（非合併）時放在該台最上面而不是最後面；加購區用 */
      prepend?: boolean;
    },
  ) {
    // targetCartId 指定 → 直接找那台；否則走分派規則 / fallback / 新建
    let target: CartGroup | undefined;
    if (options?.targetCartId != null) {
      target = groups.value.find((g) => g.id === options.targetCartId);
    }
    if (!target) {
      target =
        findRoutedCart(p.id) ??
        groups.value.find((g) => g.checkoutMode !== 'paused');
    }
    if (!target) {
      target = {
        id: Date.now(),
        sellerName: `${todayMMDD()} 我的直播小舖`,
        tags: [],
        items: [],
        shippingMethods: ['home', 'store'],
        paymentMethods: ['credit', 'atm', 'cod'],
        checkoutMode: 'default',
      };
      groups.value.unshift(target);
    }
    // 同商品（同 productId）且同規格 → 合併累加數量，不另開一列
    const existing = target.items.find(
      (i) => i.productId === p.id && i.spec === spec,
    );
    if (existing) {
      existing.qty += qty;
      existing.checked = true;
      return;
    }
    // 依商品 id 從商品目錄補齊組合商品內容；任選組合則由呼叫端帶入實際挑選的 customBundleItems
    const cat = products.find((pr) => pr.id === p.id);
    const resolvedBundleItems = options?.customBundleItems ?? cat?.bundleItems;
    const newItem: CartItem = {
      id: `i_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      productId: p.id,
      name: p.name,
      image: p.image,
      spec,
      qty,
      price: p.price,
      original: p.original,
      checked: true,
      isBundle: cat?.isBundle,
      bundleExpanded: cat?.isBundle ? true : undefined,
      bundleItems: resolvedBundleItems,
      bulkDiscount: findBulkDiscountFor(p.id),
    };
    if (options?.prepend) {
      target.items.unshift(newItem);
    } else {
      target.items.push(newItem);
    }
  }

  function removeItem(groupId: number, itemId: string) {
    const g = groups.value.find((g) => g.id === groupId);
    if (g) g.items = g.items.filter((i) => i.id !== itemId);
  }

  // ---- 購物車設定：新增 / 修改 / 刪除 ---------------------------------------
  function addCart(patch?: Partial<Omit<CartGroup, 'id' | 'items'>>) {
    const g: CartGroup = {
      id: Date.now(),
      sellerName:
        patch?.sellerName ??
        `${todayMMDD()} 新直播小舖 ${groups.value.length + 1}`,
      tags: patch?.tags ?? [],
      items: [],
      shippingMethods: patch?.shippingMethods ?? ['home', 'store'],
      paymentMethods: patch?.paymentMethods ?? ['credit', 'atm', 'cod'],
      checkoutMode: patch?.checkoutMode ?? 'default',
    };
    groups.value.push(g);
    return g.id;
  }
  function updateCart(id: number, patch: Partial<Omit<CartGroup, 'id'>>) {
    const g = groups.value.find((x) => x.id === id);
    if (!g) return;
    Object.assign(g, patch);
    // 模式切換後同步勾選狀態：default = 全勾，paused = 全取消（避免無法結帳但仍勾著）
    if (patch.checkoutMode === 'default') {
      g.items.forEach((i) => (i.checked = true));
    } else if (patch.checkoutMode === 'paused') {
      g.items.forEach((i) => (i.checked = false));
    }
  }
  /** 刪除購物車：僅允許刪空的（避免商品憑空消失）。回傳是否成功。 */
  function removeCart(id: number): boolean {
    const g = groups.value.find((x) => x.id === id);
    if (!g || g.items.length > 0) return false;
    groups.value = groups.value.filter((x) => x.id !== id);
    // 同時清掉指向此車的規則
    routingRules.value = routingRules.value.filter(
      (r) => r.targetCartId !== id,
    );
    return true;
  }

  // ---- 分派規則：新增 / 修改 / 刪除 / 重排 ----------------------------------
  function addRule(condition: RoutingCondition, targetCartId: number) {
    routingRules.value.push({
      id: `r_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      condition,
      targetCartId,
    });
  }
  function updateRule(id: string, patch: Partial<Omit<RoutingRule, 'id'>>) {
    const r = routingRules.value.find((x) => x.id === id);
    if (!r) return;
    Object.assign(r, patch);
  }
  function removeRule(id: string) {
    routingRules.value = routingRules.value.filter((r) => r.id !== id);
  }
  /** 調整規則優先序：把 id 從目前位置移到新的 index。 */
  function reorderRule(id: string, toIndex: number) {
    const from = routingRules.value.findIndex((r) => r.id === id);
    if (from < 0) return;
    const [r] = routingRules.value.splice(from, 1);
    const clamped = Math.max(0, Math.min(toIndex, routingRules.value.length));
    routingRules.value.splice(clamped, 0, r);
  }

  // ---- 多件優惠規則：新增 / 修改 / 刪除 -------------------------------------
  function addBulkDiscountRule(rule: Omit<BulkDiscountRule, 'id'>) {
    bulkDiscountRules.value.push({
      id: `bd_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      ...rule,
    });
    syncBulkDiscountsToItems();
  }
  function updateBulkDiscountRule(
    id: string,
    patch: Partial<Omit<BulkDiscountRule, 'id'>>,
  ) {
    const r = bulkDiscountRules.value.find((x) => x.id === id);
    if (!r) return;
    Object.assign(r, patch);
    syncBulkDiscountsToItems();
  }
  function removeBulkDiscountRule(id: string) {
    bulkDiscountRules.value = bulkDiscountRules.value.filter(
      (r) => r.id !== id,
    );
    syncBulkDiscountsToItems();
  }

  return {
    groups,
    totalCount,
    routingRules,
    bulkDiscountRules,
    addItem,
    removeItem,
    addCart,
    updateCart,
    removeCart,
    addRule,
    updateRule,
    removeRule,
    reorderRule,
    addBulkDiscountRule,
    updateBulkDiscountRule,
    removeBulkDiscountRule,
  };
});
