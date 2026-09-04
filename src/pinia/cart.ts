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
  BulkDiscountResult,
  BulkDiscountRule,
} from '../types/cart';

// 型別 re-export，方便 store 使用者只 import 一處
export type {
  CartGroup,
  CartItem,
  CartBundleItem,
  CartTag,
  BulkDiscountTier,
  BulkDiscountResult,
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
      // 直播下標車：default 模式（整台一起結、禁止棄標）；下標當下未選規格，需在車內後選 SKU
      id: 6,
      sellerName: '07/10 晚間直播搶購場',
      sessionName: '晚間搶購場 EP.128',
      tags: [{ label: '常溫', type: 'secondary' }],
      shippingMethods: ['home', 'store'],
      paymentMethods: ['credit', 'atm', 'cod'],
      checkoutMode: 'default',
      items: [
        {
          // 批次下標：同商品聚合成一列（得標 100 件），規格用彈窗批次挑選
          id: 'i_bid1',
          productId: 3,
          name: '寶寶連身包屁衣 有機棉長袖春秋款 0-18個月',
          image: products.find((p) => p.id === 3)?.image,
          spec: '',
          qty: 100,
          price: 199,
          original: 320,
          checked: true,
          specPending: true,
          isBidBatch: true,
          specAllocation: {},
        },
        {
          // 第二個得標商品（同為待挑選規格）
          id: 'i_bid2',
          productId: 8,
          name: '女童牛仔短褲 夏季薄款休閒百搭',
          image: products.find((p) => p.id === 8)?.image,
          spec: '',
          qty: 30,
          price: 220,
          original: 360,
          checked: true,
          specPending: true,
          isBidBatch: true,
          specAllocation: {},
        },
        {
          // 第三個得標商品：三軸規格（尺寸 × 顏色 × 袖長），測後選規最大情境
          id: 'i_bid3',
          productId: 5,
          name: '女童蕾絲公主裙 春夏薄款蓬蓬裙禮服',
          image: products.find((p) => p.id === 5)?.image,
          spec: '',
          qty: 50,
          price: 450,
          original: 680,
          checked: true,
          specPending: true,
          isBidBatch: true,
          specAllocation: {},
        },
        {
          // 任選 4 件動態組合（下標待選）：規格用彈窗挑選（選項＋規格→加入→已選 X/4），bundleItems 空＝待挑選；default 車整台一起結，checked: true
          id: 'i_pick4',
          productId: 16,
          name: '任選 4 件 寶寶配件超值組合',
          image: products.find((p) => p.id === 16)?.image,
          spec: '預設',
          qty: 1,
          price: 599,
          original: 980,
          checked: true,
          isBundle: true,
          bundleExpanded: true,
          bundleItems: [],
        },
      ],
    },
    {
      id: 1,
      sellerName: '07/09 廚娘小桂の直播廚房',
      sessionName: '小桂廚房 EP.56',
      tags: [{ label: '冷凍', type: 'info' }],
      // 冷凍商品四種物流皆支援（超商走冷凍取貨），但不收貨到付款 / 自取付款
      shippingMethods: ['home', 'store', 'pickup', 'post'],
      paymentMethods: [
        'credit',
        'apple-pay',
        'atm',
        'cvs-code',
        'transfer',
        'line-pay',
        'ipass',
      ],
      checkoutMode: 'pickable',
      // 直播商品加購區：這台推薦的加購商品 id（對應 CartPage 的 ADD_ON_PRODUCTS）
      // 16＝任選組合加購（點加入會跳任選組合彈窗）
      addOnProductIds: [16, 9001, 9002, 9003],
      items: [
        {
          id: 'i1',
          productId: 100,
          name: '新春海陸雙享套組',
          image: products.find((p) => p.id === 100)?.image,
          spec: '雙人份',
          // 預設數量 2 + 勾選：一進購物車即達買多優惠門檻（滿 2 件折 $200），直接看到 tag
          qty: 2,
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
          checked: false,
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
          checked: false,
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
          checked: false,
          note: '料理方式：滾水下鍋煮 8 分鐘即可食用。全程冷凍配送。',
        },
        {
          // 加購商品：從加購區加入，顯示於清單最底「-加購區-」下、與一般商品同呈現。
          // 模擬同一台車的加購商品來自不同直播場次（各列標示來源 sessionName）。
          id: 'i-addon-1',
          productId: 9002,
          name: '寶寶柔嫩濕紙巾 80 抽 / 包',
          image:
            'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&fit=crop',
          spec: '預設',
          qty: 1,
          price: 49,
          original: 80,
          checked: true,
          isAddOn: true,
          sessionName: '小桂廚房 EP.56',
        },
        {
          id: 'i-addon-2',
          productId: 9001,
          name: '寶寶嬰兒紗布手帕 5 入組',
          image:
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
          spec: '粉色/M',
          qty: 1,
          price: 89,
          original: 150,
          checked: true,
          isAddOn: true,
          sessionName: '妞妞童裝 EP.23',
        },
        {
          id: 'i-addon-3',
          productId: 9003,
          name: '不鏽鋼防滑安撫奶嘴',
          image:
            'https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=400&fit=crop',
          spec: 'M',
          qty: 1,
          price: 129,
          original: 200,
          checked: false,
          isAddOn: true,
          sessionName: '女王選物 EP.41',
        },
      ],
    },
    {
      id: 2,
      sellerName: '07/08 妞妞ㄉ童裝小舖',
      sessionName: '妞妞童裝 EP.23',
      // 「禁止棄標」語意已由 checkoutMode: 'default' 表達，tag 只保留溫層資訊
      tags: [{ label: '常溫', type: 'secondary' }],
      shippingMethods: ['home', 'store', 'pickup', 'post'],
      paymentMethods: [
        'credit',
        'apple-pay',
        'atm',
        'cvs-code',
        'transfer',
        'line-pay',
        'ipass',
        'cod',
        'self-pickup',
      ],
      checkoutMode: 'default',
      addOnProductIds: [9004, 9005, 9006, 9007],
      items: [
        {
          id: 'i5',
          productId: 7,
          name: '限量 MM巧克力男寶寶搞怪包屁衣',
          image: products.find((p) => p.id === 7)?.image,
          spec: '66cm/藍色',
          qty: 1,
          price: 300,
          checked: false,
          note: '此款為直播限定色，不參與退換貨。',
        },
      ],
    },
    {
      id: 3,
      sellerName: '07/07 春日童樂繪本社',
      sessionName: '春日繪本 EP.09',
      tags: [{ label: '常溫', type: 'secondary' }],
      shippingMethods: ['home', 'store'],
      paymentMethods: ['credit', 'atm', 'cod'],
      checkoutMode: 'pickable',
      addOnProductIds: [9008, 9009],
      items: [
        {
          id: 'i6',
          productId: 5,
          name: '女童蕾絲公主裙 春夏薄款蓬蓬裙禮服',
          image: products.find((p) => p.id === 5)?.image,
          spec: '110cm/粉色',
          qty: 1,
          price: 450,
          original: 680,
          checked: false,
        },
        {
          // 同商品多規格：與 i6 同一件公主裙、不同尺寸/顏色，購物車拆成獨立一列
          id: 'i6b',
          productId: 5,
          name: '女童蕾絲公主裙 春夏薄款蓬蓬裙禮服',
          image: products.find((p) => p.id === 5)?.image,
          spec: '120cm/藍色',
          qty: 1,
          price: 480,
          original: 680,
          checked: false,
        },
      ],
    },
    {
      id: 4,
      // 商城來源（非直播場次）：不設 sessionName → 標題列右側不顯示場次名
      sellerName: '07/06 家家好物優選',
      tags: [{ label: '常溫', type: 'secondary' }],
      shippingMethods: ['home', 'store'],
      paymentMethods: ['credit', 'atm'],
      checkoutMode: 'paused',
      addOnProductIds: [9010, 9011, 9012],
      items: [
        {
          id: 'i7',
          productId: 6,
          name: '男童加絨加厚衝鋒衣外套 防風防水戶外機能款 超值優惠',
          image: products.find((p) => p.id === 6)?.image,
          spec: '120cm',
          qty: 1,
          price: 620,
          original: 980,
          checked: false,
          note: '防風防水機能布料，內裡加絨保暖；建議手洗或使用洗衣袋，勿烘乾以免影響防水膜。',
        },
      ],
    },
    {
      id: 5,
      sellerName: '07/05 女王的優雅',
      sessionName: '女王選物 EP.41',
      tags: [{ label: '常溫', type: 'secondary' }],
      shippingMethods: ['home', 'store'],
      paymentMethods: ['credit', 'atm', 'cod'],
      checkoutMode: 'pickable',
      addOnProductIds: [9013, 9014, 9015, 9016],
      items: [
        {
          id: 'i8',
          productId: 4,
          name: '親子裝母女裝秋冬新款格紋棉麻長裙套裝',
          image: products.find((p) => p.id === 4)?.image,
          spec: 'M',
          qty: 1,
          price: 890,
          original: 1200,
          checked: false,
        },
      ],
    },
    {
      // 商城來源購物車：非直播場次（無 sessionName）；從「商城商品」分類加入的商品
      // 依 routingRules 進這台，且為「自選結帳（pickable）」模式。
      id: 7,
      sellerName: 'xsmartlive 商城嚴選',
      tags: [{ label: '常溫', type: 'secondary' }],
      shippingMethods: ['home', 'store', 'pickup', 'post'],
      paymentMethods: [
        'credit',
        'apple-pay',
        'atm',
        'cvs-code',
        'transfer',
        'line-pay',
        'ipass',
      ],
      checkoutMode: 'pickable',
      items: [
        {
          id: 'm1',
          productId: 400,
          name: '北歐風棉麻抱枕套 45×45cm',
          image: products.find((p) => p.id === 400)?.image,
          spec: '米白',
          qty: 1,
          price: 199,
          original: 350,
          checked: true,
        },
        {
          id: 'm2',
          productId: 402,
          name: '無線藍牙耳機 降噪入耳式',
          image: products.find((p) => p.id === 402)?.image,
          spec: '黑',
          qty: 1,
          price: 1290,
          original: 1990,
          checked: false,
        },
      ],
    },
  ]);

  /** 分派規則：加入商品時，第一條命中的規則決定進哪台購物車；沒命中走 fallback。 */
  const routingRules = ref<RoutingRule[]>([
    {
      // 「商城商品」分類 → 進商城車（id 7，自選結帳 pickable）
      id: 'route_mall_products',
      condition: { type: 'category', value: '商城商品' },
      targetCartId: 7,
    },
  ]);

  /** 多件優惠規則：綁定商品 id，可設多個階梯（滿 N 件折 M 元），取最高達標階折抵一次。 */
  const bulkDiscountRules = ref<BulkDiscountRule[]>([
    {
      id: 'bd_seed_100',
      productId: 100,
      tiers: [{ minQty: 2, discountAmount: 200 }],
    },
  ]);

  /** 今天的 MM/DD 字串 — 給新建購物車 sellerName 當前綴。 */
  const todayMMDD = (): string => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}/${dd}`;
  };

  /** 查詢單一商品的買多優惠規則；沒設定 → undefined。 */
  const findBulkRuleFor = (
    productId: number | undefined,
  ): BulkDiscountRule | undefined =>
    productId == null
      ? undefined
      : bulkDiscountRules.value.find((r) => r.productId === productId);

  /**
   * 依商品清單算每個 productId 的買多優惠折抵：
   * 同商品跨規格「合計數量」判門檻、取最高達標階、每商品折一次，折抵夾到不超過該商品小計。
   * 禁止棄標（default）購物車不套用（整台固定、買多優惠無意義）。
   * 回傳 Map<productId, BulkDiscountResult>。
   */
  const bulkDiscountForItems = (
    items: Pick<CartItem, 'productId' | 'qty' | 'price'>[],
    checkoutMode: CheckoutMode,
  ): Map<number, BulkDiscountResult> => {
    const result = new Map<number, BulkDiscountResult>();
    if (checkoutMode === 'default') return result;
    // 先把同 productId 的數量與小計跨規格合計
    const agg = new Map<number, { qty: number; lineTotal: number }>();
    for (const i of items) {
      if (i.productId == null || !findBulkRuleFor(i.productId)) continue;
      const cur = agg.get(i.productId) ?? { qty: 0, lineTotal: 0 };
      cur.qty += i.qty;
      cur.lineTotal += i.price * i.qty;
      agg.set(i.productId, cur);
    }
    for (const [productId, { qty, lineTotal }] of agg) {
      const tiers = findBulkRuleFor(productId)!.tiers;
      // 取「已達標」中門檻最高的一階
      const reached = tiers
        .filter((t) => qty >= t.minQty)
        .sort((a, b) => b.minQty - a.minQty)[0];
      if (!reached) continue;
      result.set(productId, {
        productId,
        totalQty: qty,
        minQty: reached.minQty,
        discount: Math.min(reached.discountAmount, lineTotal),
      });
    }
    return result;
  };

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
      /** 直播下標：未選規格加入，強制各自成列（不合併），車內再後選 SKU */
      specPending?: boolean;
      /** 多軸規格商品：已選定的 SKU id（讓購物車單品規格下拉顯示 / 可改） */
      selectedSkuId?: string;
      /** 由加購區加入：購物車列顯示「加購」標記 */
      isAddOn?: boolean;
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
    // 直播下標（待選規格）：同商品聚合進批次列、累加下標數；否則同商品同規格 → 合併累加
    const existing = options?.specPending
      ? target.items.find((i) => i.productId === p.id && i.isBidBatch)
      : target.items.find((i) => i.productId === p.id && i.spec === spec);
    if (existing) {
      existing.qty += qty;
      existing.checked = true;
      // 從加購區再加同商品 → 標記為加購
      if (options?.isAddOn) existing.isAddOn = true;
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
      spec: options?.specPending ? '' : spec,
      qty,
      price: p.price,
      original: p.original,
      checked: true,
      isBundle: cat?.isBundle,
      bundleExpanded: cat?.isBundle ? true : undefined,
      bundleItems: resolvedBundleItems,
      specPending: options?.specPending,
      isBidBatch: options?.specPending || undefined,
      specAllocation: options?.specPending ? {} : undefined,
      selectedSkuId: options?.selectedSkuId,
      isAddOn: options?.isAddOn,
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
  }
  function updateBulkDiscountRule(
    id: string,
    patch: Partial<Omit<BulkDiscountRule, 'id'>>,
  ) {
    const r = bulkDiscountRules.value.find((x) => x.id === id);
    if (!r) return;
    Object.assign(r, patch);
  }
  function removeBulkDiscountRule(id: string) {
    bulkDiscountRules.value = bulkDiscountRules.value.filter(
      (r) => r.id !== id,
    );
  }

  return {
    groups,
    totalCount,
    routingRules,
    bulkDiscountRules,
    findBulkRuleFor,
    bulkDiscountForItems,
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
