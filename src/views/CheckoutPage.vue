<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import StoreMapPicker from '../components/StoreMapPicker.vue';
import { useUiStore } from '../pinia/ui';
import {
  useCartStore,
  type CartItem,
  type CartTag,
  type ShippingMethodId,
  type PaymentMethodId,
} from '../pinia/cart';
import { useOrdersStore } from '../pinia/orders';
import { useAuthStore } from '../pinia/auth';
import { useAddressStore, type Address, type CvsChain } from '../pinia/address';
import { useCountdown } from '../composables/useCountdown';

type TempLayer = '常溫' | '冷藏' | '冷凍';

interface CheckoutGroup {
  id: number;
  sellerName: string;
  tempLayer: TempLayer;
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
  // 由輸入優惠碼 / QR 掃描兌換而來 → 列表置頂，方便使用者辨識
  redeemed?: boolean;
}
interface HomeAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
  unavailable?: boolean;
}

type ShipDrawerView = 'list' | 'add-home' | 'add-store';

const INVOICE_TYPES = [
  { label: '個人發票（紙本）', value: 'personal-paper' },
  { label: '公司統編', value: 'company' },
  { label: '捐贈', value: 'donate' },
  { label: '手機條碼', value: 'mobile' },
  { label: '自然人憑證', value: 'natural' },
  { label: '會員載具', value: 'member' },
];
/** 捐贈單位清單（可下拉選，也可自行輸入其他）。 */
const DONATE_ORGS = [
  '財團法人喜憨兒社會福利基金會',
  '財團法人流浪動物之家基金會',
  '財團法人伊甸社會福利基金會',
  '臺灣基督教門諾會醫療財團法人門諾醫院',
  '財團法人創世社會福利基金會',
  '社團法人台灣之心愛護動物協會',
  '基督徒救世會社會福利事業基金會',
  '財團法人雅文兒童聽語文教基金會',
  '財團法人天使心家族社會福利基金會',
  '財團法人勵馨社會福利事業基金會',
  '財團法人陽光社會福利基金會',
  '財團法人愛盲基金會',
];
const PAYMENT_METHODS: { label: string; value: PaymentMethodId }[] = [
  { label: '線上信用卡（藍新）', value: 'credit' },
  { label: '線上信用卡（數位鑑）', value: 'credit-digital' },
  { label: 'Apple Pay', value: 'apple-pay' },
  { label: 'ATM 繳費帳號', value: 'atm' },
  { label: '超商代碼繳費', value: 'cvs-code' },
  { label: '轉帳匯款', value: 'transfer' },
  { label: 'LINE Pay', value: 'line-pay' },
  { label: 'iPASS MONEY', value: 'ipass' },
  { label: '貨到付款', value: 'cod' },
  { label: '自取', value: 'self-pickup' },
];
const BANK_TRANSFER_INFO = ['銀行：台新008', '分行：13456-111333'];
const DRAWER_COUNTRY_CODES = ['+886', '+852'];
const DRAWER_COUNTRIES = ['台灣', '香港'];
const DRAWER_CITIES = ['高雄市', '台北市', '桃園市'];
const DRAWER_DISTRICTS = ['前鎮區', '三民區', '信義區'];

// 收據式明細的網格版型（僅版面結構）：手機三欄（標籤｜操作｜金額）、
// @3xl 四欄插入說明欄；操作欄固定 132px 讓按鈕 / stepper 左右對齊。
// 視覺一律沿用專案標準元件樣式，不另外覆蓋尺寸與字級。
const RECEIPT_ROW_CLASS =
  'grid min-h-9 grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1 @3xl:grid-cols-[104px_132px_minmax(0,1fr)_auto]';
const RECEIPT_BUTTON_CLASS = 'w-[132px]';
const RECEIPT_HINT_CLASS =
  'col-span-2 col-start-2 row-start-2 flex min-w-0 items-center gap-2 @3xl:col-span-1 @3xl:col-start-3 @3xl:row-start-1';
const RECEIPT_AMOUNT_CLASS =
  'col-start-3 row-start-1 justify-self-end text-sm @3xl:col-start-4';

/** 各訂單商品金額（扣買多優惠後）滿此門檻免運 — 逐筆訂單判定。 */
const FREE_SHIPPING_MIN = 1000;
// 使用者的紅利點數總餘額（原型固定）；每組獨立使用、跨組合計不能超過此值
const TOTAL_REWARD_BALANCE = 500;

const SHIPPING_METHOD_LABELS: Record<ShippingMethodId, string> = {
  home: '宅配',
  pickup: '自取',
  store: '超商取貨',
  post: '郵局宅配',
};
/** 運送方式在選單中的固定順序。 */
const SHIPPING_METHOD_ORDER: ShippingMethodId[] = [
  'home',
  'pickup',
  'store',
  'post',
];
/** 宅配運費：依訂單溫層計價。 */
const HOME_FEES: Record<TempLayer, number> = { 冷凍: 150, 冷藏: 150, 常溫: 80 };
/** 郵局宅配運費：依訂單溫層計價。 */
const POST_FEES: Record<TempLayer, number> = { 冷凍: 100, 冷藏: 100, 常溫: 70 };
/** 超商取貨運費：依鏈別 × 溫層。門市身分由會員預設門市決定，這裡只管費率。 */
const CVS_FEES: Record<CvsChain, Record<TempLayer, number>> = {
  '7-11': { 常溫: 60, 冷藏: 120, 冷凍: 120 },
  FamilyMart: { 常溫: 60, 冷藏: 110, 冷凍: 110 },
};
const PICKUP_LOCATIONS = [
  {
    id: 'p1',
    name: '台北門市',
    address: '台北市信義區忠孝東路五段 100 號',
    hours: '11:00–21:00',
  },
  {
    id: 'p2',
    name: '板橋門市',
    address: '新北市板橋區文化路一段 25 號',
    hours: '12:00–21:00',
  },
];

// Demo 用：優惠代碼 → 對應的優惠券範本。實際會由後端驗證。
const CODE_TO_COUPON: Record<string, Omit<Coupon, 'id'>> = {
  SAVE50: {
    amount: '折50',
    title: '會員專屬折50券',
    desc: '訂單直接折抵 $50',
    scope: '適用範圍：全站',
    expiry: '有效期限至 2026.02.28 23:00',
  },
  EARLY30: {
    amount: '30%',
    title: '早鳥七折券',
    desc: '訂單打 7 折（滿 $500 使用）',
    scope: '適用範圍：全站',
    expiry: '有效期限至 2026.02.28 23:00',
    minSpend: 500,
  },
};

const router = useRouter();
const ui = useUiStore();
const cartStore = useCartStore();
const ordersStore = useOrdersStore();
const authStore = useAuthStore();

// 手機未綁定 → 按「去付款」時擋下，跳綁定 Dialog 走 inline 綁定流程（不離開結帳頁）
const BIND_CODE_LENGTH = 6;
const BIND_RESEND_COOLDOWN_SEC = 60;
const isBindPhoneDialogVisible = ref(false);
const bindPhoneCode = ref('+886');
const bindPhone = ref('');
const bindVerifyCode = ref('');
const hasSentBindCode = ref(false);
const {
  remaining: bindCountdown,
  start: startBindCountdown,
  reset: resetBindCountdown,
} = useCountdown();
const canSendBindCode = computed(
  () => !!bindPhone.value.trim() && bindCountdown.value === 0,
);
const canCompleteBind = computed(
  () =>
    hasSentBindCode.value && bindVerifyCode.value.length === BIND_CODE_LENGTH,
);
const openBindPhoneDialog = () => {
  bindPhoneCode.value = authStore.phoneCode || '+886';
  bindPhone.value = authStore.phone;
  bindVerifyCode.value = '';
  hasSentBindCode.value = false;
  resetBindCountdown();
  isBindPhoneDialogVisible.value = true;
};
const handleSendBindCode = () => {
  if (!canSendBindCode.value) return;
  hasSentBindCode.value = true;
  startBindCountdown(BIND_RESEND_COOLDOWN_SEC);
  ui.toast('驗證碼已發送（示意）');
};
const handleCompleteBind = () => {
  if (!canCompleteBind.value) return;
  authStore.setPhone(bindPhoneCode.value, bindPhone.value);
  isBindPhoneDialogVisible.value = false;
  ui.toast('手機號碼驗證完成');
  // 綁完後直接繼續走結帳流程（此時 hasPhoneBound 已 true，不會再被攔）
  handlePlaceOrder();
};
// 手機號碼改動 → 之前送的驗證碼作廢，回到未發送狀態
watch([bindPhoneCode, bindPhone], () => {
  if (!hasSentBindCode.value) return;
  hasSentBindCode.value = false;
  bindVerifyCode.value = '';
  resetBindCountdown();
});

const TEMP_LABELS: TempLayer[] = ['常溫', '冷藏', '冷凍'];
const tempOfTags = (tags: CartTag[]): TempLayer =>
  (tags.find((t) => TEMP_LABELS.includes(t.label as TempLayer))
    ?.label as TempLayer) ?? '常溫';

/** 依購物車拆組的商品明細；每組只保留有勾選的商品（結帳頁只讀，不可改動）。 */
const checkoutGroups = computed<CheckoutGroup[]>(() =>
  cartStore.groups
    .map((g) => ({
      id: g.id,
      sellerName: g.sellerName,
      tempLayer: tempOfTags(g.tags),
      items: g.items.filter((i) => i.checked),
      shippingMethods: g.shippingMethods,
      paymentMethods: g.paymentMethods,
    }))
    .filter((g) => g.items.length > 0),
);

