<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import { useUiStore } from '../pinia/ui';
import {
  useCartStore,
  type CartItem,
  type ShippingMethodId,
  type PaymentMethodId,
} from '../pinia/cart';
import { useOrdersStore } from '../pinia/orders';

interface CheckoutGroup {
  id: number;
  sellerName: string;
  items: CartItem[];
  shippingMethods: ShippingMethodId[];
  paymentMethods: PaymentMethodId[];
}
interface Coupon {
  id: string;
  amount: string;
  title: string;
  desc: string;
  scope: string;
  expiry: string;
  disabled?: boolean;
  disabledReason?: string;
  applicableItemIds?: string[];
  minSpend?: number;
}
interface HomeAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
  unavailable?: boolean;
}
interface StoreAddress {
  id: string;
  name: string;
  phone: string;
  chain: '7-11' | 'FamilyMart';
  storeName: string;
  address: string;
  isDefault: boolean;
}

type ShipDrawerView = 'list' | 'add-home' | 'add-store';
type ShipMethod = 'home' | 'store' | null;

const INVOICE_CARRIERS = [
  { label: '會員載具（電子信箱）', value: 'member-email' },
  { label: '手機條碼', value: 'mobile' },
  { label: '自然人憑證', value: 'natural' },
];
const PAYMENT_METHODS = [
  { label: '線上信用卡', value: 'credit' },
  { label: 'ATM 轉帳', value: 'atm' },
  { label: '貨到付款', value: 'cod' },
];
const DRAWER_COUNTRY_CODES = ['+886', '+852'];
const DRAWER_COUNTRIES = ['台灣', '香港'];
const DRAWER_CITIES = ['高雄市', '台北市', '桃園市'];
const DRAWER_DISTRICTS = ['前鎮區', '三民區', '信義區'];
const HOME_SHIPPING_FEE = 150;
const STORE_SHIPPING_FEE = 60;
const OTHER_GROUP_FEE = 100;
const SHIPPING_DISCOUNT = -200;

const router = useRouter();
const ui = useUiStore();
const cartStore = useCartStore();
const ordersStore = useOrdersStore();

/** 依購物車拆組的商品明細；每組只保留有勾選的商品（結帳頁只讀，不可改動）。 */
const checkoutGroups = computed<CheckoutGroup[]>(() =>
  cartStore.groups
    .map((g) => ({
      id: g.id,
      sellerName: g.sellerName,
      items: g.items.filter((i) => i.checked),
      shippingMethods: g.shippingMethods,
      paymentMethods: g.paymentMethods,
    }))
    .filter((g) => g.items.length > 0),
);

/** 各購物車支援的運送方式取交集 → 合併結帳可用的運送方式。 */
const supportedShippingMethods = computed<ShippingMethodId[]>(() => {
  const groups = checkoutGroups.value;
  if (groups.length === 0) return [];
  return groups[0].shippingMethods.filter((m) =>
    groups.every((g) => g.shippingMethods.includes(m)),
  );
});
/** 各購物車支援的付款方式取交集。 */
const supportedPaymentMethods = computed<PaymentMethodId[]>(() => {
  const groups = checkoutGroups.value;
  if (groups.length === 0) return [];
  return groups[0].paymentMethods.filter((m) =>
    groups.every((g) => g.paymentMethods.includes(m)),
  );
});

const allItems = computed<CartItem[]>(() =>
  checkoutGroups.value.flatMap((g) => g.items),
);

/** 買多優惠判定與計算。 */
const hasBulkDiscount = (item: CartItem): boolean =>
  !!item.bulkDiscount && item.qty >= item.bulkDiscount.minQty;
const effectiveUnitPrice = (item: CartItem): number =>
  hasBulkDiscount(item) ? item.bulkDiscount!.unitPrice : item.price;
const bulkDiscountAmount = (item: CartItem): number =>
  hasBulkDiscount(item)
    ? (item.price - item.bulkDiscount!.unitPrice) * item.qty
    : 0;

/** 商品總金額（未套用任何優惠）。 */
const itemsSubtotal = computed(() =>
  allItems.value.reduce((s, i) => s + i.price * i.qty, 0),
);
/** 買多優惠折抵總額。 */
const bulkDiscountTotal = computed(() =>
  allItems.value.reduce((s, i) => s + bulkDiscountAmount(i), 0),
);
/** 商品總金額（扣掉買多優惠後）。 */
const itemsAfterBulk = computed(
  () => itemsSubtotal.value - bulkDiscountTotal.value,
);

onMounted(() => {
  if (allItems.value.length === 0) router.replace('/cart');
});

const couponCode = ref('');
const invoiceCarrierType = ref('member-email');
const invoiceEmail = ref('abc@gmail.com');

// --- Coupon drawer ---
const coupons = ref<Coupon[]>([
  {
    id: 'cp1',
    amount: '折100',
    title: '滿千折百優惠券（滿1000元使用）',
    desc: '活動訂單滿 $1000 現折 $100',
    scope: '適用範圍（直播場次）：我是直播場次-2025-12-24',
    expiry: '有效期限至 2026.01.20 23:00',
    minSpend: 1000,
  },
  {
    id: 'cp2',
    amount: '50%',
    title: '滿千五折（滿1000元使用）',
    desc: '活動訂單滿 $1000 打5折',
    scope: '適用範圍(粉絲團貼文)：我是粉絲團貼文-2025-12-24',
    expiry: '有效期限至 2026.01.20 23:00',
    minSpend: 1000,
  },
  {
    id: 'cp4',
    amount: '折50',
    title: '指定童裝折50（限單一商品）',
    desc: '指定洋裝商品現折 $50',
    scope: '適用商品：韓版泡泡袖針織洋裝',
    expiry: '有效期限至 2026.01.20 23:00',
    applicableItemIds: ['i2'],
  },
  {
    id: 'cp5',
    amount: '折80',
    title: '組合商品專屬折80（限單一商品）',
    desc: '指定組合商品現折 $80',
    scope: '適用商品：包屁衣韓版小洋裝雙件組',
    expiry: '有效期限至 2026.01.20 23:00',
    applicableItemIds: ['i1'],
  },
  {
    id: 'cp3',
    amount: '折300',
    title: '滿三千折三百（滿3000元使用）',
    desc: '常客單筆滿 $3000 現折 $300',
    scope: '適用範圍：全站',
    expiry: '有效期限至 2026.01.20 23:00',
    minSpend: 3000,
  },
]);
const isCouponDrawerVisible = ref(false);
const couponDrawerSelected = ref<string | null>(null);

const isCouponUsable = (c: Coupon) =>
  !c.disabled && itemsAfterBulk.value >= (c.minSpend ?? 0);
