<script setup lang="ts">
import { computed, ref } from 'vue';
import { useViewportStore } from '../../pinia/viewport';
import { useOrdersStore } from '../../pinia/orders';
import { useUiStore } from '../../pinia/ui';
import type {
  OrderRecord,
  OrderItem,
  PackageInfo,
  TimelineStepKey,
  DetailTab,
  OrderStatus,
  OverrideStatus,
  PayStatus,
} from '../../types/order';
import { parseSlashDate, formatDateRange } from '../../utils/date';
import ChangeAddressDialog from './ChangeAddressDialog.vue';
import { useMoney } from '../../composables/useMoney';

const { money } = useMoney();

/**
 * 我的訂單 section（會員中心右側內容）。
 * - 狀態分頁 + 日期區間 + 搜尋 + 查詢結果摘要（購物權益說明區塊已依規劃移除）
 * - 訂單卡（header table + 權益膠囊 + 子 tab + 商品列 + timeline）
 */

const vp = computed(() => useViewportStore().current.id);
const isMobile = computed(() => vp.value === 'mobile');

const ordersStore = useOrdersStore();
const ui = useUiStore();

// 主 tab（退貨 / 退款相關 tab 已移除）
/**
 * 頁籤狀態：除了 OrderStatus 之外，再加 timeline 階段 key（shipped / to_receive / delivered）。
 * - 出貨中、待收貨：兩個 tab 都顯示「任一包裹 currentStep === 'shipped'」的訂單（賣家 / 買家觀點）
 * - 已送達：任一包裹 currentStep === 'delivered'
 */
type StatusTab =
  'all' | OrderStatus | 'shipped' | 'to_receive' | 'delivered' | OverrideStatus;
const statusTabs: Array<{ key: StatusTab; label: string }> = [
  { key: 'all', label: '所有訂單' },
  { key: 'unpaid', label: '待付款' },
  { key: 'to_ship', label: '待出貨' },
  { key: 'to_receive', label: '備貨中' },
  { key: 'shipped', label: '已出貨' },
  { key: 'delivered', label: '已送達' },
  { key: 'completed', label: '已完成' },
];
/** 尾巴狀態分頁：退貨中 / 已退貨 / 已換貨 / 已取消 —— 有這種訂單才出現，沒有就不佔位。 */
const OVERRIDE_TABS: Array<{ key: StatusTab; label: string }> = [
  { key: 'returning', label: '退貨中' },
  { key: 'returned', label: '已退貨' },
  { key: 'exchanged', label: '已換貨' },
  { key: 'cancelled', label: '已取消' },
];
// 狀態篩選改為兩個下拉：付款狀態（全部/待付款/已付款）+ 配送狀態，兩者獨立 AND
type PayFilter = 'all' | 'unpaid' | 'paid';
const payFilter = ref<PayFilter>('all');
const shipFilter = ref<StatusTab>('all');
/**
 * 進度狀態 tab 全部用包裹 currentStep 過濾，不再依賴 order.status
 * （避免 mock 資料 status 與包裹階段不一致時跑錯 tab）。
 * 只要訂單有任一包裹 currentStep 命中即列入。
 */
const TIMELINE_TABS: Record<string, TimelineStepKey> = {
  unpaid: 'unpaid',
  to_ship: 'to_ship',
  shipped: 'shipped',
  to_receive: 'to_receive',
  delivered: 'delivered',
  completed: 'completed',
};

// 日期 / 搜尋（appliedXxx 為「按下查詢」後才更新的快照，
// 篩選邏輯只看 applied 值，輸入過程不會即時 refresh） */
const dateRange = ref<Array<Date | null>>([
  new Date('2026-01-06'),
  new Date('2026-02-04'),
]);
const keyword = ref('');
const appliedDateRange = ref<Array<Date | null>>([
  dateRange.value[0],
  dateRange.value[1],
]);
const appliedKeyword = ref('');
const handleApplyQuery = (): void => {
  appliedDateRange.value = [dateRange.value[0], dateRange.value[1]];
  appliedKeyword.value = keyword.value;
};

// 商品列子 tab（訂單提問已依規劃移除：智能客服尚未開發）
const detailTabs: Array<{ key: DetailTab; label: string }> = [
  { key: 'progress', label: '配送進度/明細' },
  { key: 'address', label: '更換地址' },
  { key: 'payment', label: '訂購/付款資訊' },
];

// Timeline 階段（5 階段，每階段帶 icon）
interface TimelineStep {
  key: TimelineStepKey;
  label: string;
  icon: string;
}
const TIMELINE_STEPS: TimelineStep[] = [
  { key: 'unpaid', label: '待付款', icon: 'pi-credit-card' },
  { key: 'to_ship', label: '待出貨', icon: 'pi-box' },
  { key: 'to_receive', label: '備貨中', icon: 'pi-box' },
  { key: 'shipped', label: '已出貨', icon: 'pi-truck' },
  { key: 'delivered', label: '已送達', icon: 'pi-check-circle' },
  { key: 'completed', label: '已完成', icon: 'pi-verified' },
];
/** 進度條專用：待付款不算配送進度，從待出貨開始計 */
const PROGRESS_STEPS = TIMELINE_STEPS.filter((s) => s.key !== 'unpaid');

const orders = computed(() => ordersStore.orders);

// ---- 電子發票證明聯 Dialog（點「線上列印」開啟） ---------------------------
const invoicePreviewOrder = ref<OrderRecord | null>(null);
const handleOpenInvoice = (order: OrderRecord): void => {
  invoicePreviewOrder.value = order;
};

// 發票狀態對應前台顯示：只有 issued 顯示「線上列印」按鈕，其餘顯示文字
const INVOICE_STATUS_LABEL: Record<
  Exclude<OrderRecord['invoiceStatus'], 'issued'>,
  string
> = {
  pending: '尚未開立',
  voided: '已作廢',
  none: '不開立',
};
const invoiceLabelOf = (order: OrderRecord): string =>
  INVOICE_STATUS_LABEL[
    order.invoiceStatus as Exclude<OrderRecord['invoiceStatus'], 'issued'>
  ] ?? '';
/** 是否為紙本發票（紙本無電子證明聯，開立後只顯示「已開立」文字，不提供線上列印）。 */
const isPaperInvoice = (order: OrderRecord): boolean =>
  order.invoice.includes('紙本');
/** 發票狀態顯示文字：issued → 已開立；其餘依 INVOICE_STATUS_LABEL。 */
const invoiceLabelDisplay = (order: OrderRecord): string =>
  order.invoiceStatus === 'issued' ? '已開立' : invoiceLabelOf(order);
/** 依訂單編號 hash 出一個看起來像發票號碼的字串（AB-12345678）。 */
const mockInvoiceNoOf = (order: OrderRecord): string => {
  const letters = 'ABCDEFGHJKLMNPRSTUV';
  const seed = Array.from(order.orderNo).reduce(
    (s, c) => s + c.charCodeAt(0),
    0,
  );
  const l1 = letters[seed % letters.length];
  const l2 = letters[(seed >> 3) % letters.length];
  const nums = String(100000000 + ((seed * 173) % 89999999)).slice(-8);
  return `${l1}${l2}-${nums}`;
};
/** 隨機碼 4 位（demo）。 */
const mockRandomCodeOf = (order: OrderRecord): string => {
  const seed = Array.from(order.orderNo).reduce(
    (s, c) => s + c.charCodeAt(0),
    0,
  );
  return String(1000 + ((seed * 47) % 9000));
};
const handlePrintInvoice = (): void => {
  window.print();
};