/** 各購物車支援的運送方式取交集 → 合併結帳可用的運送方式（固定順序）。 */
const supportedShippingMethods = computed<ShippingMethodId[]>(() => {
  const groups = checkoutGroups.value;
  if (groups.length === 0) return [];
  return SHIPPING_METHOD_ORDER.filter((m) =>
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

/** 原始總計（單價 × 數量），不含任何優惠。 */
const lineTotal = (item: CartItem) => item.price * item.qty;
/** 買多優惠後總計（不含優惠券）。 */
const lineTotalAfterBulk = (item: CartItem) =>
  effectiveUnitPrice(item) * item.qty;

/** 該組商品金額（未套用任何優惠）。 */
const groupGoodsTotal = (g: CheckoutGroup): number =>
  g.items.reduce((s, i) => s + lineTotal(i), 0);
/** 該組買多優惠折抵總額。 */
const groupBulkDiscount = (g: CheckoutGroup): number =>
  g.items.reduce((s, i) => s + bulkDiscountAmount(i), 0);
/** 該組商品金額（扣買多優惠後）— 免運門檻、優惠券門檻皆以此為基底。 */
const groupAfterBulk = (g: CheckoutGroup): number =>
  groupGoodsTotal(g) - groupBulkDiscount(g);

onMounted(() => {
  if (allItems.value.length === 0) router.replace('/cart');
});

// ---- 配送方式（各訂單各自選；頂部「套用全部」入口可一次帶全部）--------------
/** 各訂單各自的運送方式；未選 = null。key 為 group.id。 */
const shipMethodByGroup = ref<Record<number, ShippingMethodId | null>>({});
/** 讀某訂單目前選的運送方式。 */
const groupShipMethod = (g: CheckoutGroup): ShippingMethodId | null =>
  shipMethodByGroup.value[g.id] ?? null;
/** 單一訂單支援的運送方式（固定順序）。 */
const groupSupportedMethods = (g: CheckoutGroup): ShippingMethodId[] =>
  SHIPPING_METHOD_ORDER.filter((m) => g.shippingMethods.includes(m));
/** 所有訂單是否都選同一種方式；是 → 該方式，否（含未全選）→ null。 */
const sharedShipMethod = computed<ShippingMethodId | null>(() => {
  const groups = checkoutGroups.value;
  if (groups.length === 0) return null;
  const first = groupShipMethod(groups[0]);
  return first && groups.every((g) => groupShipMethod(g) === first)
    ? first
    : null;
});
/** 是否至少有一筆訂單已選運送方式（底部運費列顯示與否）。 */
const hasAnyShipMethod = computed(() =>
  checkoutGroups.value.some((g) => groupShipMethod(g) !== null),
);
const selectedPickupId = ref(PICKUP_LOCATIONS[0].id);

// 自取聯絡人（與自取門市同為全域單一）；可勾「同訂購人」直接帶入會員資料 + 電話
const pickupContactName = ref('');
const pickupContactPhoneCode = ref('+886');
const pickupContactPhone = ref('');
const isPickupSameAsOrderer = ref(false);
/** 把訂購人（會員）資料 + 電話帶進自取聯絡人。 */
const fillPickupContactFromOrderer = () => {
  pickupContactName.value = authStore.displayName;
  pickupContactPhoneCode.value = authStore.phoneCode || '+886';
  pickupContactPhone.value = authStore.phone;
};
// 勾「同訂購人」→ 立即帶入；會員資料 / 電話之後才補（如去付款時完成驗證）也同步回填
watch(isPickupSameAsOrderer, (same) => {
  if (same) fillPickupContactFromOrderer();
});
watch(
  () => [authStore.displayName, authStore.phoneCode, authStore.phone],
  () => {
    if (isPickupSameAsOrderer.value) fillPickupContactFromOrderer();
  },
);
/** 是否至少有一筆訂單選了自取（決定要不要驗自取聯絡人）。 */
const hasPickupOrder = computed(() =>
  checkoutGroups.value.some((g) => groupShipMethod(g) === 'pickup'),
);

const addressStore = useAddressStore();
/** 會員的超商門市清單（封裝 store，供 template 用）。 */
const cvsStoreList = computed(() => addressStore.storeAddrs);
/** 超商取貨：各訂單選的門市 id（會員 storeAddr.id）；每組獨立。 */
const cvsStoreByGroup = ref<Record<number, string>>({});
/** 超商 logo（放在 public/member-icons，透過 base path 取用）。 */
const CVS_LOGOS: Record<CvsChain, string> = {
  '7-11': `${import.meta.env.BASE_URL}member-icons/seven.svg`,
  FamilyMart: `${import.meta.env.BASE_URL}member-icons/family.svg`,
};
/** 該組已選門市 + 依溫層算出的運費；未選 / 門市無鏈別 → null。 */
const cvsPickOf = (g: CheckoutGroup): { store: Address; fee: number } | null => {
  const storeId = cvsStoreByGroup.value[g.id];
  if (storeId == null) return null;
  const store = cvsStoreList.value.find((s) => s.id === storeId);
  if (!store?.chain) return null;
  return { store, fee: CVS_FEES[store.chain][g.tempLayer] };
};
const handlePickCvsStore = (g: CheckoutGroup, storeId: string) => {
  cvsStoreByGroup.value = { ...cvsStoreByGroup.value, [g.id]: storeId };
};
// 每組超商門市預帶會員預設門市（冷凍 / 常溫都帶同一個，運費各自依溫層查表）；
// 已選的保留、消失的組移除。
watch(
  checkoutGroups,
  (groups) => {
    const dsId = addressStore.defaultStoreAddr?.id;
    const next: Record<number, string> = {};
    for (const g of groups) {
      const existing = cvsStoreByGroup.value[g.id];
      if (existing != null) next[g.id] = existing;
      else if (dsId) next[g.id] = dsId;
    }
    cvsStoreByGroup.value = next;
  },
  { immediate: true },
);

const selectedPickup = computed(
  () =>
    PICKUP_LOCATIONS.find((p) => p.id === selectedPickupId.value) ??
    PICKUP_LOCATIONS[0],
);

/** 該組運費；null = 尚未能計算（未選方式，或超商未選門市）。 */
const groupShippingFee = (g: CheckoutGroup): number | null => {
  switch (groupShipMethod(g)) {
    case 'home':
      return HOME_FEES[g.tempLayer];
    case 'post':
      return POST_FEES[g.tempLayer];
    case 'pickup':
      return 0;
    case 'store':
      return cvsPickOf(g)?.fee ?? null;
    default:
      return null;
  }
};
/** 該組是否達免運門檻（逐筆訂單判定）。 */
const isGroupFreeShipping = (g: CheckoutGroup): boolean =>
  groupAfterBulk(g) >= FREE_SHIPPING_MIN;
/** 該組運費折抵（達免運門檻 → 折抵全額運費）。 */
const groupShippingDiscount = (g: CheckoutGroup): number => {
  const fee = groupShippingFee(g);
  return fee !== null && fee > 0 && isGroupFreeShipping(g) ? fee : 0;
};
/** 該組是否有實際運費（有運費才顯示運費折抵列，達/未達門檻都顯示）。 */
const groupHasShippingFee = (g: CheckoutGroup): boolean => {
  const fee = groupShippingFee(g);
  return fee !== null && fee > 0;
};
/** 明細列的運送標籤，例如「冷凍宅配」「自取 · 台北門市」。 */
const groupShippingLabel = (g: CheckoutGroup): string => {
  switch (groupShipMethod(g)) {
    case 'home':
      return `${g.tempLayer}宅配`;
    case 'post':
      return `${g.tempLayer}郵局宅配`;
    case 'pickup':
      return `自取 · ${selectedPickup.value.name}`;
    case 'store': {
      const pick = cvsPickOf(g);
      return pick
        ? `${g.tempLayer}超商取貨 · ${pick.store.storeName}`
        : `${g.tempLayer}超商取貨（尚未選門市）`;
    }
    default:
      return '';
  }
};

/** 運送方式選單 header 顯示的「$X 起」；依抽屜範圍（單一訂單 / 全部）估算。 */
/** 頂部摘要用：不帶溫層的方式標籤；超商直接顯示「7-11 XX門市」。 */
const groupShipSummaryLabel = (g: CheckoutGroup): string => {
  const m = groupShipMethod(g);
  switch (m) {
    case 'home':
    case 'post':
      return SHIPPING_METHOD_LABELS[m];
    case 'pickup':
      return `自取 · ${selectedPickup.value.name}`;
    case 'store': {
      const pick = cvsPickOf(g);
      return pick
        ? `${pick.store.chain ?? ''} ${pick.store.storeName}`.trim()
        : '超商取貨（尚未選門市）';
    }
    default:
      return '';
  }
};
/** 頂部摘要用：某訂單已選方式的地址 / 門市明細（label 之外的補充行）。 */
const groupShipDetail = (g: CheckoutGroup): string => {
  const m = groupShipMethod(g);
  if (m === 'home' || m === 'post') {
    return selectedHome.value
      ? `${selectedHome.value.name} ${selectedHome.value.phone} ${selectedHome.value.address}`
      : '尚未選擇配送地址';
  }
  if (m === 'pickup') {
    return `${selectedPickup.value.address} · ${selectedPickup.value.hours}`;
  }
  if (m === 'store') {
    const pick = cvsPickOf(g);
    return pick
      ? `${pick.store.name} ${pick.store.phone} ${pick.store.address}`
      : '';
  }
  return '';
};

/** 某訂單依已選運送方式的收件人（姓名 + 電話）；未選 / 無資料 → null。 */
const groupRecipient = (
  g: CheckoutGroup,
): { name: string; phone: string } | null => {
  const m = groupShipMethod(g);
  if (m === 'home' || m === 'post') {
    return selectedHome.value
      ? { name: selectedHome.value.name, phone: selectedHome.value.phone }
      : null;
  }
  if (m === 'pickup') {
    if (!pickupContactName.value.trim() && !pickupContactPhone.value.trim())
      return null;
    return {
      name: pickupContactName.value,
      phone: `${pickupContactPhoneCode.value} ${pickupContactPhone.value}`.trim(),
    };
  }
  if (m === 'store') {
    const pick = cvsPickOf(g);
    return pick ? { name: pick.store.name, phone: pick.store.phone } : null;
  }
  return null;
};

const shippingMethodFeeHint = (
  m: ShippingMethodId,
  groups: CheckoutGroup[],
): string => {
  if (m === 'pickup') return '$0';
  const fees = groups.map((g) => {
    if (m === 'home') return HOME_FEES[g.tempLayer];
    if (m === 'post') return POST_FEES[g.tempLayer];
    return Math.min(...Object.values(CVS_FEES).map((f) => f[g.tempLayer]));
  });
  return fees.length ? `$${Math.min(...fees)} 起` : '';
};

// ---- 宅配 / 郵局宅配共用的收件地址 ------------------------------------------
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
const selectedHomeId = ref<string | null>('h1');
const selectedHome = computed(() =>
  homeAddresses.value.find((a) => a.id === selectedHomeId.value),
);

const handleSetDefaultHome = (id: string) => {
  homeAddresses.value.forEach((a) => {
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

// ---- 新增超商門市（推進共用 address store，會員中心同步）---------------------
const newStoreChain = ref<CvsChain>('7-11');
const newStoreShopName = ref('');
const newStoreAddress = ref('');
const newStoreName = ref('王小明');
const newStoreCountryCode = ref('+886');
const newStorePhone = ref('');
const resetAddStoreForm = () => {
  newStoreShopName.value = '';
  newStoreAddress.value = '';
  newStorePhone.value = '';
};
// 超商電子地圖選門市
const isStoreMapVisible = ref(false);
const handleOpenStoreMap = (chain: CvsChain) => {
  newStoreChain.value = chain;
  isStoreMapVisible.value = true;
};
const handleSelectStore = (store: {
  chain: CvsChain;
  storeName: string;
  address: string;
}) => {
  newStoreChain.value = store.chain;
  newStoreShopName.value = store.storeName;
  newStoreAddress.value = store.address;
};
const handleSubmitAddStore = () => {
  if (
    !newStoreShopName.value.trim() ||
    !newStoreName.value.trim() ||
    !newStorePhone.value.trim()
  )
    return;
  addressStore.storeAddrs.push({
    id: 's_' + Date.now(),
    name: newStoreName.value,
    phone: `${newStoreCountryCode.value} ${newStorePhone.value || '000****00'}`,
    address: newStoreAddress.value,
    isDefault: false,
    chain: newStoreChain.value,
    storeName: newStoreShopName.value,
  });
  resetAddStoreForm();
  shipDrawerView.value = 'list';
};

// ---- 運送方式抽屜 -----------------------------------------------------------
const isShipDrawerVisible = ref(false);
const shipDrawerView = ref<ShipDrawerView>('list');
/** 抽屜開啟來源訂單 id：從個別訂單開 → 只顯示該訂單的超商；null（共用入口）→ 全部訂單。 */
const shipDrawerGroupId = ref<number | null>(null);
const handleOpenShipDrawer = (groupId: number | null = null) => {
  shipDrawerGroupId.value = groupId;
  shipDrawerView.value = 'list';
  isShipDrawerVisible.value = true;
};
/** 抽屜作用範圍的訂單：帶 groupId → 只該訂單；否則全部（套用全部）。 */
const drawerGroups = computed(() =>
  shipDrawerGroupId.value != null
    ? checkoutGroups.value.filter((g) => g.id === shipDrawerGroupId.value)
    : checkoutGroups.value,
);
/** 抽屜可選的運送方式：個別訂單 → 該訂單支援的；套用全部 → 各車交集。 */
const drawerMethods = computed<ShippingMethodId[]>(() => {
  if (shipDrawerGroupId.value == null) return supportedShippingMethods.value;
  const g = checkoutGroups.value.find((x) => x.id === shipDrawerGroupId.value);
  return g ? groupSupportedMethods(g) : [];
});
/** 抽屜目前反白的方式：個別訂單 → 該訂單的方式；套用全部 → 共同方式。 */
const drawerSelectedMethod = computed<ShippingMethodId | null>(() =>
  shipDrawerGroupId.value != null
    ? (shipMethodByGroup.value[shipDrawerGroupId.value] ?? null)
    : sharedShipMethod.value,
);
/** 在抽屜選方式：個別 → 只設該訂單；套用全部 → 一次帶所有訂單。 */
const handleSelectShipMethod = (m: ShippingMethodId): void => {
  if (shipDrawerGroupId.value != null) {
    shipMethodByGroup.value = {
      ...shipMethodByGroup.value,
      [shipDrawerGroupId.value]: m,
    };
    return;
  }
  const next = { ...shipMethodByGroup.value };
  for (const g of checkoutGroups.value) next[g.id] = m;
  shipMethodByGroup.value = next;
};

// 逐訂單初始化 / 清理運送方式：
// - 該組只支援一種方式 → 自動鎖定（沒選擇餘地）
// - 已選方式仍被支援 → 保留；否則（含移除的組）→ 清空
watch(
  checkoutGroups,
  (groups) => {
    const next: Record<number, ShippingMethodId | null> = {};
    for (const g of groups) {
      const supported = groupSupportedMethods(g);
      const current = shipMethodByGroup.value[g.id] ?? null;
      if (supported.length === 1) next[g.id] = supported[0];
      else next[g.id] = current && supported.includes(current) ? current : null;
    }
    shipMethodByGroup.value = next;
  },
  { immediate: true },
);

// ---- 優惠券（各訂單獨立選用）------------------------------------------------
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
/** 各訂單套用的優惠券 id；未選 = 無紀錄。 */
const couponByGroup = ref<Record<number, string | null>>({});
const appliedCouponOf = (g: CheckoutGroup): Coupon | null =>
  coupons.value.find((c) => c.id === couponByGroup.value[g.id]) ?? null;

/** 同一張券只能用在一筆訂單上。 */
const isCouponUsedByOtherGroup = (g: CheckoutGroup, c: Coupon): boolean =>
  Object.entries(couponByGroup.value).some(
    ([gid, cid]) => Number(gid) !== g.id && cid === c.id,
  );
const isCouponUsableFor = (g: CheckoutGroup, c: Coupon): boolean => {
  if (c.disabled) return false;
  if (isCouponUsedByOtherGroup(g, c)) return false;
  if (
    c.applicableItemIds &&
    !g.items.some((i) => c.applicableItemIds!.includes(i.id))
  )
    return false;
  return groupAfterBulk(g) >= (c.minSpend ?? 0);
};
const couponUnusableReasonFor = (g: CheckoutGroup, c: Coupon): string => {
  if (c.disabled) return c.disabledReason ?? '不可使用';
  if (isCouponUsedByOtherGroup(g, c)) return '已用於其他訂單';
  if (
    c.applicableItemIds &&
    !g.items.some((i) => c.applicableItemIds!.includes(i.id))
  )
    return '本訂單無適用商品';
  if (c.minSpend && groupAfterBulk(g) < c.minSpend) return '金額未達門檻';
  return '';
};
/** 該券套在該訂單上的折抵金額（以買多優惠後金額為基底）。 */
const discountOfFor = (g: CheckoutGroup, c: Coupon): number => {
  if (!isCouponUsableFor(g, c) && couponByGroup.value[g.id] !== c.id) return 0;
  if (c.applicableItemIds) {
    const target = g.items.find((i) => c.applicableItemIds!.includes(i.id));
    if (!target) return 0;
    const line = lineTotalAfterBulk(target);
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
    return Math.round((groupAfterBulk(g) * (100 - Number(pct[1]))) / 100);
  return 0;
};
const groupCouponDiscount = (g: CheckoutGroup): number => {
  const c = appliedCouponOf(g);
  return c ? discountOfFor(g, c) : 0;
};
const couponAppliesTo = (g: CheckoutGroup, itemId: string) => {
  const c = appliedCouponOf(g);
  if (!c || !c.applicableItemIds) return true;
  return c.applicableItemIds.includes(itemId);
};
/** 套用優惠券後的單品總計；沒吃到本券的商品回傳 null。 */
const discountedLineTotal = (
  g: CheckoutGroup,
  item: CartItem,
): number | null => {
  const c = appliedCouponOf(g);
  if (!c || !c.applicableItemIds || !c.applicableItemIds.includes(item.id))
    return null;
  return Math.max(0, lineTotalAfterBulk(item) - discountOfFor(g, c));
};

// --- Coupon drawer（依訂單開啟） ---
const couponCode = ref('');
const isCouponDrawerVisible = ref(false);
const couponDrawerGroupId = ref<number | null>(null);
const couponDrawerSelected = ref<string | null>(null);
const couponDrawerGroup = computed(
  () =>
    checkoutGroups.value.find((g) => g.id === couponDrawerGroupId.value) ??
    null,
);
const drawerSortedCoupons = computed(() => {
  const g = couponDrawerGroup.value;
  if (!g) return [];
  return [...coupons.value].sort((a, b) => {
    // 兌換來的券永遠置頂，讓使用者確認剛加入的是哪一張
    if (!!a.redeemed !== !!b.redeemed) return a.redeemed ? -1 : 1;
    const ua = isCouponUsableFor(g, a),
      ub = isCouponUsableFor(g, b);
    if (ua !== ub) return ua ? -1 : 1;
    return discountOfFor(g, b) - discountOfFor(g, a);
  });
});

const handleOpenCouponDrawer = (g: CheckoutGroup) => {
  couponDrawerGroupId.value = g.id;
  couponDrawerSelected.value = couponByGroup.value[g.id] ?? null;
  isCouponDrawerVisible.value = true;
};
const handleConfirmCouponDrawer = () => {
  if (couponDrawerGroupId.value !== null) {
    couponByGroup.value = {
      ...couponByGroup.value,
      [couponDrawerGroupId.value]: couponDrawerSelected.value,
    };
  }
  isCouponDrawerVisible.value = false;
  ui.toast('已套用選擇的優惠券');
};
// 兌換 code → 加入清單置頂並自動選中，但不套用；需按「確定」才生效
const handleApplyCouponCode = () => {
  const code = couponCode.value.trim().toUpperCase();
  if (!code) return;

  const existingId = `redeem-${code}`;
  if (coupons.value.some((c) => c.id === existingId)) {
    couponDrawerSelected.value = existingId;
    couponCode.value = '';
    ui.toast('此優惠券已在清單中，已為您選取');
    return;
  }

  const template = CODE_TO_COUPON[code];
  if (!template) {
    ui.toast('查無此優惠碼');
    return;
  }

  coupons.value.unshift({ ...template, id: existingId, redeemed: true });
  couponDrawerSelected.value = existingId;
  couponCode.value = '';
  ui.toast('已兌換優惠券，請按「確定」套用');
};

const isCouponScannerVisible = ref(false);
const handleOpenCouponScanner = () => {
  isCouponScannerVisible.value = true;
};
const handleFakeScanResult = () => {
  couponCode.value = 'SAVE50';
  isCouponScannerVisible.value = false;
  handleApplyCouponCode();
};

// 掃描 QR：開啟彈窗時跳出實體相機（後鏡頭），關閉時釋放相機。
const scannerVideoRef = ref<HTMLVideoElement | null>(null);
const cameraError = ref<string | null>(null);
let cameraStream: MediaStream | null = null;

const startCamera = async () => {
  cameraError.value = null;
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = '此裝置 / 瀏覽器不支援相機掃描';
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
    await nextTick();
    if (scannerVideoRef.value) {
      scannerVideoRef.value.srcObject = cameraStream;
      await scannerVideoRef.value.play().catch(() => {});
    }
  } catch {
    // 使用者拒絕授權 / 無可用相機
    cameraError.value = '無法開啟相機，請確認已授權相機權限';
  }
};

const stopCamera = () => {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  if (scannerVideoRef.value) scannerVideoRef.value.srcObject = null;
};

watch(isCouponScannerVisible, (isOpen) => {
  if (isOpen) void startCamera();
  else stopCamera();
});
onBeforeUnmount(stopCamera);

// ---- 紅利點數（每組獨立；跨組合計不能超過餘額）------------------------------
const rewardPointsByGroup = ref<Record<number, number>>({});
// checkoutGroups 變動時同步鍵：新組補 0、消失組移除、舊值保留
watch(
  checkoutGroups,
  (groups) => {
    const next: Record<number, number> = {};
    for (const g of groups) {
      next[g.id] = Math.max(
        0,
        Math.floor(Number(rewardPointsByGroup.value[g.id]) || 0),
      );
    }
    rewardPointsByGroup.value = next;
  },
  { immediate: true },
);
const rewardPointsOfGroup = (g: CheckoutGroup): number =>
  Math.max(0, Math.floor(Number(rewardPointsByGroup.value[g.id]) || 0));

const rewardPointsUsedTotal = computed(() =>
  checkoutGroups.value.reduce((s, g) => s + rewardPointsOfGroup(g), 0),
);
const remainingRewardPoints = computed(() =>
  Math.max(0, TOTAL_REWARD_BALANCE - rewardPointsUsedTotal.value),
);

/** 每組扣紅利前的金額（商品 − 買多 − 優惠券 + 運費 − 運費折抵）。 */
const groupSubtotalBeforeRewards = (g: CheckoutGroup): number =>
  groupAfterBulk(g) -
  groupCouponDiscount(g) +
  (groupShippingFee(g) ?? 0) -
  groupShippingDiscount(g);
// 每組上限 = min(該組扣紅利前的金額, 全域剩餘 + 本組已用)
const maxRewardPointsFor = (g: CheckoutGroup): number =>
  Math.max(
    0,
    Math.min(
      groupSubtotalBeforeRewards(g),
      remainingRewardPoints.value + rewardPointsOfGroup(g),
    ),
  );
/** 每組最終小計（買多、優惠券、運費、免運、該組紅利折抵都算完）。 */
const groupDisplayTotal = (g: CheckoutGroup): number =>
  Math.max(0, groupSubtotalBeforeRewards(g) - rewardPointsOfGroup(g));

// ---- 付款方式 / 發票 ---------------------------------------------------------
const paymentMethod = ref<PaymentMethodId>('credit');
/** 依交集過濾的付款方式選項 → 直接餵給 Select。 */
const availablePaymentMethods = computed(() =>
  PAYMENT_METHODS.filter((m) =>
    supportedPaymentMethods.value.includes(m.value),
  ),
);
const isBankInfoVisible = computed(() => paymentMethod.value === 'transfer');
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

const invoiceType = ref('personal-paper');
const invoiceEmail = ref('abc@gmail.com');
/** 手機條碼載具（選「手機條碼」發票時使用）。 */
const invoiceMobileBarcode = ref('');
/** 捐贈：捐贈單位（可選可輸入）+ 機構編號（愛心捐贈碼）。 */
const invoiceDonateOrg = ref('');
const invoiceDonateCode = ref('');
/** 公司統編：公司名稱 + 統一編號。 */
const invoiceCompanyName = ref('');
const invoiceCompanyTaxId = ref('');
/** 自然人憑證載具條碼（2 大寫英文 + 14 數字）。 */
const invoiceNaturalCode = ref('');

// ---- 全域金額（底部可展開費用明細）------------------------------------------
const productTotal = computed(() =>
  checkoutGroups.value.reduce((s, g) => s + groupGoodsTotal(g), 0),
);
const bulkDiscountTotal = computed(() =>
  checkoutGroups.value.reduce((s, g) => s + groupBulkDiscount(g), 0),
);
// 尚未選運送方式 → 運費相關全歸零，等使用者選完再計入
const shippingTotal = computed(() =>
  checkoutGroups.value.reduce((s, g) => s + (groupShippingFee(g) ?? 0), 0),
);
const shippingDiscountTotal = computed(() =>
  checkoutGroups.value.reduce((s, g) => s + groupShippingDiscount(g), 0),
);
const couponDiscountTotal = computed(() =>
  checkoutGroups.value.reduce((s, g) => s + groupCouponDiscount(g), 0),
);
const finalTotal = computed(() =>
  checkoutGroups.value.reduce((s, g) => s + groupDisplayTotal(g), 0),
);
const totalSaved = computed(
  () =>
    bulkDiscountTotal.value +
    shippingDiscountTotal.value +
    couponDiscountTotal.value +
    rewardPointsUsedTotal.value,
);

const isPayPanelOpen = ref(false);
const handleTogglePayPanel = () => {
  isPayPanelOpen.value = !isPayPanelOpen.value;
};

// ---- 下單 --------------------------------------------------------------------
const handlePlaceOrder = () => {
  // 有訂單未選配送方式 / 超商未選門市 / 宅配未選地址 → 擋下並帶回抽屜
  if (checkoutGroups.value.some((g) => !groupShipMethod(g))) {
    ui.toast('請先為各訂單選擇配送方式');
    handleOpenShipDrawer();
    return;
  }
  if (
    checkoutGroups.value.some(
      (g) => groupShipMethod(g) === 'store' && !cvsPickOf(g),
    )
  ) {
    ui.toast('請為超商取貨的訂單選擇取貨門市');
    handleOpenShipDrawer();
    return;
  }
  if (
    checkoutGroups.value.some(
      (g) => groupShipMethod(g) === 'home' || groupShipMethod(g) === 'post',
    ) &&
    !selectedHome.value
  ) {
    ui.toast('請選擇配送地址');
    handleOpenShipDrawer();
    return;
  }
  // 自取需填聯絡人 + 電話；勾「同訂購人」但會員還沒電話時不擋在這，交給下方手機驗證補齊
  if (hasPickupOrder.value) {
    if (!pickupContactName.value.trim()) {
      ui.toast('請填寫自取聯絡人姓名');
      handleOpenShipDrawer();
      return;
    }
    if (!pickupContactPhone.value.trim() && !isPickupSameAsOrderer.value) {
      ui.toast('請填寫自取聯絡電話');
      handleOpenShipDrawer();
      return;
    }
  }
  // 未完成手機驗證 → 攔下、開 inline 驗證 Dialog；驗證完會自動再跑一次這個函式
  if (!authStore.hasPhoneBound) {
    openBindPhoneDialog();
    return;
  }
  const method =
    PAYMENT_METHODS.find((m) => m.value === paymentMethod.value)?.label ??
    '線上信用卡（藍新）';

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
      delivery: SHIPPING_METHOD_LABELS[groupShipMethod(g)!],
    }),
  );

  // 收件聯絡人 / 電話：整筆自取 → 用自取聯絡人；否則沿用共用宅配地址簿
  const isAllPickup = sharedShipMethod.value === 'pickup';
  const buyerName = isAllPickup
    ? pickupContactName.value
    : (selectedHome.value?.name ?? '');
  const buyerPhone = isAllPickup
    ? `${pickupContactPhoneCode.value} ${pickupContactPhone.value}`.trim()
    : (selectedHome.value?.phone ?? '');
  const deliveryAddress =
    sharedShipMethod.value === 'home' || sharedShipMethod.value === 'post'
      ? (selectedHome.value?.address ?? '')
      : sharedShipMethod.value === 'pickup'
        ? `自取 ${selectedPickup.value.name}（${selectedPickup.value.address}）`
        : checkoutGroups.value
            .map((g) => `${g.sellerName}：${groupShippingLabel(g)}`)
            .join('；');

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
          @click="router.push('/cart')"
        />
        <h1 class="text-2xl font-bold text-slate-950">結帳</h1>
      </div>
    </div>

    <main
      class="mx-auto flex w-full max-w-7xl flex-1 flex-col px-[var(--page-pad-x)] pb-[120px] @7xl:px-0"
      style="gap: var(--stack-gap)"
    >
      <!-- 配送資訊（套用全部入口；各訂單仍可於下方明細個別調整） -->
      <section class="shadow-card overflow-hidden rounded-xl bg-white">
        <div class="cart-divider flex items-center gap-1 px-4 py-3">
          <span class="font-medium text-slate-700">配送資訊</span>
          <i
            v-tooltip.bottom="{
              value:
                '此處設定會套用到所有訂單；也可於下方各訂單明細個別調整。',
              event: 'focus',
            }"
            class="pi pi-question-circle cursor-pointer text-sm text-slate-400 transition-colors hover:text-slate-600"
            tabindex="0"
            role="button"
            aria-label="配送方式說明"
          />
        </div>
        <div class="card-pad flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm text-slate-500">配送方式</span>
            <span
              class="text-sm"
              :class="sharedShipMethod ? 'text-slate-700' : 'text-slate-500'"
              >{{
                sharedShipMethod
                  ? SHIPPING_METHOD_LABELS[sharedShipMethod]
                  : '各訂單各自選擇'
              }}</span
            >
            <Button
              label="套用全部"
              icon="pi pi-chevron-right"
              icon-pos="right"
              link
              size="small"
              class="ml-auto"
              @click="handleOpenShipDrawer()"
            />
          </div>
          <!-- 各訂單已選配送方式 / 地址 / 門市摘要 -->
          <div
            class="mt-1 flex flex-col gap-2 border-t border-slate-100 pt-3"
          >
            <div
              v-for="g in checkoutGroups"
              :key="g.id"
              class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
            >
              <span class="text-slate-500">{{ g.sellerName }}</span>
              <span v-if="groupShipMethod(g)" class="text-slate-700">{{
                groupShipSummaryLabel(g)
              }}</span>
              <span v-else class="text-slate-400">尚未選擇配送方式</span>
              <span
                v-if="groupShipDetail(g)"
                class="w-full text-slate-500"
                >{{ groupShipDetail(g) }}</span
              >
            </div>
          </div>
        </div>
      </section>

      <!-- 訂單明細（按購物車拆分，每台一張卡） -->
      <section
        v-for="group in checkoutGroups"
        :key="group.id"
        class="shadow-card rounded-xl bg-white"
      >
        <div class="cart-divider flex items-center gap-2 px-4 py-3">
          <span class="font-medium text-slate-700"
            >{{ group.sellerName }} 訂單明細</span
          >
          <Tag
            :value="group.tempLayer"
            :severity="group.tempLayer === '常溫' ? 'secondary' : 'info'"
            class="!py-0.5 !text-xs"
          />
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
              <!-- 規格列：直接顯示規格內容（不加「規格」label；spec 為預設值時不顯示） -->
              <div
                v-if="item.spec && item.spec !== '預設'"
                class="flex gap-4 text-sm text-slate-700"
              >
                <span class="truncate">{{ item.spec }}</span>
              </div>
              <!-- 組合商品內容（不可收合，直接列出） -->
              <p
                v-if="item.bundleItems"
                class="text-sm leading-relaxed text-slate-700"
              >
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
              <!-- 買多優惠明細（組合商品下方、數量上方） -->
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
              <!-- 數量列固定放最後 -->
              <div class="flex gap-4 text-sm text-slate-700">
                <span>數量</span><span>{{ item.qty }}</span>
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-0.5 text-right">
              <template v-if="discountedLineTotal(group, item) !== null">
                <Tag
                  :value="'已套用 ' + appliedCouponOf(group)?.amount"
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
                  ${{ discountedLineTotal(group, item)?.toLocaleString() }}
                </span>
              </template>
              <template v-else-if="hasBulkDiscount(item)">
                <span class="text-sm text-slate-400 line-through">
                  ${{ lineTotal(item).toLocaleString() }}
                </span>
                <span class="text-base font-bold" style="color: var(--primary)">
                  ${{ lineTotalAfterBulk(item).toLocaleString() }}
                </span>
              </template>
              <template v-else>
                <Tag
                  v-if="
                    appliedCouponOf(group) && !couponAppliesTo(group, item.id)
                  "
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
        </div>

        <!-- 全寬收據式明細：標籤左、金額右，操作行內 -->
        <!-- 收據式明細：網格對齊（標籤｜操作 132px｜說明｜金額靠右）；
             手機版說明列換行到操作按鈕下方 -->
        <div class="cart-divider-top flex flex-col px-4 py-3">
          <!-- 商品金額 -->
          <div :class="RECEIPT_ROW_CLASS">
            <span class="text-sm text-slate-700">商品金額</span>
            <span :class="RECEIPT_AMOUNT_CLASS + ' text-slate-700'"
              >$ {{ groupGoodsTotal(group).toLocaleString() }}</span
            >
          </div>

          <!-- 多件優惠折抵 -->
          <div v-if="groupBulkDiscount(group) > 0" :class="RECEIPT_ROW_CLASS">
            <span class="text-sm text-slate-700">多件優惠折抵</span>
            <span :class="RECEIPT_AMOUNT_CLASS + ' font-medium text-red-500'"
              >- $ {{ groupBulkDiscount(group).toLocaleString() }}</span
            >
          </div>

          <!-- 運送方式/運費：先方式名稱（如冷凍宅配），再貼合字寬的變更鈕；最右為運費 -->
          <div :class="RECEIPT_ROW_CLASS">
            <span
              class="col-start-1 row-start-1 text-sm whitespace-nowrap text-slate-700"
              >運送方式/運費</span
            >
            <div
              class="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-2 @3xl:col-span-2"
            >
              <span
                v-if="groupShipMethod(group)"
                class="truncate text-sm text-slate-500"
                >{{ groupShippingLabel(group) }}</span
              >
              <Button
                :label="groupShipMethod(group) ? '變更' : '選擇配送方式'"
                severity="secondary"
                outlined
                size="small"
                class="shrink-0"
                @click="handleOpenShipDrawer(group.id)"
              />
            </div>
            <span
              v-if="groupShippingFee(group) === null"
              :class="RECEIPT_AMOUNT_CLASS + ' text-slate-400'"
              >—</span
            >
            <span
              v-else-if="groupShippingFee(group) === 0"
              :class="RECEIPT_AMOUNT_CLASS + ' text-slate-700'"
              >免運</span
            >
            <span v-else :class="RECEIPT_AMOUNT_CLASS + ' text-slate-700'"
              >$ {{ groupShippingFee(group)!.toLocaleString() }}</span
            >
          </div>

          <!-- 收件人資訊：選完運送方式後顯示姓名 + 手機號碼 -->
          <div v-if="groupRecipient(group)" :class="RECEIPT_ROW_CLASS">
            <span
              class="col-start-1 row-start-1 text-sm whitespace-nowrap text-slate-700"
              >收件人</span
            >
            <div
              class="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 @3xl:col-span-2"
            >
              <span class="text-sm text-slate-700">{{
                groupRecipient(group)!.name
              }}</span>
              <span class="text-sm text-slate-500">{{
                groupRecipient(group)!.phone
              }}</span>
            </div>
          </div>

          <!-- 運費折抵：有運費時達 / 未達門檻都顯示；達標折抵全額運費、未達顯示 $0 -->
          <div v-if="groupHasShippingFee(group)" :class="RECEIPT_ROW_CLASS">
            <span class="text-sm text-slate-700">運費折抵</span>
            <Tag
              v-if="isGroupFreeShipping(group)"
              value="達免運門檻"
              class="col-start-2 row-start-1 !w-[132px] !justify-center !py-0.5 !text-xs"
              :pt="{
                root: {
                  style:
                    'background: var(--primary-surface); color: var(--primary)',
                },
              }"
            />
            <Tag
              v-else
              value="未達免運門檻"
              severity="secondary"
              class="col-start-2 row-start-1 !w-[132px] !justify-center !bg-slate-100 !py-0.5 !text-xs !text-slate-400"
            />
            <span
              v-if="isGroupFreeShipping(group)"
              :class="RECEIPT_AMOUNT_CLASS + ' font-medium text-red-500'"
              >- $ {{ groupShippingDiscount(group).toLocaleString() }}</span
            >
            <span v-else :class="RECEIPT_AMOUNT_CLASS + ' text-slate-400'"
              >$ 0</span
            >
          </div>

          <!-- 優惠券：操作欄放按鈕，說明欄放券名 -->
          <div :class="RECEIPT_ROW_CLASS">
            <span class="text-sm text-slate-700">優惠券</span>
            <div class="col-start-2 row-start-1">
              <Button
                :label="appliedCouponOf(group) ? '變更' : '選擇優惠券'"
                severity="secondary"
                outlined
                size="small"
                :class="RECEIPT_BUTTON_CLASS"
                @click="handleOpenCouponDrawer(group)"
              />
            </div>
            <div v-if="appliedCouponOf(group)" :class="RECEIPT_HINT_CLASS">
              <span class="truncate text-sm text-slate-500">{{
                appliedCouponOf(group)!.title
              }}</span>
            </div>
            <span
              v-if="groupCouponDiscount(group) > 0"
              :class="RECEIPT_AMOUNT_CLASS + ' font-medium text-red-500'"
              >- $ {{ groupCouponDiscount(group).toLocaleString() }}</span
            >
            <span v-else :class="RECEIPT_AMOUNT_CLASS + ' text-slate-400'"
              >—</span
            >
          </div>

          <!-- 紅利點數：操作欄放 stepper（同寬），點數餘額放操作後方的說明欄 -->
          <div :class="RECEIPT_ROW_CLASS">
            <span class="text-sm text-slate-700">紅利點數</span>
            <div class="col-start-2 row-start-1 w-[132px]">
              <InputNumber
                :model-value="rewardPointsByGroup[group.id] ?? 0"
                :min="0"
                :max="maxRewardPointsFor(group)"
                show-buttons
                button-layout="horizontal"
                increment-button-icon="pi pi-plus"
                decrement-button-icon="pi pi-minus"
                class="qty-stepper is-fluid"
                @update:model-value="
                  (v) =>
                    (rewardPointsByGroup[group.id] = Math.max(
                      0,
                      Math.floor(Number(v) || 0),
                    ))
                "
              />
            </div>
            <div :class="RECEIPT_HINT_CLASS">
              <span class="text-xs text-slate-500">
                尚有
                <span style="color: var(--primary)">{{
                  remainingRewardPoints
                }}</span>
                點
              </span>
            </div>
            <span
              v-if="rewardPointsOfGroup(group) > 0"
              :class="RECEIPT_AMOUNT_CLASS + ' font-medium text-red-500'"
              >- $ {{ rewardPointsOfGroup(group).toLocaleString() }}</span
            >
            <span v-else :class="RECEIPT_AMOUNT_CLASS + ' text-slate-400'"
              >—</span
            >
          </div>
        </div>

        <!-- 訂單金額小計 -->
        <div
          class="cart-divider-top flex items-center justify-between gap-4 px-4 py-4"
        >
          <span class="text-base font-bold text-slate-950">訂單金額小計</span>
          <span class="text-2xl font-bold" style="color: var(--primary)"
            ><span class="text-base">NT$</span
            >{{ groupDisplayTotal(group).toLocaleString() }}</span
          >
        </div>
      </section>

      <!-- 發票資訊 -->
      <section class="shadow-card overflow-hidden rounded-xl bg-white">
        <div class="cart-divider px-4 py-3">
          <span class="font-medium text-slate-700">發票資訊</span>
        </div>
        <div class="card-pad flex max-w-[440px] flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm text-slate-700">發票類型</label>
            <Select
              v-model="invoiceType"
              :options="INVOICE_TYPES"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <!-- 依發票類型顯示對應欄位：手機條碼 / 捐贈 / 公司統編 / Email -->
          <template v-if="invoiceType === 'company'">
            <div class="flex flex-col gap-1">
              <label class="text-sm text-slate-700">公司名稱</label>
              <InputText
                v-model="invoiceCompanyName"
                class="w-full"
                placeholder="請輸入公司名稱"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm text-slate-700">統一編號</label>
              <InputText
                v-model="invoiceCompanyTaxId"
                class="w-full"
                placeholder="請輸入統一編號"
              />
            </div>
          </template>
          <div
            v-else-if="invoiceType === 'mobile'"
            class="flex flex-col gap-1"
          >
            <label class="text-sm text-slate-700">手機條碼</label>
            <InputText
              v-model="invoiceMobileBarcode"
              class="w-full"
              placeholder="/.12345"
            />
          </div>
          <div
            v-else-if="invoiceType === 'natural'"
            class="flex flex-col gap-1"
          >
            <label class="text-sm text-slate-700">自然人憑證條碼</label>
            <InputText
              v-model="invoiceNaturalCode"
              class="w-full"
              placeholder="請輸入自然人憑證條碼（AB12345678901234）"
            />
          </div>
          <template v-else-if="invoiceType === 'donate'">
            <div class="flex flex-col gap-1">
              <label class="text-sm text-slate-700">捐贈單位</label>
              <Select
                v-model="invoiceDonateOrg"
                :options="DONATE_ORGS"
                editable
                placeholder="請選擇或輸入捐贈單位"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm text-slate-700">機構編號</label>
              <InputText
                v-model="invoiceDonateCode"
                class="w-full"
                placeholder="請輸入愛心捐贈碼"
              />
            </div>
          </template>
          <div v-else class="flex flex-col gap-1">
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
          <!-- 轉帳匯款 → 帶出銀行戶頭資料 -->
          <div
            v-if="isBankInfoVisible"
            class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p class="mb-1 text-sm font-bold text-slate-700">銀行戶頭資料</p>
            <p
              v-for="line in BANK_TRANSFER_INFO"
              :key="line"
              class="py-0.5 text-sm text-slate-500"
            >
              {{ line }}
            </p>
          </div>
          <p
            v-if="availablePaymentMethods.length < PAYMENT_METHODS.length"
            class="mt-2 text-xs text-slate-500"
          >
            <i class="pi pi-info-circle mr-1" />
            部分付款方式因您勾選的購物車不共同支援，已自動隱藏。
          </p>
        </div>
      </section>
    </main>

    <!-- Sticky footer（總計可展開費用明細） -->
    <div
      class="sticky bottom-0 z-40 border-t border-b border-slate-200 bg-white"
    >
      <!-- 費用明細面板 -->
      <div v-if="isPayPanelOpen" class="border-b border-slate-200">
        <div class="mx-auto max-w-7xl px-4 py-3.5">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-bold text-slate-950">費用明細</span>
            <button
              type="button"
              class="cursor-pointer text-xs"
              style="color: var(--primary)"
              @click="handleTogglePayPanel"
            >
              收合 <i class="pi pi-chevron-down text-[10px]" />
            </button>
          </div>
          <div class="flex flex-col gap-1 text-sm">
            <div class="flex justify-between py-0.5">
              <span class="text-slate-500">商品總金額</span>
              <span class="text-slate-700"
                >$ {{ productTotal.toLocaleString() }}</span
              >
            </div>
            <div v-if="hasAnyShipMethod" class="flex justify-between py-0.5">
              <span class="text-slate-500">運費總金額</span>
              <span class="text-slate-700"
                >$ {{ shippingTotal.toLocaleString() }}</span
              >
            </div>
            <div
              v-if="bulkDiscountTotal > 0"
              class="flex justify-between py-0.5"
            >
              <span class="text-slate-500">多件優惠折抵</span>
              <span class="font-medium text-red-500"
                >- $ {{ bulkDiscountTotal.toLocaleString() }}</span
              >
            </div>
            <div
              v-if="shippingDiscountTotal > 0"
              class="flex justify-between py-0.5"
            >
              <span class="flex items-center gap-1 text-slate-500">
                <i class="pi pi-truck text-xs" />
                運費折抵（滿千免運）
              </span>
              <span class="font-medium text-red-500"
                >- $ {{ shippingDiscountTotal.toLocaleString() }}</span
              >
            </div>
            <div
              v-if="couponDiscountTotal > 0"
              class="flex justify-between py-0.5"
            >
              <span class="flex items-center gap-1 text-slate-500">
                <i class="pi pi-ticket text-xs" />
                優惠券折扣
              </span>
              <span class="font-medium text-red-500"
                >- $ {{ couponDiscountTotal.toLocaleString() }}</span
              >
            </div>
            <div
              v-if="rewardPointsUsedTotal > 0"
              class="flex justify-between py-0.5"
            >
              <span class="text-slate-500">紅利點數折抵</span>
              <span class="font-medium text-red-500"
                >- $ {{ rewardPointsUsedTotal.toLocaleString() }}</span
              >
            </div>
            <div
              class="mt-1 flex justify-between border-t border-slate-200 pt-2"
            >
              <span class="font-bold text-slate-950">總付款金額</span>
              <span class="font-bold" style="color: var(--primary)"
                >$ {{ finalTotal.toLocaleString() }}</span
              >
            </div>
          </div>
        </div>
      </div>

      <div
        class="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4 py-3"
        style="padding-bottom: max(12px, env(safe-area-inset-bottom))"
      >
        <button
          type="button"
          class="flex min-w-0 cursor-pointer flex-col items-end leading-tight"
          @click="handleTogglePayPanel"
        >
          <div class="flex min-w-0 items-baseline gap-2">
            <span class="text-sm text-slate-700 @3xl:text-lg">總付款金額</span>
            <span
              class="truncate text-2xl font-bold @3xl:text-3xl"
              style="color: var(--primary)"
              ><span class="text-base @3xl:text-lg">NT$</span
              >{{ finalTotal.toLocaleString() }}</span
            >
            <i
              class="pi text-sm"
              :class="isPayPanelOpen ? 'pi-chevron-down' : 'pi-chevron-up'"
              style="color: var(--primary)"
            />
          </div>
          <span v-if="totalSaved > 0" class="text-sm text-red-500"
            >共省下 -${{ totalSaved.toLocaleString() }}</span
          >
        </button>
        <Button
          label="去付款"
          class="!min-h-12 shrink-0 !px-6 @3xl:!px-16"
          @click="handlePlaceOrder"
        />
      </div>
    </div>

    <!-- ============== 綁定手機 Dialog（inline 流程，綁完直接回到結帳） ============== -->
    <Dialog
      v-model:visible="isBindPhoneDialogVisible"
      modal
      :draggable="false"
      :style="{ width: '440px' }"
      :breakpoints="{ '768px': '92vw' }"
    >
      <template #header>
        <span class="text-base font-bold text-slate-950">驗證手機號碼</span>
      </template>
      <div class="flex flex-col gap-4 py-1">
        <p class="text-sm text-slate-600">尚未完成手機號碼驗證</p>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">手機號碼</label>
          <div class="flex gap-2">
            <Select
              v-model="bindPhoneCode"
              :options="DRAWER_COUNTRY_CODES"
              class="w-[110px] shrink-0"
            />
            <InputText
              v-model="bindPhone"
              type="tel"
              placeholder="請輸入手機號碼"
              class="flex-1"
            />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">簡訊驗證碼</label>
          <!-- 尚未發送：全寬「發送驗證碼」；已發送：顯示驗證碼輸入框 + 重新發送連結 -->
          <div v-if="!hasSentBindCode">
            <Button
              :disabled="!canSendBindCode"
              label="發送驗證碼"
              class="!min-h-11 w-full"
              @click="handleSendBindCode"
            />
          </div>
          <div v-else class="flex flex-col gap-1">
            <InputText
              v-model="bindVerifyCode"
              :maxlength="BIND_CODE_LENGTH"
              placeholder="請輸入六位數驗證碼"
              class="w-full"
            />
            <button
              type="button"
              class="mt-1 cursor-pointer self-start text-sm underline disabled:cursor-not-allowed disabled:no-underline"
              :class="bindCountdown > 0 ? 'text-slate-400' : ''"
              :style="bindCountdown > 0 ? {} : { color: 'var(--primary)' }"
              :disabled="bindCountdown > 0"
              @click="handleSendBindCode"
            >
              {{
                bindCountdown > 0
                  ? `${bindCountdown} 秒後可重新發送`
                  : '重新發送驗證碼'
              }}
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <Button
            label="取消"
            severity="secondary"
            outlined
            @click="isBindPhoneDialogVisible = false"
          />
          <Button
            label="完成"
            :disabled="!canCompleteBind"
            @click="handleCompleteBind"
          />
        </div>
      </template>
    </Dialog>

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
        <!-- 相機畫面：實體後鏡頭 video（授權失敗則顯示 QR icon fallback） -->
        <div
          class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-900"
        >
          <video
            ref="scannerVideoRef"
            autoplay
            muted
            playsinline
            class="absolute inset-0 h-full w-full object-cover"
          ></video>
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
          <!-- 授權失敗 fallback -->
          <i
            v-if="cameraError"
            class="pi pi-qrcode text-6xl text-white/40"
          ></i>
        </div>
        <p
          v-if="cameraError"
          class="text-center text-sm font-medium text-red-500"
        >
          {{ cameraError }}
        </p>
        <p v-else class="text-center text-sm text-slate-500">
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

    <!-- ============== Coupon Drawer（依訂單開啟） ============== -->
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
            <div class="mb-1 flex items-center justify-between">
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
            <p v-if="couponDrawerGroup" class="mb-4 text-sm text-slate-500">
              套用於：{{ couponDrawerGroup.sellerName }}
            </p>

            <!-- 手動輸入優惠碼 + 掃描 QR：手機版兩者同列，桌機加寬 -->
            <div class="mb-4 flex items-center gap-2">
              <InputGroup class="min-w-0 flex-1">
                <InputText
                  v-model="couponCode"
                  placeholder="輸入優惠券優惠代碼"
                  @keyup.enter="handleApplyCouponCode"
                />
                <Button
                  label="兌換"
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
            <div
              v-if="couponDrawerGroup"
              class="flex max-h-[60vh] flex-col gap-3 overflow-y-auto"
            >
              <label
                v-for="c in drawerSortedCoupons"
                :key="c.id"
                class="flex rounded-[10px] border border-slate-200"
                :class="
                  !isCouponUsableFor(couponDrawerGroup, c)
                    ? 'cursor-not-allowed'
                    : 'cursor-pointer hover:border-[var(--primary)]'
                "
              >
                <!-- Amount block -->
                <div
                  class="flex w-24 shrink-0 items-center justify-center gap-1 rounded-l-[10px] px-2 py-3 @3xl:w-[140px] @3xl:gap-2 @3xl:px-3 @3xl:py-4"
                  :class="
                    isCouponUsableFor(couponDrawerGroup, c)
                      ? ''
                      : 'bg-slate-100'
                  "
                  :style="
                    isCouponUsableFor(couponDrawerGroup, c)
                      ? 'background: var(--primary-surface)'
                      : ''
                  "
                >
                  <i
                    class="pi pi-gift hidden text-xl @3xl:inline"
                    :class="
                      isCouponUsableFor(couponDrawerGroup, c)
                        ? ''
                        : 'text-slate-400'
                    "
                    :style="
                      isCouponUsableFor(couponDrawerGroup, c)
                        ? 'color: var(--primary)'
                        : ''
                    "
                  />
                  <span
                    class="text-lg font-bold @3xl:text-2xl"
                    :class="
                      isCouponUsableFor(couponDrawerGroup, c)
                        ? ''
                        : 'text-slate-400'
                    "
                    :style="
                      isCouponUsableFor(couponDrawerGroup, c)
                        ? 'color: var(--primary)'
                        : ''
                    "
                    >{{ c.amount }}</span
                  >
                </div>
                <!-- Detail block -->
                <div
                  class="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3 @3xl:px-4 @3xl:py-4"
                >
                  <span
                    v-if="!isCouponUsableFor(couponDrawerGroup, c)"
                    class="text-xs font-medium text-red-500 @3xl:hidden"
                    >{{ couponUnusableReasonFor(couponDrawerGroup, c) }}</span
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
                  :class="
                    !isCouponUsableFor(couponDrawerGroup, c)
                      ? 'hidden @3xl:flex'
                      : ''
                  "
                >
                  <span
                    v-if="!isCouponUsableFor(couponDrawerGroup, c)"
                    class="text-sm text-red-500"
                    >{{ couponUnusableReasonFor(couponDrawerGroup, c) }}</span
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
                label="不使用"
                severity="secondary"
                outlined
                @click="
                  couponDrawerSelected = null;
                  handleConfirmCouponDrawer();
                "
              />
              <Button label="確認" @click="handleConfirmCouponDrawer" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ============== Shipping Drawer（4 種方式，超商依溫層逐訂單選門市） ============== -->
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
                <h3 class="text-lg font-bold text-slate-950">
                  {{
                    shipDrawerGroupId == null
                      ? '選擇運送方式（套用全部）'
                      : '選擇運送方式'
                  }}
                </h3>
                <Button
                  icon="pi pi-times"
                  severity="secondary"
                  text
                  rounded
                  class="!min-h-11 !min-w-11"
                  @click="isShipDrawerVisible = false"
                />
              </div>

              <div class="flex max-h-[62vh] flex-col gap-3 overflow-y-auto">
                <p
                  v-if="
                    shipDrawerGroupId == null &&
                    supportedShippingMethods.length < SHIPPING_METHOD_ORDER.length
                  "
                  class="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700"
                >
                  <i class="pi pi-info-circle mr-1" />
                  部分運送方式因您勾選的購物車不共同支援，套用全部時已自動隱藏。
                </p>

                <!-- 方式卡（accordion：點 header 切換，展開對應設定） -->
                <div
                  v-for="m in drawerMethods"
                  :key="m"
                  class="flex flex-col gap-3"
                >
                  <Button
                    severity="secondary"
                    class="!min-h-11 !w-full !justify-between"
                    :pt="{
                      root: {
                        class:
                          'cursor-pointer !border-none !bg-slate-100 !text-slate-700 transition-colors hover:!bg-slate-200',
                      },
                    }"
                    @click="handleSelectShipMethod(m)"
                  >
                    <span class="font-medium">{{
                      SHIPPING_METHOD_LABELS[m]
                    }}</span>
                    <span class="flex items-center gap-2">
                      {{ shippingMethodFeeHint(m, drawerGroups) }}
                      <i
                        v-if="drawerSelectedMethod === m"
                        class="pi pi-check text-green-600"
                      />
                    </span>
                  </Button>

                  <!-- 宅配 / 郵局宅配：共用收件地址清單 -->
                  <div
                    v-if="
                      drawerSelectedMethod === m && (m === 'home' || m === 'post')
                    "
                    class="flex flex-col gap-2"
                  >
                    <button
                      v-for="addr in homeAddresses"
                      :key="addr.id"
                      type="button"
                      class="w-full rounded-lg border-2 p-3 text-left transition-colors disabled:cursor-not-allowed"
                      :class="
                        selectedHomeId === addr.id
                          ? 'border-[var(--primary)]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      "
                      :style="
                        selectedHomeId === addr.id
                          ? 'background: var(--primary-surface)'
                          : ''
                      "
                      :disabled="addr.unavailable"
                      @click="!addr.unavailable && (selectedHomeId = addr.id)"
                    >
                      <div class="flex gap-3">
                        <div class="min-w-0 flex-1">
                          <div
                            class="flex flex-wrap items-center gap-2 text-sm text-slate-700"
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
                            class="mt-1 flex items-start gap-1 text-sm text-slate-700"
                          >
                            <i class="pi pi-map-marker mt-0.5 text-xs" />
                            <span>{{ addr.address }}</span>
                          </div>
                          <p
                            v-if="addr.unavailable"
                            class="mt-1 text-xs text-red-500"
                          >
                            目前不提供配送至此地區
                          </p>
                        </div>
                        <div class="flex shrink-0 flex-col items-end gap-1">
                          <button
                            v-if="!addr.isDefault"
                            type="button"
                            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white/70 hover:text-amber-500"
                            title="設為預設"
                            @click.stop="handleSetDefaultHome(addr.id)"
                          >
                            <i class="pi pi-star" />
                          </button>
                          <button
                            type="button"
                            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white/70 hover:text-red-500"
                            title="刪除"
                            @click.stop="handleDeleteHome(addr.id)"
                          >
                            <i class="pi pi-trash" />
                          </button>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm text-slate-500 transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      @click="shipDrawerView = 'add-home'"
                    >
                      <i class="pi pi-plus" />
                      <span>新增宅配地址</span>
                    </button>
                  </div>

                  <!-- 自取：門市清單 -->
                  <div
                    v-else-if="drawerSelectedMethod === m && m === 'pickup'"
                    class="flex flex-col gap-2"
                  >
                    <button
                      v-for="p in PICKUP_LOCATIONS"
                      :key="p.id"
                      type="button"
                      class="w-full rounded-lg border-2 p-3 text-left transition-colors"
                      :class="
                        selectedPickupId === p.id
                          ? 'border-[var(--primary)]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      "
                      :style="
                        selectedPickupId === p.id
                          ? 'background: var(--primary-surface)'
                          : ''
                      "
                      @click="selectedPickupId = p.id"
                    >
                      <div class="text-sm font-medium text-slate-700">
                        {{ p.name }}
                      </div>
                      <div
                        class="mt-1 flex items-center gap-1 text-sm text-slate-700"
                      >
                        <i class="pi pi-map-marker text-xs" />
                        {{ p.address }} · {{ p.hours }}
                      </div>
                    </button>

                    <!-- 自取聯絡人：姓名 + 電話；可勾「同訂購人」帶入會員資料 -->
                    <div
                      class="mt-1 flex flex-col gap-3 border-t border-slate-200 pt-3"
                    >
                      <div class="flex items-center gap-2">
                        <Checkbox
                          v-model="isPickupSameAsOrderer"
                          binary
                          input-id="pickup-same-as-orderer"
                        />
                        <label
                          for="pickup-same-as-orderer"
                          class="cursor-pointer text-sm text-slate-700"
                        >
                          同訂購人（帶入會員資料與電話）
                        </label>
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="text-sm text-slate-700">聯絡人姓名</label>
                        <InputText
                          v-model="pickupContactName"
                          :disabled="isPickupSameAsOrderer"
                          placeholder="請輸入自取聯絡人姓名"
                          class="w-full"
                        />
                      </div>
                      <div class="flex flex-col gap-1">
                        <label class="text-sm text-slate-700">聯絡電話</label>
                        <div class="flex gap-2">
                          <Select
                            v-model="pickupContactPhoneCode"
                            :options="DRAWER_COUNTRY_CODES"
                            :disabled="isPickupSameAsOrderer"
                            class="w-[120px]"
                          />
                          <InputText
                            v-model="pickupContactPhone"
                            type="tel"
                            :disabled="isPickupSameAsOrderer"
                            placeholder="請輸入聯絡電話"
                            class="flex-1"
                          />
                        </div>
                        <p
                          v-if="
                            isPickupSameAsOrderer && !pickupContactPhone.trim()
                          "
                          class="text-xs text-slate-500"
                        >
                          會員尚未有手機號碼，去付款時將進行驗證。
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- 超商取貨：各訂單依溫層選品牌 → 帶出門市 -->
                  <div
                    v-else-if="drawerSelectedMethod === m && m === 'store'"
                    class="flex flex-col gap-3"
                  >
                    <p class="text-xs text-slate-500">
                      選擇取貨門市（門市取自會員設定，運費依溫層）：
                    </p>
                    <div
                      v-for="g in drawerGroups"
                      :key="g.id"
                      :class="
                        shipDrawerGroupId == null
                          ? 'rounded-lg border border-slate-200 p-3'
                          : ''
                      "
                    >
                      <!-- 個別訂單開啟時整個 header（賣家名 + 溫層 tag）都省略 -->
                      <div
                        v-if="shipDrawerGroupId == null"
                        class="mb-2 flex items-center gap-2"
                      >
                        <span
                          class="flex-1 text-sm font-medium text-slate-700"
                          >{{ g.sellerName }}</span
                        >
                        <Tag
                          :value="g.tempLayer"
                          :severity="
                            g.tempLayer === '常溫' ? 'secondary' : 'info'
                          "
                          class="!py-0.5 !text-xs"
                        />
                      </div>
                      <div class="mb-2 flex flex-wrap gap-2">
                        <button
                          v-for="s in cvsStoreList"
                          :key="s.id"
                          type="button"
                          class="cursor-pointer rounded-lg border-2 px-3 py-2 text-sm transition-colors"
                          :class="
                            cvsStoreByGroup[g.id] === s.id
                              ? 'border-[var(--primary)] font-medium'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          "
                          :style="
                            cvsStoreByGroup[g.id] === s.id
                              ? 'background: var(--primary-surface); color: var(--primary)'
                              : ''
                          "
                          @click="handlePickCvsStore(g, s.id)"
                        >
                          <span class="flex items-center gap-1.5">
                            <img
                              v-if="s.chain"
                              :src="CVS_LOGOS[s.chain]"
                              :alt="s.chain"
                              class="h-5 w-5 shrink-0 object-contain"
                            />
                            <span>{{ s.storeName }}</span>
                            <span v-if="s.chain"
                              >${{ CVS_FEES[s.chain][g.tempLayer] }}</span
                            >
                          </span>
                        </button>
                      </div>
                      <div
                        v-if="cvsPickOf(g)"
                        class="flex flex-col gap-1 text-sm text-slate-700"
                      >
                        <div class="flex flex-wrap items-center gap-2">
                          <i class="pi pi-map-marker text-xs" />
                          <span
                            >門市：<span class="font-medium">{{
                              cvsPickOf(g)!.store.storeName
                            }}</span></span
                          >
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                          <i class="pi pi-user text-xs" />
                          <span
                            >收件人：<span class="font-medium">{{
                              cvsPickOf(g)!.store.name
                            }}</span></span
                          >
                          <span>{{ cvsPickOf(g)!.store.phone }}</span>
                        </div>
                      </div>
                    </div>
                    <!-- 新增超商門市：加入會員門市清單（會員中心同步） -->
                    <button
                      type="button"
                      class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm text-slate-500 transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      @click="shipDrawerView = 'add-store'"
                    >
                      <i class="pi pi-plus" />
                      <span>新增超商門市</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 變動已即時生效，底部只留單顆「完成」關閉；X 右上也能關 -->
              <div class="mt-4 flex justify-end">
                <Button label="完成" @click="isShipDrawerVisible = false" />
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

              <div class="mx-auto flex max-w-[440px] flex-col gap-3">
                <!-- 選擇超商（點 logo 開該超商電子地圖，門市免手填） -->
                <div class="flex flex-col gap-2">
                  <label class="text-sm text-slate-700">選擇超商</label>
                  <div class="flex gap-3">
                    <button
                      class="flex h-12 w-16 items-center justify-center rounded-md border-2 bg-white transition-all"
                      :class="
                        newStoreChain === '7-11' ? '' : 'border-slate-200'
                      "
                      :style="
                        newStoreChain === '7-11'
                          ? 'border-color: var(--primary)'
                          : ''
                      "
                      @click="handleOpenStoreMap('7-11')"
                    >
                      <img
                        :src="CVS_LOGOS['7-11']"
                        alt="7-11"
                        class="h-7 w-7 object-contain"
                      />
                    </button>
                    <button
                      class="flex h-12 w-16 items-center justify-center rounded-md border-2 bg-white transition-all"
                      :class="
                        newStoreChain === 'FamilyMart' ? '' : 'border-slate-200'
                      "
                      :style="
                        newStoreChain === 'FamilyMart'
                          ? 'border-color: var(--primary)'
                          : ''
                      "
                      @click="handleOpenStoreMap('FamilyMart')"
                    >
                      <img
                        :src="CVS_LOGOS['FamilyMart']"
                        alt="FamilyMart"
                        class="h-7 w-7 object-contain"
                      />
                    </button>
                  </div>
                  <div
                    v-if="newStoreShopName && newStoreAddress"
                    class="flex min-w-0 flex-col rounded-md border border-slate-200 bg-slate-50 p-3"
                  >
                    <span class="font-bold text-slate-950">{{
                      newStoreShopName
                    }}</span>
                    <span class="truncate text-xs text-slate-500">{{
                      newStoreAddress
                    }}</span>
                  </div>
                  <p v-else class="text-sm text-slate-400">尚未選擇門市</p>
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-slate-700"
                    >收件人姓名<span class="text-red-500"> *</span></label
                  >
                  <InputText v-model="newStoreName" class="w-full" />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-sm text-slate-700"
                    >收件人電話<span class="text-red-500"> *</span></label
                  >
                  <div class="flex gap-2">
                    <Select
                      v-model="newStoreCountryCode"
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

              <!-- 超商電子地圖選門市 -->
              <StoreMapPicker
                v-model:visible="isStoreMapVisible"
                :chain="newStoreChain"
                @select="handleSelectStore"
              />
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
  background: var(--border-light);
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
 * 預設走純 viewport 座標，避免 --frame-bottom 首次計算時內容還沒完整撐開被算成正數，
 * 把抽屜推離視窗底部（PC 尺寸「往上跑」的根本原因）。
 * 只有裝置模擬器開啟時（App.vue 會加 html.frame-mode），才切到 frame 座標讓抽屜貼在
 * 模擬視窗內。
 * 抽屜 position:fixed 脫離 @container 子樹，RWD 用 @media，不用 container query。
 */
.drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
}
.drawer-panel {
  position: fixed;
  left: 50vw;
  bottom: 0;
  transform: translateX(-50%);
  /* PC 版限寬 720px 貼合內容 */
  width: min(720px, 100vw);
  max-width: 100vw;
  z-index: 110;
  background: white;
  border-radius: 16px 16px 0 0;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

/* 裝置模擬器模式：抽屜貼在模擬框視覺座標內 */
html.frame-mode .drawer-backdrop {
  left: var(--frame-left, 0);
  width: var(--frame-width, 100vw);
  height: calc(100vh - var(--frame-bottom, 0px));
}
html.frame-mode .drawer-panel {
  left: calc(var(--frame-left, 0px) + var(--frame-width, 100vw) / 2);
  bottom: var(--frame-bottom, 0px);
  width: min(720px, var(--frame-width, 100vw));
}

/* 手機（真實視窗 < 768px、非裝置模擬）：抽屜滿寬。
   裝置模擬（frame-mode）走上面 .frame-mode 規則貼合框寬，不套此規則。 */
@media (max-width: 768px) {
  html:not(.frame-mode) .drawer-panel {
    width: 100vw !important;
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