const couponUnusableReason = (c: Coupon) => {
  if (c.disabled) return c.disabledReason ?? '不可使用';
  if (c.minSpend && itemsAfterBulk.value < c.minSpend) return '金額未達門檻';
  return '';
};
const discountOf = (c: Coupon): number => {
  if (!isCouponUsable(c)) return 0;
  if (c.applicableItemIds) {
    const target = allItems.value.find((i) =>
      c.applicableItemIds!.includes(i.id),
    );
    if (!target) return 0;
    // 優惠券以買多優惠後的金額為基底再折抵
    const line = effectiveUnitPrice(target) * target.qty;
    const fixed = c.amount.match(/折(\d+)/);
    if (fixed) return Math.min(line, Number(fixed[1]));
    const pct = c.amount.match(/(\d+)%/);
    if (pct) return Math.round((line * (100 - Number(pct[1]))) / 100);
    return 0;
  }
  const fixed = c.amount.match(/折(\d+)/);
  if (fixed) return Number(fixed[1]);
  const pct = c.amount.match(/(\d+)%/);
  if (pct)
    return Math.round((itemsAfterBulk.value * (100 - Number(pct[1]))) / 100);
  return 0;
};

const manualCouponId = ref<string | null>(null);
const bestCouponId = computed(() => {
  const usable = coupons.value.filter(isCouponUsable);
  if (!usable.length) return null;
  return usable.reduce((best, c) =>
    discountOf(c) > discountOf(best) ? c : best,
  ).id;
});
const appliedCouponId = computed(
  () => manualCouponId.value ?? bestCouponId.value,
);
const appliedCoupon = computed(
  () => coupons.value.find((c) => c.id === appliedCouponId.value) ?? null,
);
const sortedCoupons = computed(() =>
  [...coupons.value].sort((a, b) => {
    const ua = isCouponUsable(a),
      ub = isCouponUsable(b);
    if (ua !== ub) return ua ? -1 : 1;
    return discountOf(b) - discountOf(a);
  }),
);
const couponAppliesTo = (itemId: string) => {
  const c = appliedCoupon.value;
  if (!c || !c.applicableItemIds) return true;
  return c.applicableItemIds.includes(itemId);
};
/** 原始總計（單價 × 數量），不含任何優惠。 */
const lineTotal = (item: CartItem) => item.price * item.qty;
/** 買多優惠後總計（不含優惠券）。 */
const lineTotalAfterBulk = (item: CartItem) =>
  effectiveUnitPrice(item) * item.qty;
/** 套用優惠券後的總計；沒吃到本券的商品回傳 null。 */
const discountedLineTotal = (item: CartItem): number | null => {
  const c = appliedCoupon.value;
  if (!c || !c.applicableItemIds || !c.applicableItemIds.includes(item.id))
    return null;
  return Math.max(0, lineTotalAfterBulk(item) - discountOf(c));
};
/** 依購物車拆組後的每組小計（買多優惠後、優惠券後）。 */
const groupDisplayTotal = (g: CheckoutGroup): number =>
  g.items.reduce(
    (s, i) => s + (discountedLineTotal(i) ?? lineTotalAfterBulk(i)),
    0,
  );

const handleOpenCouponDrawer = () => {
  couponDrawerSelected.value =
    appliedCouponId.value ?? coupons.value.find(isCouponUsable)?.id ?? null;
  isCouponDrawerVisible.value = true;
};
const handleConfirmCouponDrawer = () => {
  manualCouponId.value = couponDrawerSelected.value;
  isCouponDrawerVisible.value = false;
  ui.toast('已套用選擇的優惠券');
};
const handleApplyCouponCode = () => {
  if (!couponCode.value.trim()) return;
  ui.toast('已套用選擇的優惠券');
};

const isCouponScannerVisible = ref(false);
const handleOpenCouponScanner = () => {
  isCouponScannerVisible.value = true;
};
const handleFakeScanResult = () => {
  couponCode.value = `QR${Math.floor(100000 + Math.random() * 900000)}`;
  isCouponScannerVisible.value = false;
  handleApplyCouponCode();
};

// --- Shipping drawer ---
const isShipDrawerVisible = ref(false);
const shipDrawerView = ref<ShipDrawerView>('list');
const shipMethod = ref<ShipMethod>('home');
const homeAddresses = ref<HomeAddress[]>([
  {
    id: 'h1',
    name: '王小明',
    phone: '+886 912****56',
    address: '台北市信義區忠孝東路五段 100 號 10 樓',
    isDefault: true,
  },
  {
    id: 'h2',
    name: '王小明',
    phone: '+886 912****56',
    address: '高雄市前鎮區中山路一段 50 號 8 樓',
    isDefault: false,
    unavailable: true,
  },
]);
const storeAddresses = ref<StoreAddress[]>([
  {
    id: 's1',
    name: '王小明',
    phone: '+886 912****56',
    chain: '7-11',
    storeName: '雄鎮門市',
    address: '806高雄市前鎮區東一街7號',
    isDefault: true,
  },
  {
    id: 's2',
    name: '王小明',
    phone: '+886 912****56',
    chain: 'FamilyMart',
    storeName: '平鎮上海店',
    address: '324桃園市平鎮區上海路205號',
    isDefault: false,
  },
]);
const selectedHomeId = ref<string | null>('h1');
const selectedStoreId = ref<string | null>('s1');

const handleOpenShipDrawer = () => {
  shipDrawerView.value = 'list';
  isShipDrawerVisible.value = true;
};
const handleSetDefaultHome = (id: string) => {
  homeAddresses.value.forEach((a) => {
    a.isDefault = a.id === id;
  });
};
const handleSetDefaultStore = (id: string) => {
  storeAddresses.value.forEach((a) => {
    a.isDefault = a.id === id;
  });
};
const handleDeleteHome = (id: string) => {
  const wasDefault = homeAddresses.value.find((a) => a.id === id)?.isDefault;
  homeAddresses.value = homeAddresses.value.filter((a) => a.id !== id);
  if (
    wasDefault &&
    homeAddresses.value.length > 0 &&
    !homeAddresses.value.some((a) => a.isDefault)
  ) {
    homeAddresses.value[0].isDefault = true;
  }
  if (selectedHomeId.value === id)
    selectedHomeId.value = homeAddresses.value[0]?.id ?? null;
};
const handleDeleteStore = (id: string) => {
  const wasDefault = storeAddresses.value.find((a) => a.id === id)?.isDefault;
  storeAddresses.value = storeAddresses.value.filter((a) => a.id !== id);
  if (
    wasDefault &&
    storeAddresses.value.length > 0 &&
    !storeAddresses.value.some((a) => a.isDefault)
  ) {
    storeAddresses.value[0].isDefault = true;
  }
  if (selectedStoreId.value === id)
    selectedStoreId.value = storeAddresses.value[0]?.id ?? null;
};