/** 套用日期區間 + 關鍵字後的訂單（不含 status tab 過濾）— 給 tab 數字 + filteredOrders 共用 */
const dateKeywordFilteredOrders = computed(() => {
  let list = orders.value;
  const [from, to] = appliedDateRange.value;
  if (from || to) {
    const fromTs = from
      ? new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
      : -Infinity;
    const toTs = to
      ? new Date(
          to.getFullYear(),
          to.getMonth(),
          to.getDate(),
          23,
          59,
          59,
        ).getTime()
      : Infinity;
    list = list.filter((o) => {
      const d = parseSlashDate(o.date);
      return d ? d.getTime() >= fromTs && d.getTime() <= toTs : true;
    });
  }
  const k = appliedKeyword.value.trim().toLowerCase();
  if (k) {
    list = list.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(k) ||
        o.id.toLowerCase().includes(k) ||
        o.items.some((it) => it.name.toLowerCase().includes(k)),
    );
  }
  return list;
});

const OVERRIDE_KEYS: OverrideStatus[] = [
  'returning',
  'returned',
  'exchanged',
  'cancelled',
];

/** 單筆訂單是否符合某配送狀態 key（沿用原進度 / 終點貨態判定）。 */
const matchesStatusKey = (o: OrderRecord, key: StatusTab): boolean => {
  if (key === 'all') return true;
  if (OVERRIDE_KEYS.includes(key as OverrideStatus))
    return o.overrideStatus === key;
  const timelineStep = TIMELINE_TABS[key];
  if (timelineStep) {
    return (
      !o.overrideStatus &&
      o.items.some((it) =>
        it.packages.some((p) => p.currentStep === timelineStep),
      )
    );
  }
  return !o.overrideStatus && o.status === key;
};

/** 付款狀態是否符合（已付款＝非待付款，含 paying / paid / refund…）。 */
const matchesPay = (o: OrderRecord, pf: PayFilter): boolean => {
  if (pf === 'all') return true;
  const unpaid = payStatusOf(o) === 'unpaid';
  return pf === 'unpaid' ? unpaid : !unpaid;
};

/** 依付款篩選後的清單（配送狀態選項計數的母體）。 */
const payFilteredOrders = computed(() =>
  dateKeywordFilteredOrders.value.filter((o) => matchesPay(o, payFilter.value)),
);
/** 最終清單：付款 AND 配送。 */
const filteredOrders = computed(() =>
  payFilteredOrders.value.filter((o) => matchesStatusKey(o, shipFilter.value)),
);

const payCount = (pf: PayFilter) =>
  dateKeywordFilteredOrders.value.filter((o) => matchesPay(o, pf)).length;
/** 配送各狀態數量（在目前付款篩選範圍內計）。 */
const shipCount = (key: StatusTab) =>
  payFilteredOrders.value.filter((o) => matchesStatusKey(o, key)).length;

/** 付款狀態下拉選項：全部 / 待付款 / 已付款。 */
const paymentFilterOptions = computed(() => [
  {
    label: `全部 (${dateKeywordFilteredOrders.value.length})`,
    value: 'all' as PayFilter,
  },
  { label: `待付款 (${payCount('unpaid')})`, value: 'unpaid' as PayFilter },
  { label: `已付款 (${payCount('paid')})`, value: 'paid' as PayFilter },
]);
/** 配送狀態下拉選項：全部 + 進度狀態（待出貨…已完成）+ 有資料的終點貨態。 */
const deliveryFilterOptions = computed(() => [
  { label: `全部 (${shipCount('all')})`, value: 'all' as StatusTab },
  ...statusTabs
    .filter((t) => t.key !== 'all' && t.key !== 'unpaid')
    .map((t) => ({ label: `${t.label} (${shipCount(t.key)})`, value: t.key })),
  ...OVERRIDE_TABS.filter((t) => shipCount(t.key) > 0).map((t) => ({
    label: `${t.label} (${shipCount(t.key)})`,
    value: t.key,
  })),
]);

const stepStatus = (
  pkg: PackageInfo,
  stepKey: TimelineStep['key'],
): 'done' | 'current' | 'pending' => {
  const order = TIMELINE_STEPS.findIndex((s) => s.key === pkg.currentStep);
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === stepKey);
  if (idx < order) return 'done';
  if (idx === order) return 'current';
  return 'pending';
};

/** 蒐集 order 內所有包裹的 currentStep。 */
const allPackageSteps = (order: OrderRecord): TimelineStep['key'][] => {
  const steps: TimelineStep['key'][] = [];
  order.items.forEach((it) => {
    it.packages.forEach((p) => steps.push(p.currentStep));
  });
  return steps;
};

/** 終點貨態顯示文字。 */
const OVERRIDE_LABEL: Record<OverrideStatus, string> = {
  returning: '退貨中',
  returned: '已退貨',
  exchanged: '已換貨',
  cancelled: '已取消',
};
/** 終點貨態語意色（配送狀態欄 / 權益膠囊用）。 */
const OVERRIDE_TONE_CLASS: Record<OverrideStatus, string> = {
  returning: 'text-orange-600',
  returned: 'text-slate-500',
  exchanged: 'text-emerald-600',
  cancelled: 'text-red-500',
};

/** 訂單狀態：終點貨態優先；否則看包裹 currentStep（不同階段 → 處理中）。 */
const orderDisplayStatus = (order: OrderRecord): string => {
  if (order.overrideStatus) return OVERRIDE_LABEL[order.overrideStatus];
  const steps = allPackageSteps(order);
  const uniq = new Set(steps);
  if (uniq.size === 0) return '—';
  if (uniq.size > 1) return '處理中';
  return TIMELINE_STEPS.find((s) => s.key === steps[0])?.label ?? '—';
};
/** 配送狀態欄的語意色 class；一般進度狀態回傳空字串（沿用主色樣式）。 */
const orderStatusToneClass = (order: OrderRecord): string =>
  order.overrideStatus ? OVERRIDE_TONE_CLASS[order.overrideStatus] : '';

// ── 付款狀態（與商家後台同一套用字；取代發票欄位，緊接付款方式之後）──
const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  unpaid: '待付款',
  paying: '付款中',
  paid: '已付款',
  failed: '付款失敗',
  refund_pending: '待退款',
  refunded: '已退款',
};
const PAY_STATUS_CLASS: Record<PayStatus, string> = {
  unpaid: 'text-amber-600',
  paying: 'text-violet-600',
  paid: 'text-emerald-600',
  failed: 'text-red-500',
  refund_pending: 'text-amber-600',
  refunded: 'text-slate-500',
};
/** 付款狀態：未指定時依貨態推預設（待付款 → unpaid，其餘視為已付款）。 */
const payStatusOf = (order: OrderRecord): PayStatus =>
  order.payStatus ?? (order.status === 'unpaid' ? 'unpaid' : 'paid');

// ── 權益膠囊：展開後顯示「狀態 · 可退/可取消/可換」對照文案 ──
const RIGHTS_BANNER: Record<string, string> = {
  待付款: '可取消，不可退換貨',
  待出貨: '可取消，不可退換貨',
  備貨中: '不可取消、不可退換貨',
  已出貨: '可退貨，不可取消、不可換貨',
  已送達: '可退貨、可換貨，不可取消',
  已完成: '不可取消，如需退換貨請洽賣家',
  處理中: '各包裹階段不同，權益依各包裹狀態判斷',
  退貨中: '退貨處理中，請洽賣家',
  已退貨: '這筆訂單已退貨結案',
  已換貨: '換貨已完成',
  已取消: '訂單已由賣家取消',
};
const rightsBannerOf = (order: OrderRecord): string =>
  RIGHTS_BANNER[orderDisplayStatus(order)] ?? '';

/** 商品狀態：同 item 所有包裹同階段 → 顯示該階段；不同 → 「處理中」。 */
const itemDisplayStatus = (item: OrderItem): string => {
  if (item.packages.length === 0) return '—';
  const uniq = new Set(item.packages.map((p) => p.currentStep));
  if (uniq.size > 1) return '處理中';
  return (
    TIMELINE_STEPS.find((s) => s.key === item.packages[0].currentStep)?.label ??
    '—'
  );
};

/**
 * 動作可否：依包裹階段判斷
 * - shipped / to_receive：可退貨
 * - delivered：可換貨、可退貨
 * - completed：皆不可
 */