// Add-home form
const newHomeName = ref('');
const newHomeCountryCode = ref('+886');
const newHomePhone = ref('');
const newHomeCountry = ref('台灣');
const newHomeCity = ref('高雄市');
const newHomeDistrict = ref('前鎮區');
const newHomeAddress = ref('');
const resetAddHomeForm = () => {
  newHomeName.value = '';
  newHomePhone.value = '';
  newHomeAddress.value = '';
};
const handleSubmitAddHome = () => {
  if (!newHomeName.value.trim()) return;
  const isTW = newHomeCountry.value === '台灣';
  const address = isTW
    ? `${newHomeCity.value}${newHomeDistrict.value} ${newHomeAddress.value}`
    : `${newHomeCountry.value} ${newHomeAddress.value}`;
  homeAddresses.value.push({
    id: 'h' + (homeAddresses.value.length + 1),
    name: newHomeName.value,
    phone: `${newHomeCountryCode.value} ${newHomePhone.value || '000****00'}`,
    address,
    isDefault: false,
  });
  resetAddHomeForm();
  shipDrawerView.value = 'list';
};

// Add-store form
const newStoreChain = ref<'7-11' | 'FamilyMart' | null>(null);
const newStoreName = ref('王小明');
const newStorePhone = ref('09123456');
const pickedStoreName = ref('');
const pickedStoreAddr = ref('');
const handlePickChain = (c: '7-11' | 'FamilyMart') => {
  newStoreChain.value = c;
  if (c === '7-11') {
    pickedStoreName.value = '7-11 鑫工門市';
    pickedStoreAddr.value = '台北市信義區忠孝東路五段 100 號 10 樓';
  } else {
    pickedStoreName.value = '全家 上海店';
    pickedStoreAddr.value = '324桃園市平鎮區上海路205號';
  }
};
const resetAddStoreForm = () => {
  newStoreChain.value = null;
  pickedStoreName.value = '';
  pickedStoreAddr.value = '';
};
const handleSubmitAddStore = () => {
  if (!newStoreChain.value || !pickedStoreName.value) return;
  storeAddresses.value.push({
    id: 's' + (storeAddresses.value.length + 1),
    name: newStoreName.value,
    phone: `+886 ${newStorePhone.value.replace(/(\d{3})\d+(\d{2})/, '$1****$2')}`,
    chain: newStoreChain.value,
    storeName: pickedStoreName.value,
    address: pickedStoreAddr.value,
    isDefault: false,
  });
  resetAddStoreForm();
  shipDrawerView.value = 'list';
};

const shippingFee = computed(() => {
  if (shipMethod.value === 'home') return HOME_SHIPPING_FEE;
  if (shipMethod.value === 'store') return STORE_SHIPPING_FEE;
  return 0;
});
const shippingMethodLabel = computed(() => {
  if (shipMethod.value === 'home') return '宅配';
  if (shipMethod.value === 'store') return '超商配送';
  return '請選擇';
});
const selectedHome = computed(() =>
  homeAddresses.value.find((a) => a.id === selectedHomeId.value),
);
const selectedStore = computed(() =>
  storeAddresses.value.find((a) => a.id === selectedStoreId.value),
);

const rewardPoints = ref<number | null>(null);
const paymentMethod = ref<PaymentMethodId>('credit');

/** 依交集過濾的付款方式選項 → 直接餵給 Select。 */
const availablePaymentMethods = computed(() =>
  PAYMENT_METHODS.filter((m) =>
    supportedPaymentMethods.value.includes(m.value as PaymentMethodId),
  ),
);

// 目前選中的運送 / 付款方式若不在交集中 → 切成第一個可用的
watch(
  supportedShippingMethods,
  (methods) => {
    if (methods.length === 0) {
      shipMethod.value = null;
      return;
    }
    if (!shipMethod.value || !methods.includes(shipMethod.value)) {
      shipMethod.value = methods[0];
    }
  },
  { immediate: true },
);
watch(
  supportedPaymentMethods,
  (methods) => {
    if (methods.length === 0) return;
    if (!methods.includes(paymentMethod.value)) {
      paymentMethod.value = methods[0];
    }
  },
  { immediate: true },
);

const productTotal = computed(() => itemsSubtotal.value);
const shippingTotal = computed(() => shippingFee.value + OTHER_GROUP_FEE);
const bulkDiscount = computed(() => -bulkDiscountTotal.value);
const couponDiscount = computed(() =>
  appliedCoupon.value ? -discountOf(appliedCoupon.value) : 0,
);
const rewardPointsNum = computed(() =>
  Math.max(0, Number(rewardPoints.value) || 0),
);
const finalTotal = computed(
  () =>
    productTotal.value +
    shippingTotal.value +
    bulkDiscount.value +
    SHIPPING_DISCOUNT +
    couponDiscount.value -
    rewardPointsNum.value,
);
const totalSaved = computed(
  () =>
    Math.abs(bulkDiscount.value + SHIPPING_DISCOUNT + couponDiscount.value) +
    rewardPointsNum.value,
);

const handlePlaceOrder = () => {
  const method =
    PAYMENT_METHODS.find((m) => m.value === paymentMethod.value)?.label ??
    '線上信用卡';

  // 每個群組（賣家 / 場次）拆成獨立一筆訂單，收集訂單編號
  const orderNos: string[] = checkoutGroups.value.map((g) =>
    ordersStore.placeOrder({
      items: g.items.map((i) => ({
        name: i.name,
        image: i.image,
        spec: i.spec || '預設',
        price: effectiveUnitPrice(i),
        qty: i.qty,
      })),
      total: groupDisplayTotal(g),
      payment: method,
      delivery: shippingMethodLabel.value,
    }),
  );

  // 依目前選擇的配送方式抓取聯絡人 / 電話 / 完整地址（給付款成功頁顯示）
  const contact =
    shipMethod.value === 'home' ? selectedHome.value : selectedStore.value;
  const buyerName = contact?.name ?? '';
  const buyerPhone = contact?.phone ?? '';
  const deliveryAddress =
    shipMethod.value === 'home' && selectedHome.value
      ? selectedHome.value.address
      : shipMethod.value === 'store' && selectedStore.value
        ? `${selectedStore.value.chain} ${selectedStore.value.storeName}（${selectedStore.value.address}）`
        : '';

  ordersStore.setLastPaymentSummary({
    orderNos,
    buyerName,
    buyerPhone,
    paymentMethod: method,
    deliveryAddress,
  });

  cartStore.groups.forEach((g) => {
    g.items = g.items.filter((i) => !i.checked);
  });
  cartStore.groups = cartStore.groups.filter((g) => g.items.length > 0);
  ui.toast('付款成功');
  router.push('/payment-success');
};
</script>

<template>
  <div class="flex min-h-screen flex-col" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <!-- Page header -->
    <div>
      <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-5">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          class="!min-h-11 !min-w-11"
          @click="router.back()"
        />
        <h1 class="text-2xl font-bold text-slate-950">結帳</h1>
      </div>
    </div>

    <main
      class="mx-auto flex w-full max-w-7xl flex-1 flex-col px-[var(--page-pad-x)] pb-[120px] @7xl:px-0"
      style="gap: var(--stack-gap)"
    >
      <!-- 訂單明細（按購物車拆分，每台一張卡） -->
      <section
        v-for="group in checkoutGroups"
        :key="group.id"
        class="shadow-card rounded-xl bg-white"
      >
        <div class="cart-divider px-4 py-3">
          <span class="font-medium text-slate-700"
            >{{ group.sellerName }} 訂單明細</span
          >
        </div>
        <div
          v-for="(item, ii) in group.items"
          :key="item.id"
          :class="ii !== group.items.length - 1 ? 'cart-divider' : ''"
        >
          <div class="flex items-start gap-4 px-4 py-3">
            <div class="h-14 w-14 shrink-0 overflow-hidden rounded">
              <ProductImage :src="item.image" :alt="item.name" size="sm" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <p class="truncate text-base font-semibold text-slate-700">
                {{ item.name }}
              </p>
              <!-- 規格列：組合商品的規格寫在底下子品，這裡不重複顯示 -->
              <div
                v-if="!item.bundleItems && item.spec && item.spec !== '預設'"
                class="flex gap-4 text-sm text-slate-700"
              >
                <span class="shrink-0">規格</span>
                <span class="truncate">{{ item.spec }}</span>
              </div>
              <div class="flex gap-4 text-sm text-slate-700">
                <span>數量</span><span>{{ item.qty }}</span>
              </div>
              <!-- 買多優惠明細 -->
              <div
                v-if="hasBulkDiscount(item)"
                class="mt-0.5 flex items-center gap-1.5 text-xs text-green-700"
              >
                <i class="pi pi-tag text-[10px]" />
                <span>{{ item.bulkDiscount!.note }}</span>
                <span class="font-medium">
                  · 已折抵 -${{ bulkDiscountAmount(item).toLocaleString() }}
                </span>
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-0.5 text-right">
              <template v-if="discountedLineTotal(item) !== null">
                <Tag
                  :value="'已套用 ' + appliedCoupon?.amount"
                  severity="success"
                  class="!py-0.5 !text-xs"
                />
                <span class="text-sm text-slate-400 line-through">
                  ${{ lineTotal(item).toLocaleString() }}
                </span>
                <span
                  v-if="hasBulkDiscount(item)"
                  class="text-xs text-slate-500"
                >
                  買多優惠後 ${{ lineTotalAfterBulk(item).toLocaleString() }}
                </span>
                <span class="text-base font-bold" style="color: var(--primary)">
                  ${{ discountedLineTotal(item)?.toLocaleString() }}
                </span>
              </template>
              <template v-else-if="hasBulkDiscount(item)">
                <Tag
                  value="已套用買多優惠"
                  severity="success"
                  class="!py-0.5 !text-xs"
                />
                <span class="text-sm text-slate-400 line-through">
                  ${{ lineTotal(item).toLocaleString() }}
                </span>
                <span class="text-base font-bold" style="color: var(--primary)">
                  ${{ lineTotalAfterBulk(item).toLocaleString() }}
                </span>
              </template>
              <template v-else>
                <Tag
                  v-if="appliedCoupon && !couponAppliesTo(item.id)"
                  value="本券不適用"
                  severity="secondary"
                  class="!bg-slate-100 !py-0.5 !text-xs !text-slate-400"
                />
                <span class="font-medium text-slate-700">
                  ${{ lineTotal(item).toLocaleString() }}
                </span>
              </template>
            </div>
          </div>

          <!-- Bundle（不可收合，直接列出；左緣對齊「數量」label） -->
          <div v-if="item.bundleItems" class="pr-4 pb-4 pl-[88px]">
            <p class="text-sm leading-relaxed text-slate-700">
              <span class="font-medium">組合商品內容：</span
              >{{
                item.bundleItems
                  .map(
                    (s) =>
                      `${s.name}${s.spec && s.spec !== '預設' ? ` - ${s.spec}` : ''} ×${s.qty * item.qty}`,
                  )
                  .join('、')
              }}
            </p>
          </div>
        </div>

        <!-- 優惠券 / 紅利點數：inline 選單，狀態仍為結帳全域共用 -->
        <div
          class="cart-divider-top flex flex-col gap-3 px-4 py-3 @3xl:flex-row @3xl:items-center @3xl:justify-between"
        >
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-medium text-slate-700">優惠券</span>
            <Button
              :label="appliedCoupon ? appliedCoupon.title : '選擇優惠券'"
              :icon="appliedCoupon ? 'pi pi-check' : 'pi pi-tag'"
              severity="secondary"
              outlined
              size="small"
              @click="handleOpenCouponDrawer"
            />
            <span
              v-if="appliedCoupon && !manualCouponId"
              class="text-xs text-slate-400"
            >
              （自動套用最優惠）
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <span class="font-medium">紅利點數</span>
            <span>使用</span>
            <InputNumber
              v-model="rewardPoints"
              :min="0"
              show-buttons
              button-layout="horizontal"
              increment-button-icon="pi pi-plus"
              decrement-button-icon="pi pi-minus"
              class="qty-stepper"
            />
            <span>點</span>
            <span class="text-xs text-slate-500">
              / 尚有 <span style="color: var(--primary)">100</span> 點
            </span>
          </div>
        </div>

        <div
          class="cart-divider-top flex items-center justify-end gap-4 px-4 py-4"
        >
          <span class="text-sm text-slate-700"
            >訂單金額小計 ({{ group.items.length }}個商品)</span
          >
          <span class="text-2xl font-bold" style="color: var(--primary)"
            >${{ groupDisplayTotal(group).toLocaleString() }}</span
          >
        </div>
      </section>

      <!-- 配送資訊 -->
      <section class="shadow-card overflow-hidden rounded-xl bg-white">
        <div class="cart-divider px-4 py-3">
          <span class="font-medium text-slate-700">配送資訊</span>
        </div>
        <div class="card-pad flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-700">配送方式</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-700">{{
              shippingMethodLabel
            }}</span>
            <Button
              label="選擇運送方式"
              icon="pi pi-chevron-right"
              icon-pos="right"
              link
              size="small"
              @click="handleOpenShipDrawer"
            />
          </div>
          <div class="mt-1 text-sm text-slate-700">配送地址</div>
          <div
            v-if="shipMethod === 'home' && selectedHome"
            class="text-sm text-slate-700"
          >
            {{ selectedHome.name }} {{ selectedHome.phone }} 　
            {{ selectedHome.address }}
          </div>
          <div
            v-else-if="shipMethod === 'store' && selectedStore"
            class="text-sm text-slate-700"
          >
            {{ selectedStore.name }} {{ selectedStore.phone }} 　
            {{ selectedStore.chain }} {{ selectedStore.storeName }}（{{
              selectedStore.address
            }}）
          </div>
          <div v-else class="text-sm text-slate-500">尚未選擇配送地址</div>
        </div>
      </section>

      <!-- 發票資訊 -->
      <section class="shadow-card overflow-hidden rounded-xl bg-white">
        <div class="cart-divider px-4 py-3">
          <span class="font-medium text-slate-700">發票資訊</span>
        </div>
        <div class="card-pad flex max-w-[440px] flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm text-slate-700">發票載具</label>
            <Select
              v-model="invoiceCarrierType"
              :options="INVOICE_CARRIERS"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-slate-700">Email</label>
            <InputText v-model="invoiceEmail" type="email" class="w-full" />
          </div>
        </div>
      </section>

      <!-- 付款方式 -->
      <section class="shadow-card overflow-hidden rounded-xl bg-white">
        <div class="cart-divider px-4 py-3">
          <span class="font-medium text-slate-700">付款方式</span>
        </div>
        <div class="card-pad max-w-[440px]">
          <label class="mb-1 block text-sm text-slate-700">選擇付款方式</label>
          <Select
            v-model="paymentMethod"
            :options="availablePaymentMethods"
            option-label="label"
            option-value="value"
            class="w-full"
          />
          <p
            v-if="availablePaymentMethods.length < PAYMENT_METHODS.length"
            class="mt-2 text-xs text-slate-500"
          >
            <i class="pi pi-info-circle mr-1" />
            部分付款方式因您勾選的購物車不共同支援，已自動隱藏。
          </p>
        </div>
      </section>

      <!-- 金額明細 -->
      <section class="shadow-card overflow-hidden rounded-xl bg-white">
        <div
          class="card-pad grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2 text-sm"
        >
          <!-- 商品總金額 -->
          <div></div>
          <span class="text-slate-700">商品總金額</span>
          <span class="min-w-20 text-right text-slate-700"
            >$ {{ productTotal.toLocaleString() }}</span
          >

          <!-- 運費總金額 -->
          <div></div>
          <span class="text-slate-700">運費總金額</span>
          <span class="text-right text-slate-700"
            >$ {{ shippingTotal.toLocaleString() }}</span
          >

          <!-- 多件優惠折抵（動態：買多優惠加總） -->
          <template v-if="bulkDiscountTotal > 0">
            <div></div>
            <span class="text-slate-700">多件優惠折抵</span>
            <span class="text-right text-red-500"
              >- $ {{ bulkDiscountTotal.toLocaleString() }}</span
            >
          </template>

          <!-- 符合『滿千免運』提示 -->
          <!-- 手機：col-span-3 整列顯示在運費折抵上方 -->
          <div
            class="col-span-3 flex items-center justify-end gap-1 text-sm @3xl:hidden"
            style="color: var(--primary)"
          >
            <i class="pi pi-truck text-xs" />
            符合『滿千免運』
          </div>
          <!-- PC：與運費折抵同一行；放在 col 1 並 justify-self-end 靠右。
               用 invisible @3xl:visible 確保手機也佔 grid cell（讓欄位對齊上方） -->
          <div
            class="invisible flex items-center gap-1 justify-self-end text-sm @3xl:visible"
            style="color: var(--primary)"
          >
            <i class="pi pi-truck text-xs" />
            符合『滿千免運』
          </div>
          <span class="text-slate-700">運費折抵</span>
          <span class="text-right text-red-500"
            >- $ {{ Math.abs(SHIPPING_DISCOUNT).toLocaleString() }}</span
          >

          <!-- 已套用優惠券提示 -->
          <template v-if="appliedCoupon">
            <div
              class="col-span-3 flex items-center justify-end gap-1 text-sm @3xl:hidden"
              style="color: var(--primary)"
            >
              <i class="pi pi-ticket text-xs" />
              已套用『{{ appliedCoupon.title }}』
            </div>
            <div
              class="invisible flex items-center gap-1 justify-self-end text-sm @3xl:visible"
              style="color: var(--primary)"
            >
              <i class="pi pi-ticket text-xs" />
              已套用『{{ appliedCoupon.title }}』
            </div>
            <span class="text-slate-700">優惠券折扣</span>
            <span class="text-right text-red-500"
              >- $ {{ Math.abs(couponDiscount).toLocaleString() }}</span
            >
          </template>

          <!-- 紅利點數 -->
          <template v-if="rewardPointsNum > 0">
            <div></div>
            <span class="text-slate-700">紅利點數折抵</span>
            <span class="text-right text-red-500"
              >- $ {{ rewardPointsNum.toLocaleString() }}</span
            >
          </template>

          <!-- 總付款金額 -->
          <div></div>
          <span class="text-slate-700">總付款金額</span>
          <span class="text-right font-medium" style="color: var(--primary)"
            >$ {{ finalTotal.toLocaleString() }}</span
          >
        </div>
      </section>
    </main>

    <!-- Sticky footer -->
    <div
      class="sticky bottom-0 z-40 border-t border-b border-slate-200 bg-white"
    >
      <div
        class="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4 py-3"
        style="padding-bottom: max(12px, env(safe-area-inset-bottom))"
      >
        <div class="flex min-w-0 flex-col items-end leading-tight">
          <div class="flex min-w-0 items-baseline gap-2">
            <span class="text-sm text-slate-700 @3xl:text-lg">總付款金額</span>
            <span
              class="truncate text-2xl font-bold @3xl:text-3xl"
              style="color: var(--primary)"
              >${{ finalTotal.toLocaleString() }}</span
            >
          </div>
          <span class="text-sm text-red-500"
            >共省下 -${{ totalSaved.toLocaleString() }}</span
          >
        </div>
        <Button
          label="去付款"
          class="!min-h-12 shrink-0 !px-6 @3xl:!px-16"
          @click="handlePlaceOrder"
        />
      </div>
    </div>

    <!-- ============== Coupon QR Scanner ============== -->
    <Dialog
      v-model:visible="isCouponScannerVisible"
      modal
      :draggable="false"
      :breakpoints="{ '768px': 'calc(var(--frame-width, 100vw) - 32px)' }"
      :style="{ width: '360px' }"
      :pt="{
        mask: {
          style:
            'left: var(--frame-left, 0); width: var(--frame-width, 100vw); height: calc(100vh - var(--frame-bottom, 0px))',
        },
        header: { style: 'padding: 16px 20px' },
        content: { style: 'padding: 0 20px 16px' },
        footer: { style: 'padding: 12px 20px' },
      }"
    >
      <template #header>
        <span class="text-base font-bold text-slate-950">掃描優惠券 QR</span>
      </template>
      <div class="flex flex-col items-center gap-3">
        <!-- 模擬相機畫面 -->
        <div
          class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-900"
        >
          <!-- 角落 frame -->
          <span
            class="absolute top-3 left-3 h-8 w-8 rounded-tl border-t-2 border-l-2 border-white/80"
          ></span>
          <span
            class="absolute top-3 right-3 h-8 w-8 rounded-tr border-t-2 border-r-2 border-white/80"
          ></span>
          <span
            class="absolute bottom-3 left-3 h-8 w-8 rounded-bl border-b-2 border-l-2 border-white/80"
          ></span>
          <span
            class="absolute right-3 bottom-3 h-8 w-8 rounded-br border-r-2 border-b-2 border-white/80"
          ></span>
          <!-- 掃描中間線 -->
          <span
            class="absolute right-6 left-6 h-px bg-[var(--primary)] shadow-[0_0_12px_2px_var(--primary)]"
          ></span>
          <i class="pi pi-qrcode text-6xl text-white/40"></i>
        </div>
        <p class="text-center text-sm text-slate-500">
          將 QR 對準畫面中央，自動辨識後即填入優惠代碼。
        </p>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <Button
            label="取消"
            severity="secondary"
            outlined
            @click="isCouponScannerVisible = false"
          />
          <Button
            label="模擬掃描成功"
            icon="pi pi-check"
            @click="handleFakeScanResult"
          />
        </div>
      </template>
    </Dialog>

    <!-- ============== Coupon Drawer ============== -->
    <!-- Teleport 到 body：避開 App.vue 的 @container（會把 fixed 子節點變成
         以 frame 為 containing block），讓抽屜 / 遮罩用真正的 viewport 座標。 -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="isCouponDrawerVisible"
          class="drawer-backdrop"
          @click="isCouponDrawerVisible = false"
        />
      </Transition>
      <Transition name="drawer-slide">
        <div v-if="isCouponDrawerVisible" class="drawer-panel">
          <div class="mx-auto max-w-[680px] px-4 pt-5 pb-5">
            <!-- Header -->
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-bold text-slate-950">可使用優惠券</h3>
              <Button
                icon="pi pi-times"
                severity="secondary"
                text
                rounded
                class="!min-h-11 !min-w-11"
                @click="isCouponDrawerVisible = false"
              />
            </div>

            <!-- 手動輸入優惠碼 + 掃描 QR：手機版兩者同列，桌機加寬 -->
            <div class="mb-4 flex items-center gap-2">
              <InputGroup class="min-w-0 flex-1">
                <InputText
                  v-model="couponCode"
                  placeholder="輸入優惠券優惠代碼"
                  @keyup.enter="handleApplyCouponCode"
                />
                <Button
                  label="使用"
                  severity="secondary"
                  outlined
                  @click="handleApplyCouponCode"
                />
              </InputGroup>
              <Button
                icon="pi pi-qrcode"
                severity="secondary"
                outlined
                class="!min-h-11 shrink-0"
                aria-label="掃描優惠券 QR"
                @click="handleOpenCouponScanner"
              />
            </div>

            <!-- Coupon list -->
            <div class="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
              <label
                v-for="c in sortedCoupons"
                :key="c.id"
                class="flex rounded-[10px] border border-slate-200"
                :class="
                  !isCouponUsable(c)
                    ? 'cursor-not-allowed'
                    : 'cursor-pointer hover:border-[var(--primary)]'
                "
              >
                <!-- Amount block -->
                <div
                  class="flex w-[76px] shrink-0 items-center justify-center gap-1 rounded-l-[10px] px-2 py-3 @3xl:w-[140px] @3xl:gap-2 @3xl:px-3 @3xl:py-4"
                  :class="isCouponUsable(c) ? '' : 'bg-slate-100'"
                  :style="
                    isCouponUsable(c)
                      ? 'background: var(--primary-surface)'
                      : ''
                  "
                >
                  <i
                    class="pi pi-gift hidden text-xl @3xl:inline"
                    :class="isCouponUsable(c) ? '' : 'text-slate-400'"
                    :style="isCouponUsable(c) ? 'color: var(--primary)' : ''"
                  />
                  <span
                    class="text-lg font-bold @3xl:text-2xl"
                    :class="isCouponUsable(c) ? '' : 'text-slate-400'"
                    :style="isCouponUsable(c) ? 'color: var(--primary)' : ''"
                    >{{ c.amount }}</span
                  >
                </div>
                <!-- Detail block -->
                <div
                  class="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3 @3xl:px-4 @3xl:py-4"
                >
                  <span
                    v-if="!isCouponUsable(c)"
                    class="text-xs font-medium text-red-500 @3xl:hidden"
                    >{{ couponUnusableReason(c) }}</span
                  >
                  <p class="text-base font-medium text-slate-700">
                    {{ c.title }}
                  </p>
                  <p class="text-sm text-slate-600">{{ c.desc }}</p>
                  <span
                    class="self-start rounded bg-pink-100 px-2 py-0.5 text-xs break-words text-pink-700"
                    >{{ c.scope }}</span
                  >
                  <p class="mt-1 text-xs text-slate-500">{{ c.expiry }}</p>
                </div>
                <!-- Right side: radio / disabled note；手機版未達門檻則只在名稱上方顯示，這欄改用 hidden -->
                <div
                  class="flex w-[60px] shrink-0 items-center justify-center py-2 text-center @3xl:w-24"
                  :class="!isCouponUsable(c) ? 'hidden @3xl:flex' : ''"
                >
                  <span
                    v-if="!isCouponUsable(c)"
                    class="text-sm text-red-500"
                    >{{ couponUnusableReason(c) }}</span
                  >
                  <RadioButton
                    v-else
                    v-model="couponDrawerSelected"
                    :value="c.id"
                  />
                </div>
              </label>
            </div>

            <!-- Footer -->
            <div class="mt-4 flex justify-end gap-2">
              <Button
                label="取消"
                severity="secondary"
                outlined
                @click="isCouponDrawerVisible = false"
              />
              <Button label="確認" @click="handleConfirmCouponDrawer" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ============== Shipping Drawer ============== -->
    <Teleport to="body">
      <Transition name="drawer-fade">
        <div
          v-if="isShipDrawerVisible"
          class="drawer-backdrop"
          @click="isShipDrawerVisible = false"
        />
      </Transition>
      <Transition name="drawer-slide">
        <div v-if="isShipDrawerVisible" class="drawer-panel">
          <div class="mx-auto max-w-[680px] px-4 pt-5 pb-5">
            <!-- ===== View: list ===== -->
            <template v-if="shipDrawerView === 'list'">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-bold text-slate-950">選擇運送方式</h3>
                <Button
                  icon="pi pi-times"
                  severity="secondary"
                  text
                  rounded
                  class="!min-h-11 !min-w-11"
                  @click="isShipDrawerVisible = false"
                />
              </div>

              <div class="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
                <p
                  v-if="
                    supportedShippingMethods.length <
                    (['home', 'store'] as ShippingMethodId[]).length
                  "
                  class="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700"
                >
                  <i class="pi pi-info-circle mr-1" />
                  部分運送方式因您勾選的購物車不共同支援，已自動隱藏。
                </p>
                <!-- Home -->
                <div v-if="supportedShippingMethods.includes('home')">
                  <Button
                    severity="secondary"
                    class="!min-h-11 !w-full !justify-between"
                    :pt="{
                      root: {
                        class: '!bg-slate-100 !border-none !text-slate-700',
                      },
                    }"
                    @click="shipMethod = 'home'"
                  >
                    <span class="font-medium">宅配</span>
                    <span class="flex items-center gap-2">
                      $150
                      <i
                        v-if="shipMethod === 'home'"
                        class="pi pi-check text-green-600"
                      />
                    </span>
                  </Button>

                  <div
                    v-if="shipMethod === 'home'"
                    class="mt-3 flex flex-col gap-2"
                  >
                    <div
                      v-for="addr in homeAddresses"
                      :key="addr.id"
                      class="flex items-start gap-3 px-2 py-2"
                    >
                      <RadioButton
                        v-model="selectedHomeId"
                        :value="addr.id"
                        :disabled="addr.unavailable"
                        class="mt-1"
                      />
                      <div class="min-w-0 flex-1">
                        <div
                          class="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <span class="font-medium">{{ addr.name }}</span>
                          <span>{{ addr.phone }}</span>
                          <span
                            v-if="addr.isDefault"
                            class="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                            style="background: var(--primary)"
                            >預設</span
                          >
                        </div>
                        <div
                          class="mt-1 flex items-center gap-1 text-sm text-slate-700"
                        >
                          <i class="pi pi-map-marker text-xs" />
                          {{ addr.address }}
                          <span
                            v-if="addr.unavailable"
                            class="ml-1 text-red-500"
                            >(目前不提供配送至此地區)</span
                          >
                        </div>
                      </div>
                      <div class="flex shrink-0 items-center gap-2">
                        <Button
                          v-if="!addr.isDefault"
                          label="設為預設"
                          outlined
                          size="small"
                          @click="handleSetDefaultHome(addr.id)"
                        />
                        <Button
                          label="刪除"
                          severity="danger"
                          outlined
                          size="small"
                          @click="handleDeleteHome(addr.id)"
                        />
                      </div>
                    </div>
                    <Button
                      label="新增宅配地址"
                      icon="pi pi-plus"
                      severity="secondary"
                      outlined
                      class="!min-h-11 w-full"
                      @click="shipDrawerView = 'add-home'"
                    />
                  </div>
                </div>

                <!-- Store -->
                <div v-if="supportedShippingMethods.includes('store')">
                  <Button
                    severity="secondary"
                    class="!min-h-11 !w-full !justify-between"
                    :pt="{
                      root: {
                        class: '!bg-slate-100 !border-none !text-slate-700',
                      },
                    }"
                    @click="shipMethod = 'store'"
                  >
                    <span class="font-medium">超商配送</span>
                    <span class="flex items-center gap-2">
                      $60
                      <i
                        v-if="shipMethod === 'store'"
                        class="pi pi-check text-green-600"
                      />
                    </span>
                  </Button>

                  <div
                    v-if="shipMethod === 'store'"
                    class="mt-3 flex flex-col gap-2"
                  >
                    <div
                      v-for="addr in storeAddresses"
                      :key="addr.id"
                      class="flex items-start gap-3 px-2 py-2"
                    >
                      <RadioButton
                        v-model="selectedStoreId"
                        :value="addr.id"
                        class="mt-1"
                      />
                      <div class="min-w-0 flex-1">
                        <div
                          class="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <span class="font-medium">{{ addr.name }}</span>
                          <span>{{ addr.phone }}</span>
                          <span
                            v-if="addr.isDefault"
                            class="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                            style="background: var(--primary)"
                            >預設</span
                          >
                        </div>
                        <div
                          class="mt-1 flex items-center gap-2 text-sm text-slate-700"
                        >
                          <span
                            class="inline-flex h-6 w-9 items-center justify-center rounded text-xs font-bold text-white"
                            :style="
                              addr.chain === '7-11'
                                ? 'background: #ee1c25'
                                : 'background: #00a040'
                            "
                            >{{ addr.chain === '7-11' ? '7-11' : 'FAMI' }}</span
                          >
                          <span class="font-medium">{{ addr.storeName }}</span>
                        </div>
                        <div
                          class="mt-1 ml-11 flex items-center gap-1 text-sm text-slate-700"
                        >
                          <i class="pi pi-map-marker text-xs" />
                          {{ addr.address }}
                        </div>
                      </div>
                      <div class="flex shrink-0 items-center gap-2">
                        <Button
                          v-if="!addr.isDefault"
                          label="設為預設"
                          outlined
                          size="small"
                          @click="handleSetDefaultStore(addr.id)"
                        />
                        <Button
                          label="刪除"
                          severity="danger"
                          outlined
                          size="small"
                          @click="handleDeleteStore(addr.id)"
                        />
                      </div>
                    </div>
                    <Button
                      label="新增超商地址"
                      icon="pi pi-plus"
                      severity="secondary"
                      outlined
                      class="!min-h-11 w-full"
                      @click="shipDrawerView = 'add-store'"
                    />
                  </div>
                </div>
              </div>

              <div class="mt-4 flex justify-end gap-2">
                <Button
                  label="取消"
                  severity="secondary"
                  outlined
                  @click="isShipDrawerVisible = false"
                />
                <Button label="確認" @click="isShipDrawerVisible = false" />
              </div>
            </template>

            <!-- ===== View: add-home ===== -->
            <template v-else-if="shipDrawerView === 'add-home'">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-bold text-slate-950">新增宅配地址</h3>
                <Button
                  icon="pi pi-times"
                  severity="secondary"
                  text
                  rounded
                  class="!min-h-11 !min-w-11"
                  @click="shipDrawerView = 'list'"
                />
              </div>

              <div class="mx-auto flex max-w-[440px] flex-col gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-slate-700">收件人姓名</label>
                  <InputText v-model="newHomeName" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-slate-700">收件人電話</label>
                  <div class="flex gap-2">
                    <Select
                      v-model="newHomeCountryCode"
                      :options="DRAWER_COUNTRY_CODES"
                      class="w-[120px]"
                    />
                    <InputText
                      v-model="newHomePhone"
                      type="tel"
                      class="flex-1"
                    />
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-slate-700">國別</label>
                  <Select
                    v-model="newHomeCountry"
                    :options="DRAWER_COUNTRIES"
                    class="w-full"
                  />
                </div>
                <div
                  v-if="newHomeCountry === '台灣'"
                  class="flex flex-col gap-1"
                >
                  <label class="text-sm text-slate-700">城市/區</label>
                  <div class="flex gap-2">
                    <Select
                      v-model="newHomeCity"
                      :options="DRAWER_CITIES"
                      class="flex-1"
                    />
                    <Select
                      v-model="newHomeDistrict"
                      :options="DRAWER_DISTRICTS"
                      class="flex-1"
                    />
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-slate-700">詳細收件地址</label>
                  <InputText v-model="newHomeAddress" class="w-full" />
                </div>
              </div>

              <div class="mt-4 flex justify-end gap-2">
                <Button
                  label="取消"
                  severity="secondary"
                  outlined
                  @click="shipDrawerView = 'list'"
                />
                <Button label="確認新增" @click="handleSubmitAddHome" />
              </div>
            </template>

            <!-- ===== View: add-store ===== -->
            <template v-else-if="shipDrawerView === 'add-store'">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-bold text-slate-950">新增超商門市</h3>
                <Button
                  icon="pi pi-times"
                  severity="secondary"
                  text
                  rounded
                  class="!min-h-11 !min-w-11"
                  @click="shipDrawerView = 'list'"
                />
              </div>

              <div class="mx-auto flex max-w-[440px] flex-col gap-4">
                <div class="flex flex-col gap-2">
                  <label class="text-sm text-slate-700">選擇超商</label>
                  <div class="flex gap-3">
                    <button
                      class="flex h-12 w-16 items-center justify-center rounded-md border-2 text-xs font-bold text-white transition-all"
                      :style="
                        newStoreChain === '7-11'
                          ? 'border-color: var(--primary); background: #ee1c25'
                          : 'border-color: transparent; background: #ee1c25'
                      "
                      @click="handlePickChain('7-11')"
                    >
                      7-ELEVEN
                    </button>
                    <button
                      class="flex h-12 w-16 items-center justify-center rounded-md border-2 text-xs font-bold text-white transition-all"
                      :style="
                        newStoreChain === 'FamilyMart'
                          ? 'border-color: var(--primary); background: #00a040'
                          : 'border-color: transparent; background: #00a040'
                      "
                      @click="handlePickChain('FamilyMart')"
                    >
                      Family
                    </button>
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-slate-700">選擇取件門市</label>
                  <div v-if="!newStoreChain" class="font-bold text-slate-700">
                    請先選擇超商
                  </div>
                  <div v-else>
                    <p class="font-bold text-slate-700">
                      {{ pickedStoreName }}
                    </p>
                    <p class="text-sm text-slate-600">{{ pickedStoreAddr }}</p>
                  </div>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-slate-700">收件人姓名</label>
                  <InputText v-model="newStoreName" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-slate-700">收件人電話</label>
                  <div class="flex gap-2">
                    <Select
                      v-model="newHomeCountryCode"
                      :options="DRAWER_COUNTRY_CODES"
                      class="w-[120px]"
                    />
                    <InputText
                      v-model="newStorePhone"
                      type="tel"
                      class="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div class="mt-4 flex justify-end gap-2">
                <Button
                  label="取消"
                  severity="secondary"
                  outlined
                  @click="shipDrawerView = 'list'"
                />
                <Button label="確認新增" @click="handleSubmitAddStore" />
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.shadow-card {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.1);
}