const canRefundStep = (step: TimelineStep['key']): boolean => {
  return step === 'shipped' || step === 'to_receive' || step === 'delivered';
};
const canExchangeStep = (step: TimelineStep['key']): boolean => {
  return step === 'delivered';
};

/** 任一包裹可退貨 / 換貨 → 整筆可操作 */
const orderCanReturnOrExchange = (order: OrderRecord): boolean => {
  return allPackageSteps(order).some(
    (s) => canRefundStep(s) || canExchangeStep(s),
  );
};

/** 不能退換貨時的原因文案：`{狀態}訂單，無法退換貨` */
const returnReasonText = (order: OrderRecord): string => {
  if (orderCanReturnOrExchange(order)) return '';
  return `${orderDisplayStatus(order)}訂單，無法退換貨`;
};

/** 更換配送地址階段：僅「待付款」可改；待出貨（含）起即進入出貨流程鎖定。 */
const canChangeAddressStep = (step: TimelineStep['key']): boolean => {
  return step === 'unpaid';
};
/** 整筆訂單是否可更換地址：無終點貨態、且所有包裹都還在待付款。 */
const orderCanChangeAddress = (order: OrderRecord): boolean => {
  if (order.overrideStatus) return false;
  const steps = allPackageSteps(order);
  return steps.length > 0 && steps.every(canChangeAddressStep);
};

/** 手機版狀態 chip：根據 currentStep 給對應 icon。 */
const stepIcon = (key: TimelineStep['key']): string => {
  return TIMELINE_STEPS.find((s) => s.key === key)?.icon ?? 'pi-circle';
};

/** 進度條百分比：currentStep 在 PROGRESS_STEPS 的位置 / (總數 - 1)。 */
const stepProgressPct = (key: TimelineStep['key']): number => {
  const idx = PROGRESS_STEPS.findIndex((s) => s.key === key);
  if (idx === -1) return 0;
  return Math.round((idx / (PROGRESS_STEPS.length - 1)) * 100);
};
const stepIndex = (key: TimelineStep['key']): number => {
  return PROGRESS_STEPS.findIndex((s) => s.key === key) + 1;
};

/** 取得第一個包裹的當前狀態（給手機版緊湊卡顯示用） */
const firstPackage = (item: OrderItem): PackageInfo => {
  return item.packages[0] ?? { no: '', qty: 0, currentStep: 'unpaid' };
};

/** PrimeVue Timeline 用的資料：每筆 step 附帶 status / time / icon。 */
interface TimelineRow {
  key: TimelineStep['key'];
  label: string;
  icon: string;
  time: string;
  status: 'done' | 'current' | 'pending';
}
const timelineFor = (pkg: PackageInfo, order?: OrderRecord): TimelineRow[] => {
  const rows = PROGRESS_STEPS.map((s) => {
    const status = stepStatus(pkg, s.key);
    return {
      key: s.key,
      label: s.label,
      icon: s.icon,
      // 未亮燈（pending）的階段尚未發生 → 不顯示時間
      time: status === 'pending' ? '' : (pkg.stepTimes?.[s.key] ?? '—'),
      status,
    };
  });
  // 退貨中 / 已退貨 / 已換貨：前四格保持已達成（貨確實送到過），
  // 最後一格換成該終點貨態 —— 與商家後台的呈現一致。
  const ov = order?.overrideStatus;
  if (ov && ov !== 'cancelled') {
    rows.forEach((r) => {
      r.status = 'done';
      if (!r.time) r.time = pkg.stepTimes?.[r.key] ?? '—';
    });
    const last = rows[rows.length - 1];
    last.label = OVERRIDE_LABEL[ov];
    last.icon = 'pi-sync';
    last.status = 'current';
  }
  return rows;
};

/** 手機版緊湊卡的階段名稱：終點貨態優先顯示。 */
const pkgDisplayLabel = (pkg: PackageInfo, order: OrderRecord): string => {
  if (order.overrideStatus && order.overrideStatus !== 'cancelled')
    return OVERRIDE_LABEL[order.overrideStatus];
  return TIMELINE_STEPS.find((s) => s.key === pkg.currentStep)?.label ?? '—';
};

// ── 更換配送地址 / 更換門市 dialog ──
const isChangeAddressVisible = ref(false);
const changeAddressMode = ref<'home' | 'store'>('home');
const isStoreDelivery = (order: OrderRecord): boolean =>
  order.delivery === '超商取貨';
const handleOpenChangeAddress = (order: OrderRecord): void => {
  changeAddressMode.value = isStoreDelivery(order) ? 'store' : 'home';
  isChangeAddressVisible.value = true;
};

// ── 退換貨申請 dialog ──
const RETURN_REASONS = [
  '商品瑕疵 / 破損',
  '尺寸不合 / 規格錯誤',
  '與商品描述不符',
];
const RETURN_NOTE_MAX = 30;
type ReturnType = 'return' | 'exchange';
const RETURN_TYPE_OPTIONS: Array<{ label: string; value: ReturnType }> = [
  { label: '退貨', value: 'return' },
  { label: '換貨', value: 'exchange' },
];
const isReturnDialogVisible = ref(false);
const returnTargetItem = ref<OrderItem | null>(null);
const returnType = ref<ReturnType>('return');
const returnReason = ref<string | null>(null);
const returnNote = ref('');
const isReturnApplied = (item: OrderItem): boolean => !!item.returnStatus;

/** 退換貨狀態 → 按鈕文字（未申請時為空，由 v-if 決定顯示原始「退換貨」） */
const returnStatusLabel = (item: OrderItem): string => {
  if (item.returnStatus === 'pending') return '退換貨申請中';
  if (item.returnStatus === 'approved') return '申請通過';
  if (item.returnStatus === 'rejected') return '退換貨申請駁回';
  return '退換貨';
};
/** 退換貨狀態 → PrimeVue Button severity */
const returnStatusSeverity = (
  item: OrderItem,
): 'success' | 'danger' | 'secondary' => {
  if (item.returnStatus === 'approved') return 'success';
  if (item.returnStatus === 'rejected') return 'danger';
  if (item.returnStatus === 'pending') return 'secondary';
  return 'danger';
};

/** 商品是否可退換貨：任一包裹的 currentStep 落在可退/換貨階段（shipped / delivered） */
const itemCanReturnOrExchange = (item: OrderItem): boolean =>
  item.packages.some(
    (p) => canRefundStep(p.currentStep) || canExchangeStep(p.currentStep),
  );
/** 目前退換貨對象是否可「換貨」：僅「已送達」可換貨（任一包裹 currentStep 為 delivered）。 */
const returnTargetCanExchange = computed<boolean>(() =>
  (returnTargetItem.value?.packages ?? []).some((p) =>
    canExchangeStep(p.currentStep),
  ),
);

const handleOpenReturnDialog = (item: OrderItem): void => {
  returnTargetItem.value = item;
  returnType.value = 'return';
  returnReason.value = null;
  returnNote.value = '';
  isReturnDialogVisible.value = true;
};

// ── 退換貨駁回原因 dialog ──
const isRejectReasonDialogVisible = ref(false);
const rejectReasonTargetItem = ref<OrderItem | null>(null);
const handleOpenRejectReasonDialog = (item: OrderItem): void => {
  rejectReasonTargetItem.value = item;
  isRejectReasonDialogVisible.value = true;
};

// ── 退換貨通過後聯絡賣家 dialog ──
const isApprovedContactDialogVisible = ref(false);
const approvedContactTargetItem = ref<OrderItem | null>(null);
const handleOpenApprovedContactDialog = (item: OrderItem): void => {
  approvedContactTargetItem.value = item;
  isApprovedContactDialogVisible.value = true;
};

/** 統一的退換貨按鈕點擊入口：駁回 → 顯示原因；通過 → 聯絡賣家；其他 → 走原本申請 dialog */
const handleReturnButtonClick = (item: OrderItem): void => {
  if (item.returnStatus === 'rejected') {
    handleOpenRejectReasonDialog(item);
    return;
  }
  if (item.returnStatus === 'approved') {
    handleOpenApprovedContactDialog(item);
    return;
  }
  handleOpenReturnDialog(item);
};

const handleSubmitReturn = (): void => {
  if (!returnReason.value) return;
  if (returnTargetItem.value) {
    returnTargetItem.value.returnStatus = 'pending';
  }
  ui.toast(
    `${returnType.value === 'return' ? '退貨' : '換貨'}申請已送出（示意）`,
  );
  isReturnDialogVisible.value = false;
};

/** 已送達訂單：買家確認完成 → 包裹推進 completed、狀態轉已完成。 */
const handleCompleteOrder = (order: OrderRecord): void => {
  ordersStore.completeOrder(order.id);
  ui.toast('訂單已完成');
};

/**
 * 手機版 Select 用：選到攔截型 tab（payment）後要把 Select 視覺重置回原本選項。
 * PrimeVue Select 即使 :model-value 為單向綁定，內部仍可能 cache 顯示值；
 * bump 這個 key 強制 remount 才會重讀 model-value。
 */
const inquirySelectKey = ref(0);

// ── 訂購/付款資訊 dialog ──
const isPaymentInfoDialogVisible = ref(false);
const paymentInfoTargetOrder = ref<OrderRecord | null>(null);

// ── 金額明細 dialog（由訂單總額旁「明細」開啟）──
const isAmountDialogVisible = ref(false);
const amountTargetOrder = ref<OrderRecord | null>(null);
const handleOpenAmountDialog = (order: OrderRecord): void => {
  amountTargetOrder.value = order;
  isAmountDialogVisible.value = true;
};
/** 金額明細列：依 amounts 動態組出，無折抵的列自動略過（負值＝折抵）。 */
const amountRows = computed(() => {
  const a = amountTargetOrder.value?.amounts;
  if (!a) return [];
  const rows: { label: string; value: number; isDiscount: boolean }[] = [];
  rows.push({ label: '商品小計', value: a.goodsTotal, isDiscount: false });
  if (a.bulkDiscount)
    rows.push({ label: '買多優惠', value: -a.bulkDiscount, isDiscount: true });
  if (a.couponDiscount)
    rows.push({
      label: a.couponName ? `優惠券（${a.couponName}）` : '優惠券折抵',
      value: -a.couponDiscount,
      isDiscount: true,
    });
  if (a.rewardPointsUsed)
    rows.push({
      label: `紅利折抵（${a.rewardPointsUsed} 點）`,
      value: -a.rewardPointsUsed,
      isDiscount: true,
    });
  if (a.shippingFee)
    rows.push({ label: '運費', value: a.shippingFee, isDiscount: false });
  if (a.shippingDiscount)
    rows.push({
      label: '運費折抵',
      value: -a.shippingDiscount,
      isDiscount: true,
    });
  return rows;
});

// ── 物流配送進度 dialog ──
interface ShippingTrackingEvent {
  status: string;
  time: string;
  carrier: string;
  note: string;
}
const SHIPPING_TRACKING_EVENTS: ShippingTrackingEvent[] = [
  {
    status: '貨件送達',
    time: '2026/02/10 08:00',
    carrier: '○○超商',
    note: '簽收',
  },
  { status: '配送中', time: '2026/02/10 01:00', carrier: '新竹物流', note: '' },
  {
    status: '轉運作業中',
    time: '2026/02/09 16:00',
    carrier: '高轉',
    note: '貨件到站',
  },
  { status: '取件完成', time: '2026/02/09 13:00', carrier: '直營', note: '' },
];
const isShippingProgressDialogVisible = ref(false);
const shippingProgressTargetPkg = ref<PackageInfo | null>(null);
const handleOpenShippingProgress = (pkg: PackageInfo): void => {
  shippingProgressTargetPkg.value = pkg;
  isShippingProgressDialogVisible.value = true;
};

/**
 * 攔截 detail tab 切換：
 * - 'payment' → 不切換 tab，改開訂購/付款資訊 dialog
 * - 其他 tab → 正常切換
 */