.cart-divider,
.cart-divider-top {
  position: relative;
}
.cart-divider::after,
.cart-divider-top::before {
  content: '';
  position: absolute;
  left: var(--card-pad);
  right: var(--card-pad);
  height: 1px;
  background: #e2e8f0;
}
.cart-divider::after {
  bottom: 0;
}
.cart-divider-top::before {
  top: 0;
}

</style>

<!-- 抽屜相關樣式改為非 scoped：Teleport 到 body 的節點失去 scoped attribute 時
     backdrop / panel 會樣式失效，改用全域選擇器最穩。 -->
<style>
/* ===== Drawer =====
 * 抽屜以 frame 視覺座標定位（--frame-left / --frame-width / --frame-bottom 由 App.vue 設定），
 * 沒設時 fallback 到視窗座標。抽屜寬度直接等於 frame 寬度（= 視窗寬或模擬器寬），
 * 內容區再透過 max-w-[680px] mx-auto 自行置中，桌機才不會看起來太寬。
 * 抽屜為 position:fixed，脫離 @container 子樹，因此 RWD 用 @media，不用 Tailwind container query。
 */
.drawer-backdrop {
  position: fixed;
  top: 0;
  left: var(--frame-left, 0);
  width: var(--frame-width, 100vw);
  height: calc(100vh - var(--frame-bottom, 0px));
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
}
.drawer-panel {
  position: fixed;
  left: calc(var(--frame-left, 0px) + var(--frame-width, 100vw) / 2);
  bottom: var(--frame-bottom, 0px);
  transform: translateX(-50%);
  /* PC 版限寬 720px 貼合內容，不再吃滿整個 frame 寬 */
  width: min(720px, var(--frame-width, 100vw));
  max-width: 100vw;
  z-index: 110;
  background: white;
  border-radius: 16px 16px 0 0;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

/* 視窗縮到手機寬時，--frame-* 可能尚未就緒或值不準，
   強制抽屜貼在視窗底部（bottom: 0）、固定 390px（手機設計稿寬度），
   視窗更窄就跟著縮，避免水平 overflow。
   抽屜本體已 translateX(-50%) 置中，遮罩鋪滿不影響定位。 */
@media (max-width: 768px) {
  .drawer-backdrop {
    left: 0 !important;
    width: 100vw !important;
  }
  .drawer-panel {
    left: 50vw !important;
    bottom: 0 !important;
    width: min(390px, 100vw) !important;
  }
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translate(-50%, 100%);
}
</style>