const handleSelectDetailTab = (order: OrderRecord, key: DetailTab): void => {
  if (key === 'payment') {
    paymentInfoTargetOrder.value = order;
    isPaymentInfoDialogVisible.value = true;
    inquirySelectKey.value++;
    return;
  }
  order.detailTab = key;
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 篩選卡：頁籤 + 日期/搜尋 + 結果摘要（購物權益與售後說明區塊已依規劃移除） -->
    <div class="shadow-card flex flex-col gap-4 rounded-xl bg-white p-4">
      <!-- 狀態篩選：付款狀態 + 配送狀態（可各自選、兩者 AND）；面板全展開不卷軸 -->
      <div class="flex flex-col gap-3 sm:flex-row">
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <label class="text-xs text-slate-500">付款狀態</label>
          <Select
            v-model="payFilter"
            :options="paymentFilterOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :pt="{ listContainer: { style: 'max-height: none' } }"
          />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <label class="text-xs text-slate-500">配送狀態</label>
          <Select
            v-model="shipFilter"
            :options="deliveryFilterOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :pt="{ listContainer: { style: 'max-height: none' } }"
          />
        </div>
      </div>

      <!-- 日期 + 搜尋 -->
      <div
        class="flex gap-3"
        :class="isMobile ? 'flex-col' : 'flex-row items-center'"
      >
        <div
          class="flex flex-col gap-1.5"
          :class="isMobile ? 'w-full' : 'w-[420px]'"
        >
          <span class="text-sm font-medium text-slate-700">訂單日期</span>
          <DatePicker
            v-model="dateRange"
            selection-mode="range"
            show-icon
            date-format="yy/mm/dd"
            placeholder="YYYY/MM/DD - YYYY/MM/DD"
            class="w-full"
          />
        </div>
        <div class="flex flex-1 flex-col gap-1.5">
          <span v-if="!isMobile" class="text-sm font-medium text-slate-700"
            >&nbsp;</span
          >
          <div class="flex gap-2">
            <InputText
              v-model="keyword"
              placeholder="請輸入訂單ID或商品名稱"
              class="min-w-0 flex-1"
              @keyup.enter="handleApplyQuery"
            />
            <Button label="查詢" class="shrink-0" @click="handleApplyQuery" />
          </div>
        </div>
      </div>

      <!-- 結果摘要 -->
      <p class="text-sm text-slate-500">
        你的查詢結果是
        <span class="font-medium text-slate-700">{{
          formatDateRange(dateRange)
        }}</span>
        共找到
        <span class="font-bold" style="color: var(--primary)">{{
          filteredOrders.length
        }}</span>
        筆訂單
      </p>
    </div>

    <!-- 訂單卡列表 -->
    <div class="flex flex-col gap-5">
      <article
        v-for="order in filteredOrders"
        :key="order.id"
        class="overflow-hidden rounded-lg border border-slate-200 bg-white"
      >
        <!-- Header table：手機卡片堆疊；其他用 table 兩列（header + data） -->
        <div
          v-if="isMobile"
          class="grid grid-cols-2 gap-y-2 p-3 text-sm"
          style="background: color-mix(in srgb, var(--primary) 8%, transparent)"
        >
          <div>
            <p class="text-xs text-slate-500">訂單日期</p>
            <p class="font-medium text-slate-700">{{ order.date }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">訂單編號</p>
            <p class="font-medium text-slate-700">{{ order.orderNo }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">數量</p>
            <p class="font-medium text-slate-700">{{ order.qty }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">訂單總額</p>
            <div class="flex items-center gap-1">
              <p class="font-bold" style="color: var(--danger)">
                {{ money(order.total) }}
              </p>
              <!-- 金額明細：眼睛圖示（與金額同列，灰色）-->
              <Button
                v-if="order.amounts"
                icon="pi pi-eye"
                text
                rounded
                size="small"
                severity="secondary"
                aria-label="金額明細"
                @click="handleOpenAmountDialog(order)"
              />
            </div>
          </div>
          <div>
            <p class="text-xs text-slate-500">付款方式</p>
            <p class="font-medium text-slate-700">{{ order.payment }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">付款狀態</p>
            <p
              class="font-medium"
              :class="PAY_STATUS_CLASS[payStatusOf(order)]"
            >
              {{ PAY_STATUS_LABEL[payStatusOf(order)] }}
            </p>
          </div>
          <div>
            <p class="text-xs text-slate-500">配送方式</p>
            <p class="font-medium text-slate-700">{{ order.delivery }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">配送狀態</p>
            <p
              class="font-medium"
              :class="orderStatusToneClass(order)"
              :style="
                order.overrideStatus ? undefined : 'color: var(--primary)'
              "
            >
              {{ orderDisplayStatus(order) }}
            </p>
          </div>
        </div>

        <table v-else class="w-full table-fixed text-sm">
          <thead>
            <tr
              style="
                background: color-mix(in srgb, var(--primary) 8%, transparent);
              "
            >
              <th class="py-2.5 pr-3 pl-4 text-left font-medium text-slate-700">
                訂單日期
              </th>
              <th class="px-3 py-2.5 text-left font-medium text-slate-700">
                訂單編號
              </th>
              <th
                class="px-3 py-2.5 text-left font-medium text-slate-700"
                style="width: 70px"
              >
                數量
              </th>
              <th
                class="px-3 py-2.5 text-left font-medium text-slate-700"
                style="width: 150px"
              >
                訂單總額
              </th>
              <th
                class="px-3 py-2.5 text-left font-medium text-slate-700"
                style="width: 110px"
              >
                付款方式
              </th>
              <th
                class="px-3 py-2.5 text-left font-medium text-slate-700"
                style="width: 90px"
              >
                付款狀態
              </th>
              <th
                class="px-3 py-2.5 text-left font-medium text-slate-700"
                style="width: 95px"
              >
                配送方式
              </th>
              <th
                class="py-2.5 pr-4 pl-3 text-left font-medium text-slate-700"
                style="width: 95px"
              >
                配送狀態
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="py-3 pr-3 pl-4 text-slate-700">{{ order.date }}</td>
              <td class="px-3 py-3 text-slate-700">{{ order.orderNo }}</td>
              <td class="px-3 py-3 text-slate-700">{{ order.qty }}</td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-1">
                  <span class="font-bold" style="color: var(--danger)">
                    {{ money(order.total) }}
                  </span>
                  <!-- 金額明細：眼睛圖示（與金額同列，灰色）-->
                  <Button
                    v-if="order.amounts"
                    icon="pi pi-eye"
                    text
                    rounded
                    size="small"
                    severity="secondary"
                    aria-label="金額明細"
                    @click="handleOpenAmountDialog(order)"
                  />
                </div>
              </td>
              <td class="px-3 py-3 text-slate-700">{{ order.payment }}</td>
              <td
                class="px-3 py-3 font-medium"
                :class="PAY_STATUS_CLASS[payStatusOf(order)]"
              >
                {{ PAY_STATUS_LABEL[payStatusOf(order)] }}
              </td>
              <td class="px-3 py-3 text-slate-700">{{ order.delivery }}</td>
              <td
                class="py-3 pr-4 pl-3 font-medium"
                :class="orderStatusToneClass(order)"
                :style="
                  order.overrideStatus ? undefined : 'color: var(--primary)'
                "
              >
                {{ orderDisplayStatus(order) }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 已送達 → 買家可「確認完成」，訂單轉為已完成 -->
        <div
          v-if="orderDisplayStatus(order) === '已送達'"
          class="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3"
        >
          <span class="text-sm text-slate-500">已收到商品了嗎？</span>
          <Button
            label="確認完成"
            size="small"
            class="shrink-0"
            @click="handleCompleteOrder(order)"
          />
        </div>

        <!-- 買家備註（結帳時留言給賣家）；有填才顯示 -->
        <div
          v-if="order.buyerNote"
          class="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 text-sm"
        >
          <span class="text-xs text-slate-500">訂單備註</span>
          <p class="break-words whitespace-pre-wrap text-slate-700">
            {{ order.buyerNote }}
          </p>
        </div>

        <!-- 子 tab：手機改用 Select 下拉、其他用橫式 tabs -->
        <div class="border-b border-slate-200">
          <template v-if="isMobile">
            <!-- 展開 / 收合：全寬橫條按鈕 -->
            <button
              class="flex min-h-11 w-full items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
              :aria-expanded="order.expanded"
              @click="order.expanded = !order.expanded"
            >
              <span>{{
                order.expanded ? '收合訂單明細' : '查看訂單明細'
              }}</span>
              <i
                :class="[
                  'pi',
                  order.expanded ? 'pi-chevron-up' : 'pi-chevron-down',
                  'text-slate-500',
                ]"
                style="font-size: 14px"
              />
            </button>
            <!-- 子 tab Select + 動作按鈕：展開時才顯示 -->
            <div
              v-if="order.expanded"
              class="flex flex-col gap-2 border-t border-slate-200 px-4 py-2"
            >
              <Select
                :key="`detail-tab-${order.id}-${inquirySelectKey}`"
                :model-value="order.detailTab"
                :options="detailTabs"
                option-label="label"
                option-value="key"
                class="w-full"
                @update:model-value="(key) => handleSelectDetailTab(order, key)"
              />
              <!-- 更換地址 tab：全寬「更換配送地址」按鈕；備貨中之後不可改 -->
              <Button
                v-if="order.detailTab === 'address'"
                label="更換配送地址"
                outlined
                class="w-full"
                :disabled="!orderCanChangeAddress(order)"
                @click="handleOpenChangeAddress(order)"
              />
            </div>
          </template>
          <div v-else class="flex items-center gap-2 px-4">
            <!-- 收合 / 展開 -->
            <button
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              :aria-label="order.expanded ? '收合明細' : '展開明細'"
              @click="order.expanded = !order.expanded"
            >
              <i
                :class="[
                  'pi',
                  order.expanded ? 'pi-chevron-up' : 'pi-chevron-down',
                ]"
                style="font-size: 14px"
              ></i>
            </button>
            <div class="flex-1 scrollbar-none overflow-x-auto">
              <div class="flex items-center gap-1">
                <button
                  v-for="dt in detailTabs"
                  :key="dt.key"
                  class="-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
                  :style="
                    order.detailTab === dt.key &&
                    dt.key !== 'inquiry' &&
                    dt.key !== 'payment'
                      ? 'color: var(--primary); border-color: var(--primary)'
                      : 'color: var(--text-muted); border-color: transparent'
                  "
                  @click="handleSelectDetailTab(order, dt.key)"
                >
                  {{ dt.label }}
                </button>
              </div>
            </div>
            <!-- 更換地址 tab：右側「更換配送地址」按鈕；備貨中之後不可改 -->
            <Button
              v-if="order.detailTab === 'address'"
              label="更換配送地址"
              outlined
              size="small"
              class="shrink-0"
              :disabled="!orderCanChangeAddress(order)"
              @click="handleOpenChangeAddress(order)"
            />
          </div>
        </div>

        <!-- 商品列 + 多包裹 timeline；收合時整段隱藏 -->
        <div v-if="order.expanded" class="flex flex-col">
          <!-- 權益膠囊：狀態 · 可退 / 可取消 / 可換 對照文案 -->
          <div
            v-if="rightsBannerOf(order)"
            class="flex flex-wrap items-center gap-1.5 px-4 pt-3"
          >
            <span class="text-xs text-slate-400">開發備註：</span>
            <span
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
              :class="
                order.overrideStatus === 'cancelled'
                  ? 'border-red-200 bg-red-50'
                  : 'border-slate-200 bg-slate-50'
              "
            >
              <span
                class="font-medium"
                :class="orderStatusToneClass(order)"
                :style="
                  order.overrideStatus ? undefined : 'color: var(--primary)'
                "
                >{{ orderDisplayStatus(order) }}</span
              >
              <span class="text-slate-300">·</span>
              <span class="text-slate-600">{{ rightsBannerOf(order) }}</span>
            </span>
          </div>

          <!-- 已取消：取消說明卡（時間 / 原因），不再顯示包裹進度 -->
          <div
            v-if="order.overrideStatus === 'cancelled'"
            class="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm"
          >
            <p class="flex items-center gap-1.5 font-medium text-red-600">
              <i class="pi pi-exclamation-triangle" style="font-size: 13px" />
              此訂單已取消
            </p>
            <p class="mt-1.5 text-slate-700">
              取消時間：{{ order.cancelTime ?? '—' }}
            </p>
            <p class="text-slate-700">
              取消原因：{{ order.cancelReason ?? '—' }}
            </p>
            <p class="mt-2 border-t border-red-200 pt-2 text-xs text-slate-500">
              此訂單不再出貨；若已付款，賣家將另行為您辦理退款。
            </p>
          </div>

          <!-- 退換貨 tab：不可退/換貨時顯示原因 -->
          <div
            v-if="order.detailTab === 'return' && returnReasonText(order)"
            class="px-4 py-4 text-sm text-slate-950"
          >
            {{ returnReasonText(order) }}
          </div>

          <div
            v-for="(item, ii) in order.items"
            v-show="!(order.detailTab === 'return' && returnReasonText(order))"
            :key="ii"
            class="px-4 py-4"
            :class="
              ii !== order.items.length - 1 ? 'border-b border-slate-100' : ''
            "
          >
            <!-- 商品 row -->
            <div class="mb-3 flex items-start gap-3">
              <div
                class="h-[48px] w-[48px] shrink-0 overflow-hidden rounded-md bg-slate-100"
              >
                <ProductImage :src="item.image" :alt="item.name" size="sm" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="line-clamp-1 text-sm leading-snug text-slate-700">
                  <Tag
                    v-if="item.isAddOn"
                    value="加購"
                    class="!mr-1.5 !border !border-slate-300 !bg-transparent !py-[1px] !align-middle !text-xs !font-normal !text-slate-500"
                  />
                  <Tag
                    v-if="item.isBundle"
                    value="組合"
                    class="!mr-1.5 !border !border-slate-300 !bg-transparent !py-[1px] !align-middle !text-xs !font-normal !text-slate-500"
                  />
                  {{ item.name }}
                </p>
                <p class="mt-1 text-xs text-slate-500">{{ item.spec }}</p>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-2">
                <p class="text-sm font-bold text-slate-950">
                  {{ money(item.price) }} / {{ item.qty }}件
                </p>
                <!-- 退換貨 tab + 商品可退換貨 → 顯示按鈕；申請後依 returnStatus 顯示 申請中 / 通過 / 駁回 -->
                <!-- 駁回可再點按查看原因；申請中 / 通過為 disabled 唯讀 -->
                <Button
                  v-if="
                    order.detailTab === 'return' &&
                    itemCanReturnOrExchange(item) &&
                    !returnReasonText(order)
                  "
                  :label="returnStatusLabel(item)"
                  :severity="returnStatusSeverity(item)"
                  :disabled="item.returnStatus === 'pending'"
                  outlined
                  size="small"
                  @click="handleReturnButtonClick(item)"
                />
              </div>
            </div>

            <!-- 組合商品內容（唯讀）：外框卡 + 浮貼「組合商品」標籤，比照購物車 -->
            <div
              v-if="item.isBundle && item.bundleItems?.length"
              class="mb-3 ml-15"
            >
              <div
                class="relative rounded-lg border border-slate-200 bg-slate-50 p-3 pt-4"
              >
                <span
                  class="absolute top-0 left-3 -translate-y-1/2 bg-white px-2 py-0.5 text-xs font-medium text-slate-600"
                >
                  組合商品
                </span>
                <ul class="flex flex-col gap-2.5">
                  <li
                    v-for="(b, bi) in item.bundleItems"
                    :key="bi"
                    class="flex items-center gap-2.5"
                  >
                    <div
                      class="h-9 w-9 shrink-0 overflow-hidden rounded bg-slate-100"
                    >
                      <ProductImage :src="b.image" :alt="b.name" size="sm" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="line-clamp-1 text-xs text-slate-700">
                        {{ b.name }}
                      </p>
                      <p class="mt-0.5 text-xs text-slate-400">{{ b.spec }}</p>
                    </div>
                    <span class="shrink-0 text-xs text-slate-500"
                      >×{{ b.qty }}</span
                    >
                  </li>
                </ul>
              </div>
            </div>

            <!-- 包裹卡（一或多個）— 僅在「配送進度/明細」tab 顯示；已取消訂單改顯示取消說明卡 -->
            <div
              v-if="
                order.detailTab === 'progress' &&
                order.overrideStatus !== 'cancelled'
              "
              class="flex flex-col gap-3"
            >
              <div
                v-for="pkg in item.packages"
                :key="pkg.no"
                class="rounded-[10px] px-4 py-2"
                style="background: var(--surface-100)"
              >
                <!-- Package header：待付款階段尚未配箱，不顯示包裹編號 -->
                <div class="mb-1.5 flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-sm text-slate-700">
                    <i class="pi pi-box" style="font-size: 14px"></i>
                    <span
                      v-if="pkg.currentStep !== 'unpaid'"
                      class="font-medium"
                      >包裹編號：{{ pkg.no }}</span
                    >
                    <span v-else class="text-slate-500">尚未配箱</span>
                    <!-- 換貨後的第二次出貨標籤 -->
                    <Tag
                      v-if="pkg.exchangeTag"
                      :value="pkg.exchangeTag"
                      class="!border !border-emerald-300 !bg-emerald-50 !py-[1px] !text-xs !font-normal !text-emerald-700"
                    />
                  </div>
                  <span class="text-sm text-slate-700">{{ pkg.qty }}件</span>
                </div>

                <!-- 手機版緊湊 -->
                <div v-if="isMobile" class="rounded-md bg-white p-3">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <div class="flex min-w-0 items-center gap-2.5">
                      <span
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                        style="background: var(--primary)"
                      >
                        <i
                          :class="`pi ${stepIcon(pkg.currentStep)}`"
                          style="font-size: 14px"
                        ></i>
                      </span>
                      <div class="min-w-0">
                        <p
                          class="text-sm leading-tight font-bold"
                          style="color: var(--primary)"
                        >
                          {{ pkgDisplayLabel(pkg, order) }}
                        </p>
                        <p class="mt-0.5 text-xs leading-tight text-slate-500">
                          {{ pkg.stepTimes?.[pkg.currentStep] ?? '—' }}
                        </p>
                      </div>
                    </div>
                    <span
                      v-if="pkg.currentStep !== 'unpaid'"
                      class="shrink-0 text-xs font-bold"
                      style="color: var(--primary)"
                    >
                      {{ stepIndex(pkg.currentStep) }} /
                      {{ PROGRESS_STEPS.length }}
                    </span>
                  </div>
                  <div
                    v-if="pkg.currentStep !== 'unpaid'"
                    class="h-1.5 overflow-hidden rounded-full bg-slate-200"
                  >
                    <div
                      class="h-full rounded-full transition-all"
                      :style="{
                        width:
                          (order.overrideStatus
                            ? 100
                            : stepProgressPct(pkg.currentStep)) + '%',
                        background: 'var(--primary)',
                      }"
                    ></div>
                  </div>
                  <!-- 進入配送階段才顯示「查看配送進度」連結 -->
                  <a
                    v-if="
                      pkg.currentStep === 'shipped' ||
                      pkg.currentStep === 'to_receive' ||
                      pkg.currentStep === 'delivered' ||
                      pkg.currentStep === 'completed'
                    "
                    class="mt-2 inline-block cursor-pointer text-xs hover:underline"
                    style="color: var(--danger)"
                    @click="handleOpenShippingProgress(pkg)"
                    >查看配送進度</a
                  >
                </div>

                <!-- 非手機橫式（PrimeVue Timeline） -->
                <div v-else>
                  <Timeline
                    :value="timelineFor(pkg, order)"
                    layout="horizontal"
                    align="top"
                    class="my-order-timeline"
                  >
                    <template #marker="{ item: step }">
                      <span
                        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                        :style="
                          step.status === 'pending'
                            ? 'background: #cbd5e1'
                            : 'background: var(--primary)'
                        "
                      >
                        <i
                          :class="`pi ${step.icon}`"
                          style="font-size: 13px"
                        ></i>
                      </span>
                    </template>
                    <template #opposite="{ item: step }">
                      <p
                        class="pr-3 pb-1.5 text-xs whitespace-nowrap"
                        :style="
                          step.status === 'pending'
                            ? 'color: #cbd5e1'
                            : 'color: var(--text-muted)'
                        "
                      >
                        {{ step.time }}
                      </p>
                    </template>
                    <template #content="{ item: step }">
                      <div class="flex flex-col pt-1.5 pr-3">
                        <p
                          class="text-sm font-medium whitespace-nowrap"
                          :style="
                            step.status === 'pending'
                              ? 'color: #94a3b8'
                              : 'color: var(--primary)'
                          "
                        >
                          {{ step.label }}
                          <a
                            v-if="
                              step.key === 'shipped' &&
                              step.status !== 'pending'
                            "
                            class="cursor-pointer text-xs hover:underline"
                            style="color: var(--danger)"
                            @click="handleOpenShippingProgress(pkg)"
                            >(查看配送進度)</a
                          >
                        </p>
                      </div>
                    </template>
                    <template #connector="{ index }">
                      <span
                        class="block h-0.5 w-full"
                        :style="
                          (timelineFor(pkg, order)[index + 1]?.status ??
                            'pending') === 'pending'
                            ? 'background: #cbd5e1'
                            : 'background: var(--primary)'
                        "
                      ></span>
                    </template>
                  </Timeline>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- 更換配送地址 dialog -->
    <ChangeAddressDialog
      v-model:visible="isChangeAddressVisible"
      :mode="changeAddressMode"
    />

    <!-- 退換貨申請 dialog -->
    <Dialog
      v-model:visible="isReturnDialogVisible"
      modal
      :draggable="false"
      header="退換貨申請"
      :breakpoints="{ '768px': '90vw' }"
      :style="{ width: '640px' }"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">商品名稱</label>
          <p class="line-clamp-1 text-sm text-slate-950">
            {{ returnTargetItem?.name }}
          </p>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700">申請類型</label>
          <div class="flex items-center gap-6">
            <div
              v-for="opt in RETURN_TYPE_OPTIONS"
              :key="opt.value"
              class="flex items-center gap-2 text-sm text-slate-700"
            >
              <RadioButton
                v-model="returnType"
                :value="opt.value"
                :input-id="`return-type-${opt.value}`"
                :disabled="opt.value === 'exchange' && !returnTargetCanExchange"
              />
              <label
                :for="`return-type-${opt.value}`"
                class="cursor-pointer"
                :class="
                  opt.value === 'exchange' && !returnTargetCanExchange
                    ? 'cursor-not-allowed text-slate-400'
                    : ''
                "
              >
                {{ opt.label }}
                <span
                  v-if="opt.value === 'exchange' && !returnTargetCanExchange"
                  class="text-xs text-slate-400"
                >
                  （僅已送達可換貨）
                </span>
              </label>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">
            {{ returnType === 'return' ? '退貨原因' : '換貨原因' }}
          </label>
          <Select
            v-model="returnReason"
            :options="RETURN_REASONS"
            :placeholder="`請選擇${returnType === 'return' ? '退貨' : '換貨'}原因`"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-700">備註</label>
          <InputText
            v-model="returnNote"
            :maxlength="RETURN_NOTE_MAX"
            class="w-full"
          />
          <p class="text-xs text-slate-500">
            最多可輸入 {{ RETURN_NOTE_MAX }} 個字
          </p>
        </div>
      </div>
      <template #footer>
        <Button
          label="取消"
          severity="secondary"
          outlined
          @click="isReturnDialogVisible = false"
        />
        <Button
          label="確認提交申請"
          :disabled="!returnReason"
          @click="handleSubmitReturn"
        />
      </template>
    </Dialog>

    <!-- 退換貨申請駁回原因 dialog -->
    <Dialog
      v-model:visible="isRejectReasonDialogVisible"
      modal
      :draggable="false"
      header="退換貨申請駁回"
      :breakpoints="{ '768px': '90vw' }"
      :style="{ width: '480px' }"
    >
      <div class="flex flex-col gap-4 text-sm">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">商品名稱</span>
          <span class="text-slate-950">
            {{ rejectReasonTargetItem?.name }}
          </span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">駁回原因</span>
          <p class="leading-relaxed text-slate-950">
            {{ rejectReasonTargetItem?.returnRejectReason ?? '—' }}
          </p>
        </div>
      </div>
      <template #footer>
        <Button
          label="關閉"
          severity="secondary"
          outlined
          @click="isRejectReasonDialogVisible = false"
        />
      </template>
    </Dialog>

    <!-- 退換貨申請通過：聯絡賣家 dialog -->
    <Dialog
      v-model:visible="isApprovedContactDialogVisible"
      modal
      :draggable="false"
      header="退換貨申請通過"
      :breakpoints="{ '768px': '90vw' }"
      :style="{ width: '480px' }"
    >
      <div class="flex flex-col gap-4 text-sm">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">商品名稱</span>
          <span class="text-slate-950">
            {{ approvedContactTargetItem?.name }}
          </span>
        </div>
        <div
          class="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-emerald-700"
        >
          <i class="pi pi-check-circle mt-0.5 shrink-0" />
          <p class="leading-relaxed">
            您的退換貨申請已通過，請聯絡賣家安排寄回 / 換貨物流事宜。
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-xs font-medium text-slate-500">賣家聯絡資訊</span>
          <div class="flex items-center gap-2.5">
            <i class="pi pi-phone shrink-0" style="color: var(--primary)" />
            <span class="text-slate-700">客服電話：</span>
            <a
              href="tel:0800000000"
              class="font-medium hover:underline"
              style="color: var(--primary)"
              >0800-000-000</a
            >
          </div>
          <div class="flex items-center gap-2.5">
            <i class="pi pi-envelope shrink-0" style="color: var(--primary)" />
            <span class="text-slate-700">客服信箱：</span>
            <a
              href="mailto:service@xsmartlive.com"
              class="font-medium hover:underline"
              style="color: var(--primary)"
              >service@xsmartlive.com</a
            >
          </div>
          <div class="flex items-center gap-2.5">
            <i class="pi pi-comments shrink-0" style="color: var(--primary)" />
            <span class="text-slate-700">官方 LINE：</span>
            <span class="font-medium" style="color: var(--primary)"
              >@xsmartlive</span
            >
          </div>
          <div class="flex items-start gap-2.5">
            <i
              class="pi pi-clock mt-0.5 shrink-0"
              style="color: var(--primary)"
            />
            <span class="text-slate-700">服務時間：</span>
            <span class="text-slate-700">週一至週五 09:00 – 18:00</span>
          </div>
        </div>
      </div>
      <template #footer>
        <Button
          label="關閉"
          severity="secondary"
          outlined
          @click="isApprovedContactDialogVisible = false"
        />
      </template>
    </Dialog>

    <!-- 訂購/付款資訊 dialog -->
    <Dialog
      v-model:visible="isPaymentInfoDialogVisible"
      modal
      :draggable="false"
      header="訂購/付款資訊"
      :breakpoints="{ '768px': '90vw' }"
      :style="{ width: '480px' }"
    >
      <div class="flex flex-col gap-4 text-sm">
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">收件人姓名</span>
          <span class="text-slate-950">*曉*</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">手機號碼</span>
          <span class="text-slate-950">0912***789</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">收件地址</span>
          <span class="text-slate-950">高雄市三民區北平一街103號</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">發票類型</span>
          <span class="text-slate-950">
            {{ paymentInfoTargetOrder?.invoice ?? '個人發票（紙本）' }}
          </span>
        </div>
        <!-- 發票（列表的發票欄已由付款狀態取代，線上列印入口移到這裡） -->
        <div
          v-if="
            paymentInfoTargetOrder &&
            paymentInfoTargetOrder.invoiceStatus !== 'none'
          "
          class="flex flex-col gap-1"
        >
          <span class="text-xs text-slate-500">發票</span>
          <div>
            <Button
              v-if="
                paymentInfoTargetOrder.invoiceStatus === 'issued' &&
                !isPaperInvoice(paymentInfoTargetOrder)
              "
              label="線上列印"
              outlined
              size="small"
              class="!py-1"
              @click="handleOpenInvoice(paymentInfoTargetOrder)"
            />
            <span v-else class="text-slate-500">
              {{ invoiceLabelDisplay(paymentInfoTargetOrder) }}
            </span>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-slate-500">付款方式</span>
          <span class="text-slate-950">
            {{ paymentInfoTargetOrder?.payment ?? '線上信用卡' }}
          </span>
        </div>
      </div>
    </Dialog>

    <!-- 金額明細 dialog（由訂單總額旁「明細」開啟）-->
    <Dialog
      v-model:visible="isAmountDialogVisible"
      modal
      :draggable="false"
      dismissable-mask
      header="金額明細"
      :breakpoints="{ '768px': '92vw' }"
      :style="{ width: '420px' }"
    >
      <div class="flex flex-col gap-2 text-sm">
        <div
          v-for="(row, ri) in amountRows"
          :key="ri"
          class="flex items-center justify-between"
        >
          <span class="text-slate-600">{{ row.label }}</span>
          <span :class="row.isDiscount ? 'text-red-500' : 'text-slate-950'">
            {{ row.isDiscount ? `-${money(-row.value)}` : money(row.value) }}
          </span>
        </div>
        <div
          class="mt-1 flex items-center justify-between border-t border-slate-100 pt-3"
        >
          <span class="font-medium text-slate-950">實付金額</span>
          <span class="text-base font-bold" style="color: var(--primary)">
            {{ money(amountTargetOrder?.total ?? 0) }}
          </span>
        </div>
      </div>
    </Dialog>

    <!-- 物流配送進度 dialog -->
    <Dialog
      v-model:visible="isShippingProgressDialogVisible"
      modal
      :draggable="false"
      header="物流配送進度"
      :breakpoints="{ '768px': '90vw' }"
      :style="{ width: '720px' }"
    >
      <div class="flex flex-col gap-4">
        <!-- 配送方式 / 出貨單號 -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-slate-500">配送方式</span>
            <span class="text-slate-950">新竹物流</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs text-slate-500">出貨單號</span>
            <span class="text-slate-950">{{
              shippingProgressTargetPkg?.no ?? '—'
            }}</span>
          </div>
        </div>

        <!-- 物流追蹤表 -->
        <div class="overflow-x-auto">
          <table class="w-full table-auto text-sm">
            <thead>
              <tr class="border-b border-slate-200">
                <th
                  class="px-3 py-2.5 text-left font-medium text-slate-700"
                  style="width: 25%"
                >
                  狀態
                </th>
                <th
                  class="px-3 py-2.5 text-left font-medium text-slate-700"
                  style="width: 28%"
                >
                  處理時間
                </th>
                <th
                  class="px-3 py-2.5 text-left font-medium text-slate-700"
                  style="width: 22%"
                >
                  負責單位
                </th>
                <th class="px-3 py-2.5 text-left font-medium text-slate-700">
                  備註
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(ev, idx) in SHIPPING_TRACKING_EVENTS"
                :key="idx"
                :class="idx % 2 === 1 ? 'bg-slate-50' : ''"
              >
                <td class="px-3 py-3 text-slate-950">{{ ev.status }}</td>
                <td class="px-3 py-3 text-slate-700">{{ ev.time }}</td>
                <td class="px-3 py-3 text-slate-700">{{ ev.carrier }}</td>
                <td class="px-3 py-3 text-slate-700">{{ ev.note }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>

    <!-- 電子發票證明聯 Dialog：點「線上列印」開啟 -->
    <Dialog
      :visible="!!invoicePreviewOrder"
      modal
      :draggable="false"
      dismissable-mask
      header="電子發票證明聯"
      :style="{ width: '480px' }"
      :breakpoints="{ '768px': '92vw' }"
      @update:visible="(v) => !v && (invoicePreviewOrder = null)"
    >
      <div v-if="invoicePreviewOrder" class="flex flex-col gap-4">
        <!-- 發票標頭 -->
        <div
          class="rounded-lg border border-dashed border-slate-400 bg-slate-50 px-4 py-3"
        >
          <p class="text-center text-xs text-slate-500">
            財政部電子發票整合服務平台
          </p>
          <p
            class="mt-1 text-center text-2xl font-bold tracking-widest text-slate-900"
          >
            {{ mockInvoiceNoOf(invoicePreviewOrder) }}
          </p>
          <p class="mt-0.5 text-center text-xs text-slate-500">
            發票日期：{{ invoicePreviewOrder.date }}
          </p>
        </div>

        <!-- 賣 / 買方 -->
        <div class="grid grid-cols-2 gap-3 text-xs text-slate-700">
          <div>
            <p class="text-slate-500">賣方統編</p>
            <p class="font-medium">12345678</p>
            <p class="text-slate-500">直播管家 xSmartLive 股份有限公司</p>
          </div>
          <div>
            <p class="text-slate-500">發票類型</p>
            <p class="font-medium">
              {{ invoicePreviewOrder.invoice || '個人發票（紙本）' }}
            </p>
          </div>
        </div>

        <!-- 明細 -->
        <div class="rounded-lg border border-slate-200">
          <div
            class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
          >
            <span>品名</span>
            <span class="text-right">數量</span>
            <span class="text-right">單價</span>
            <span class="text-right">小計</span>
          </div>
          <div
            v-for="(it, idx) in invoicePreviewOrder.items"
            :key="idx"
            class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-slate-100 px-3 py-2 text-xs text-slate-700 last:border-b-0"
          >
            <span class="truncate" :title="it.name">{{ it.name }}</span>
            <span class="text-right">{{ it.qty }}</span>
            <span class="text-right"> {{ money(it.price) }} </span>
            <span class="text-right">
              {{ money(it.price * it.qty) }}
            </span>
          </div>
        </div>

        <!-- 金額 -->
        <div class="flex justify-end gap-6 text-sm">
          <div class="text-right text-slate-500">
            <p>銷售額（未稅）</p>
            <p>營業稅（5%）</p>
            <p class="font-bold text-slate-900">總計</p>
          </div>
          <div class="text-right text-slate-700">
            <p>
              {{ money(Math.round(invoicePreviewOrder.total / 1.05)) }}
            </p>
            <p>
              {{
                money(
                  invoicePreviewOrder.total -
                    Math.round(invoicePreviewOrder.total / 1.05),
                )
              }}
            </p>
            <p class="font-bold" style="color: var(--primary)">
              {{ money(invoicePreviewOrder.total) }}
            </p>
          </div>
        </div>

        <!-- 隨機碼 / 訂單編號 -->
        <div
          class="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500"
        >
          隨機碼：{{ mockRandomCodeOf(invoicePreviewOrder) }}
          <span class="mx-2">·</span>
          訂單編號：{{ invoicePreviewOrder.orderNo }}
        </div>
      </div>
      <template #footer>
        <Button
          label="關閉"
          severity="secondary"
          outlined
          @click="invoicePreviewOrder = null"
        />
        <Button label="列印" icon="pi pi-print" @click="handlePrintInvoice" />
      </template>
    </Dialog>

    <!-- 訂單提問 drawer 已依規劃移除（智能客服尚未開發） -->
  </div>
</template>
