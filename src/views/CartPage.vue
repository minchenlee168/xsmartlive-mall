<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import {
  useCartStore,
  type CartGroup,
  type CartItem,
  type CartBundleItem,
} from '../pinia/cart';
import { useUiStore } from '../pinia/ui';
import { useViewportStore } from '../pinia/viewport';
import { products } from '../data/products';
import { burstAddToCartFromEvent } from '../utils/cart-burst';

/** 單一規格維度（顏色 / 尺寸 / 口味 之類）。 */
interface AddOnSpec {
  label: string;
  options: string[];
}
interface AddOnProduct {
  id: number;
  name: string;
  price: number;
  original?: number;
  image: string;
  /** 預設規格（沒有 specs 時使用） */
  spec?: string;
  /** 規格維度清單；長度 >=2 → header 顯示「規格」、送出時各維度用「, 」串接 */
  specs?: AddOnSpec[];
}

// 加價購：商城分類頁沒有、僅在購物車推薦的加價商品
const ADD_ON_PRODUCTS: AddOnProduct[] = [
  {
    id: 9001,
    name: '寶寶嬰兒紗布手帕 5 入組',
    price: 89,
    original: 150,
    image:
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
    // 兩個規格維度示範：顏色 + 尺寸 → header 會顯示「規格」
    specs: [
      { label: '顏色', options: ['粉色', '藍色', '黃色'] },
      { label: '尺寸', options: ['S', 'M', 'L'] },
    ],
  },
  {
    id: 9002,
    name: '寶寶柔嫩濕紙巾 80 抽 / 包',
    price: 49,
    original: 80,
    image:
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&fit=crop',
  },
  {
    id: 9003,
    name: '不鏽鋼防滑安撫奶嘴',
    price: 129,
    original: 200,
    image:
      'https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=400&fit=crop',
    specs: [{ label: '尺寸', options: ['S', 'M', 'L'] }],
  },
  {
    id: 9004,
    name: '嬰兒安全電動指甲剪',
    price: 199,
    original: 320,
    image:
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&fit=crop',
  },
  {
    id: 9005,
    name: '寶寶副食品試吃綜合包',
    price: 99,
    original: 180,
    image:
      'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=400&fit=crop',
    specs: [{ label: '口味', options: ['蘋果口味', '香蕉口味', '南瓜口味'] }],
  },
  {
    id: 9006,
    name: '媽咪保溫水壺 500ml',
    price: 290,
    original: 480,
    image:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&fit=crop',
    specs: [{ label: '顏色', options: ['珍珠白', '玫瑰粉', '午夜藍'] }],
  },
];

// Livebuy 直播回放：第一張為「最新場次」大卡（有日期 + 時間），其餘為過往回放縮圖 + 時長
interface LiveReplay {
  id: string;
  title: string;
  duration?: string;
  isFeatured?: boolean;
  date?: string;
  time?: string;
  muted?: boolean;
}
const LIVE_REPLAYS: LiveReplay[] = [
  {
    id: 'lr1',
    title: '729',
    isFeatured: true,
    date: 'Jan 13, 2026',
    time: '14:24',
  },
  { id: 'lr2', title: '0707', duration: '06:18', muted: true },
  { id: 'lr3', title: '20260629', duration: '07:26', muted: true },
  { id: 'lr4', title: '0622', duration: '04:14', muted: true },
  { id: 'lr5', title: '0622', duration: '13:34', muted: true },
  { id: 'lr6', title: '0615', duration: '09:52', muted: true },
  { id: 'lr7', title: '0608', duration: '11:07', muted: true },
];

const router = useRouter();
const ui = useUiStore();
const cart = useCartStore();

const groups = computed(() => cart.groups);
/** 購物車頁只顯示「有商品」的購物車；加購區 picker 另有 allCarts 涵蓋全 mall */
const visibleGroups = computed(() =>
  groups.value.filter((g) => g.items.length > 0),
);
const isEmpty = computed(() => visibleGroups.value.length === 0);

// 圖片放大預覽
const isImagePreviewOpen = ref(false);
const previewImageSrc = ref<string | undefined>();
const previewImageAlt = ref<string>('');
const handleOpenImagePreview = (src: string | undefined, alt: string): void => {
  if (!src) return;
  previewImageSrc.value = src;
  previewImageAlt.value = alt;
  isImagePreviewOpen.value = true;
};
/** 是否命中買多優惠：qty 達 minQty。 */
const hasBulkDiscount = (item: CartItem): boolean =>
  !!item.bulkDiscount && item.qty >= item.bulkDiscount.minQty;

/** 商品目前實際單價（達門檻 → 折抵單價；否則 → 原價）。 */
const effectiveUnitPrice = (item: CartItem): number =>
  hasBulkDiscount(item) ? item.bulkDiscount!.unitPrice : item.price;

/** 商品折抵金額（達門檻才有）。 */
const bulkDiscountAmount = (item: CartItem): number =>
  hasBulkDiscount(item)
    ? (item.price - item.bulkDiscount!.unitPrice) * item.qty
    : 0;

/** 該商品在購物車顯示的主要金額：單價 × 數量（達門檻時單價已折抵）。 */
const lineDisplayTotal = (item: CartItem): number =>
  effectiveUnitPrice(item) * item.qty;

/** 對照用的原價總計（劃線用）：達買多優惠 → price × qty；否則 → original × qty。 */
const lineOriginalTotal = (item: CartItem): number => {
  if (hasBulkDiscount(item)) return item.price * item.qty;
  return (item.original ?? item.price) * item.qty;
};

const isGroupAllChecked = (group: CartGroup) =>
  group.items.length > 0 && group.items.every((i) => i.checked);

const toggleGroupAll = (group: CartGroup) => {
  const all = isGroupAllChecked(group);
  group.items.forEach((i) => {
    i.checked = !all;
  });
};

/** 全域全選：paused 的購物車不參與（無法結帳）。 */
const globalAllChecked = computed(() => {
  const candidates = groups.value.filter(
    (g) => isGroupCheckable(g) && g.items.length > 0,
  );
  return (
    candidates.length > 0 &&
    candidates.every((g) => g.items.every((i) => i.checked))
  );
});

const toggleGlobalAll = () => {
  const all = globalAllChecked.value;
  groups.value.forEach((g) => {
    if (!isGroupCheckable(g)) return;
    g.items.forEach((i) => {
      i.checked = !all;
    });
  });
};

const groupSubtotal = (group: CartGroup) =>
  group.items
    .filter((i) => i.checked)
    .reduce((s, i) => s + effectiveUnitPrice(i) * i.qty, 0);

const globalTotal = computed(() =>
  groups.value.reduce((s, g) => s + groupSubtotal(g), 0),
);
const checkedCount = computed(() =>
  groups.value.reduce((s, g) => s + g.items.filter((i) => i.checked).length, 0),
);

const removeItem = (group: CartGroup, id: string) => {
  cart.removeItem(group.id, id);
};

// ---- 結帳模式衍生行為 ------------------------------------------------------
const isDefaultMode = (g: CartGroup) => g.checkoutMode === 'default';
const isPickableMode = (g: CartGroup) => g.checkoutMode === 'pickable';
const isAbandonMode = (g: CartGroup) => g.checkoutMode === 'abandon';
const isPausedMode = (g: CartGroup) => g.checkoutMode === 'paused';
/** 群組層級是否可勾選（決定要不要把整台購物車納入結帳）；paused 以外都能。 */
const isGroupCheckable = (g: CartGroup) => !isPausedMode(g);
/** 商品層級是否可勾選（default 是「整台一起」不能單選；paused 也不行）。 */
const isItemCheckable = (g: CartGroup) => isPickableMode(g) || isAbandonMode(g);
/** 模式徽章：只有 default 需要顯示「禁止棄標」；其他模式不特別打 tag。 */
const modeBadgeOf = (
  g: CartGroup,
): {
  label: string;
  severity: 'info' | 'danger' | 'secondary' | 'success';
} | null => {
  if (isDefaultMode(g)) return { label: '禁止棄標', severity: 'danger' };
  return null;
};

/** 是否為任選組合（子品數量需由 user 在購物車挑選）。 */
const isPickBundleItem = (item: CartItem): boolean => {
  if (item.productId == null) return false;
  return !!products.find((p) => p.id === item.productId)?.isPickBundle;
};

/** 任選組合：當前所有子品已挑數量總和。 */
const pickedTotalOf = (item: CartItem): number =>
  (item.bundleItems ?? []).reduce((s, b) => s + (b.qty || 0), 0);

/** 組合商品子品是否缺規格或數量；用於顯示提示與阻擋結帳。
 *  任選組合：qty=0 代表「不挑這項」，是合法狀態；只在 qty>0 但缺規格時提示。 */
const subNeedsAttention = (sub: CartBundleItem, item?: CartItem): boolean => {
  if (item && isPickBundleItem(item)) {
    return sub.qty > 0 && !sub.spec;
  }
  return !sub.spec || sub.qty <= 0;
};

const bundleNeedsAttention = (item: CartItem): boolean => {
  if (!item.isBundle || !item.bundleItems) return false;
  const subIssue = item.bundleItems.some((s) => subNeedsAttention(s, item));
  if (isPickBundleItem(item)) {
    const cat = products.find((p) => p.id === item.productId);
    const need = (cat?.pickCount ?? 0) * item.qty;
    return (
      subIssue ||
      pickedTotalOf(item) !== need ||
      pickBundleOverSub(item) !== null
    );
  }
  return subIssue;
};

/** 任選組合：找出「單一子品超過限購」的子品；沒有 → null。 */
const pickBundleOverSub = (item: CartItem): CartBundleItem | null => {
  if (!isPickBundleItem(item)) return null;
  const cat = products.find((p) => p.id === item.productId);
  if (!cat?.pickOptions) return null;
  return (
    item.bundleItems?.find((sub) => {
      const opt = cat.pickOptions?.find((o) => o.name === sub.name);
      const maxPerSub = (opt?.maxQty ?? 10) * item.qty;
      return (sub.qty || 0) > maxPerSub;
    }) ?? null
  );
};

/**
 * 任選組合的警示訊息：優先講超過的細節，再講不足 / 待補齊規格。
 * 沒問題 → null；非任選組合 → 走通用「規格 / 數量未選」訊息。
 */
const bundleWarningMessage = (item: CartItem): string | null => {
  if (!item.isBundle || !item.bundleItems) return null;
  if (isPickBundleItem(item)) {
    const cat = products.find((p) => p.id === item.productId);
    const need = (cat?.pickCount ?? 0) * item.qty;
    const total = pickedTotalOf(item);
    const overSub = pickBundleOverSub(item);
    if (overSub) {
      const opt = cat?.pickOptions?.find((o) => o.name === overSub.name);
      const maxPerSub = (opt?.maxQty ?? 10) * item.qty;
      return `「${overSub.name}」限購 ${maxPerSub} 件，目前已選 ${overSub.qty} 件`;
    }
    if (total > need) {
      return `已超出上限：需選 ${need} 件，目前已選 ${total} 件`;
    }
    if (total < need) {
      return `需選擇 ${need} 件，目前已選 ${total} 件`;
    }
    // 數量剛好但某個子品有 qty>0 且缺規格
    if (item.bundleItems.some((s) => subNeedsAttention(s, item))) {
      return '部分品項尚未選擇規格';
    }
    return null;
  }
  return item.bundleItems.some((s) => subNeedsAttention(s, item))
    ? '此組合商品尚未選擇規格或數量'
    : null;
};

const subMissingText = (sub: CartBundleItem, item?: CartItem): string => {
  const isPick = !!(item && isPickBundleItem(item));
  const missing: string[] = [];
  if (!sub.spec && (!isPick || sub.qty > 0)) missing.push('規格');
  if (!isPick && sub.qty <= 0) missing.push('數量');
  return missing.length ? `請選擇${missing.join('與')}` : '';
};

/**
 * 查詢購物車組合商品子品在商品目錄中可選的規格清單：
 * - 固定組合：對應 `catalog.bundleItems[subIndex].specOptions`
 * - 任選組合：以子品名稱對應 `catalog.pickOptions[?].specOptions`
 * 找不到對應規格選項 → 回傳 null 代表不顯示下拉。
 */
const subSpecOptionsFor = (
  item: CartItem,
  sub: CartBundleItem,
  subIndex: number,
): string[] | null => {
  if (item.productId == null) return null;
  const cat = products.find((p) => p.id === item.productId);
  if (!cat) return null;
  if (cat.isPickBundle) {
    const opt = cat.pickOptions?.find((o) => o.name === sub.name);
    return opt?.specOptions?.length ? opt.specOptions : null;
  }
  const catSpec = cat.bundleItems?.[subIndex];
  return catSpec?.specOptions?.length ? catSpec.specOptions : null;
};

/** 直接從購物車修改子品規格 — v-model 用 setter 寫回 sub.spec。 */
const setSubSpec = (sub: CartBundleItem, value: string) => {
  sub.spec = value;
};

const setSubQty = (sub: CartBundleItem, value: number) => {
  sub.qty = value;
};

// 加價購：跟商品分類頁一樣，點按鈕跳 Dialog 選規格 + 數量。
/** 多維度規格的笛卡兒積：[[顏色A,顏色B], [尺寸S,尺寸M]] → ['顏色A, 尺寸S', '顏色A, 尺寸M', ...]。 */
const combinedSpecOptions = (p: AddOnProduct): string[] => {
  if (!p.specs?.length) return [];
  return p.specs.reduce<string[]>((acc, dim) => {
    if (acc.length === 0) return dim.options.slice();
    return acc.flatMap((prev) => dim.options.map((o) => `${prev}, ${o}`));
  }, []);
};

/** Dialog 狀態：目前正在挑規格的加購商品；null 表示 Dialog 關閉。 */
const addOnDialog = ref<AddOnProduct | null>(null);
const addOnDialogSpec = ref<string>('');
const addOnDialogQty = ref<number>(1);
/** 加購 Dialog 對應的購物車 id — 決定確認後加到哪台車。 */
const addOnDialogCartId = ref<number | null>(null);

const handleOpenAddOnDialog = (p: AddOnProduct, cartId: number) => {
  addOnDialog.value = p;
  addOnDialogCartId.value = cartId;
  addOnDialogSpec.value = combinedSpecOptions(p)[0] ?? p.spec ?? '預設';
  addOnDialogQty.value = 1;
};

// 加購區流程：先按「更多加購商品 N 件」→ 彈窗列出全商城購物車 → 選一台顯示該 cart 的加購區
/** 商城全部購物車清單（picker Dialog 列出所有 seed，不侷限於使用者已加購物的） */
const allCarts = computed(() => groups.value);
const isCartPickerVisible = ref(false);
/** 已選擇的加購目標 cart id；null 表示還在初始「按鈕」狀態。 */
const selectedAddOnCartId = ref<number | null>(null);
const selectedAddOnCart = computed(() =>
  groups.value.find((g) => g.id === selectedAddOnCartId.value),
);
/** 該 cart 的加購商品（依 addOnProductIds 篩 ADD_ON_PRODUCTS）。 */
/** 某台車的加購商品（依 addOnProductIds 篩 ADD_ON_PRODUCTS）。 */
const addOnsOfCart = (c: CartGroup): AddOnProduct[] =>
  (c.addOnProductIds ?? [])
    .map((id) => ADD_ON_PRODUCTS.find((p) => p.id === id))
    .filter((p): p is AddOnProduct => p != null);
/** 全部購物車的加購商品（跨車去重）— 給 header 顯示件數用。 */
const allAddOns = computed<AddOnProduct[]>(() =>
  [...new Set(allCarts.value.flatMap((g) => g.addOnProductIds ?? []))]
    .map((id) => ADD_ON_PRODUCTS.find((p) => p.id === id))
    .filter((p): p is AddOnProduct => p != null),
);
/** 某加購商品所屬的購物車（第一台列出它的車）— 全部檢視加購的目標車。 */
const ownerCartOf = (pid: number): CartGroup | undefined =>
  allCarts.value.find((g) => g.addOnProductIds?.includes(pid));
/**
 * 加購區顯示卡片：全部檢視 → 去重、各自對應其所屬車（不顯示車名）；
 * 選定車 → 該車商品、全部對應該車。每張卡都帶「加購時要進哪台車」。
 */
const addOnCards = computed<{ product: AddOnProduct; cartId: number }[]>(() => {
  const sel = selectedAddOnCart.value;
  if (sel)
    return addOnsOfCart(sel).map((product) => ({ product, cartId: sel.id }));
  return allAddOns.value.flatMap((product) => {
    const owner = ownerCartOf(product.id);
    return owner ? [{ product, cartId: owner.id }] : [];
  });
});
const handleOpenCartPicker = () => {
  isCartPickerVisible.value = true;
};
const handlePickAddOnCart = (cartId: number) => {
  selectedAddOnCartId.value = cartId;
  isCartPickerVisible.value = false;
};
const handleClearAddOnCart = () => {
  selectedAddOnCartId.value = null;
};

// 按下確認後短暫的綠色 ✓ 回饋（跟 ProductCard 同款，作用在卡片按鈕上）
/** 加購卡片唯一 key：同商品可能出現在多台車，需用「車 id + 商品 id」區分。 */
const addOnKey = (cartId: number, pid: number): string => `${cartId}-${pid}`;
const justAddedMap = ref<Record<string, boolean>>({});
const addedTimers = new Map<string, ReturnType<typeof setTimeout>>();
const flashAddedFor = (key: string) => {
  justAddedMap.value[key] = true;
  const prev = addedTimers.get(key);
  if (prev) clearTimeout(prev);
  addedTimers.set(
    key,
    setTimeout(() => {
      justAddedMap.value[key] = false;
      addedTimers.delete(key);
    }, 1500),
  );
};
onUnmounted(() => {
  addedTimers.forEach((t) => clearTimeout(t));
  addedTimers.clear();
});

const vp = computed(() => useViewportStore().current.id);
const isPC = computed(() => vp.value === 'pc');
/** 直播回放 Carousel 每頁張數：手機 2 / 平板 3 / PC 5 */
const replayPerView = computed(() =>
  vp.value === 'mobile' ? 2 : vp.value === 'tablet' ? 3 : 5,
);
const handleGoReplay = (r: LiveReplay) => {
  ui.toast(`回放「${r.title}」尚未開放（示意）`);
};

const handleConfirmAddOn = (e: MouseEvent) => {
  const p = addOnDialog.value;
  if (!p) return;
  const spec = addOnDialogSpec.value || p.spec || '預設';
  const qty = Math.max(1, addOnDialogQty.value || 1);
  cart.addItem(
    {
      id: p.id,
      name: p.name,
      price: p.price,
      original: p.original,
      image: p.image,
    },
    spec,
    qty,
    // 加購區：進「該商品所屬那台車」（Dialog 開啟時記錄）且置頂；沒有才走預設分派
    addOnDialogCartId.value != null
      ? { targetCartId: addOnDialogCartId.value, prepend: true }
      : undefined,
  );
  burstAddToCartFromEvent(e);
  flashAddedFor(addOnKey(addOnDialogCartId.value ?? -1, p.id));
  addOnDialog.value = null;
  // 加購場景使用者已在購物車頁，不需要「點此結帳 / 繼續購物」二次跳轉；改用 toast 就好
  ui.toast(`已加入「${p.name}」`);
};

const handleGoCheckout = () => {
  // 已勾選的組合商品若有未選規格 / 數量 → 阻擋並提示（訊息由 bundleWarningMessage 給細節）
  const incompleteBundle = groups.value
    .flatMap((g) => g.items)
    .find((i) => i.checked && bundleNeedsAttention(i));
  if (incompleteBundle) {
    const msg = bundleWarningMessage(incompleteBundle) ?? '尚未選擇規格或數量';
    ui.toast(`「${incompleteBundle.name}」${msg}`, 'warn');
    return;
  }
  // 暫停結帳的購物車若不小心還有勾選商品 → 阻擋（正常流程 UI 已擋，這裡是最後防線）
  const pausedWithChecked = groups.value.find(
    (g) => isPausedMode(g) && g.items.some((i) => i.checked),
  );
  if (pausedWithChecked) {
    ui.toast(`「${pausedWithChecked.sellerName}」暫停結帳中，無法下單`, 'warn');
    return;
  }
  router.push('/checkout');
};

const handleGoProduct = (productId?: number) => {
  if (productId != null) router.push(`/product/${productId}`);
};
</script>

<template>
  <div class="flex min-h-screen flex-col" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <!-- Page header -->
    <div>
      <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-[22px]">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          class="!min-h-11 !min-w-11"
          @click="router.push('/shop')"
        />
        <h1 class="text-xl font-bold text-slate-950 @7xl:text-2xl">購物車</h1>
      </div>
    </div>

    <!-- Empty state -->
    <main
      v-if="isEmpty"
      class="mx-auto flex min-h-[400px] w-full max-w-7xl flex-1 flex-col items-center justify-center"
      style="padding: var(--page-pad-y) var(--page-pad-x)"
    >
      <div class="flex flex-col items-center gap-4">
        <div class="relative">
          <i
            class="pi pi-shopping-cart text-slate-500"
            style="font-size: 96px"
          />
          <span
            class="absolute left-1/2 -translate-x-1/2 font-black text-slate-800 select-none"
            style="top: 8%; font-size: 44px"
          >
            ?
          </span>
        </div>
        <p class="text-base text-slate-500">購物車內無任何商品</p>
      </div>
    </main>

    <!-- Content -->
    <main
      v-else
      class="mx-auto flex w-full max-w-7xl flex-1 flex-col px-[var(--page-pad-x)] pb-[var(--page-pad-y)] @7xl:px-0"
      style="gap: var(--stack-gap)"
    >
      <div
        v-for="group in visibleGroups"
        :key="group.id"
        class="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)]"
      >
        <!-- Group header：全選 checkbox（取代圓點）+ 店家名稱 + tag + 模式徽章 -->
        <div
          class="cart-divider flex flex-wrap items-center gap-2 px-[var(--card-pad)] py-[var(--card-pad)] @3xl:gap-3"
        >
          <Checkbox
            v-if="isGroupCheckable(group)"
            :model-value="isGroupAllChecked(group)"
            binary
            :input-id="'grp-' + group.id"
            aria-label="全選此店家所有商品"
            @update:model-value="toggleGroupAll(group)"
          />
          <label
            :for="'grp-' + group.id"
            class="max-w-full cursor-pointer truncate text-base font-bold text-slate-950 @3xl:text-[17.5px]"
          >
            {{ group.sellerName }}
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <Tag
              v-for="tag in group.tags"
              :key="tag.label"
              :value="tag.label"
              :severity="tag.type"
            />
            <Tag
              v-if="modeBadgeOf(group)"
              :value="modeBadgeOf(group)!.label"
              :severity="modeBadgeOf(group)!.severity"
            />
          </div>
        </div>

        <!-- 模式提示 banner：paused / abandon 額外補說明；default 由「禁止棄標」tag 表達 -->
        <div
          v-if="isPausedMode(group)"
          class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-[var(--card-pad)] py-2 text-sm text-amber-700"
        >
          <i class="pi pi-pause-circle" />
          <span>此購物車暫停結帳中，僅供瀏覽 / 加購。</span>
        </div>
        <div
          v-else-if="isAbandonMode(group)"
          class="flex items-center gap-2 border-b border-red-100 bg-red-50 px-[var(--card-pad)] py-2 text-xs text-red-700"
        >
          <i class="pi pi-flag" />
          <span>直播 / 團購棄標流程：可放棄先前喊下的品項以釋出庫存。</span>
        </div>

        <!-- Items -->
        <div
          v-for="(item, ii) in group.items"
          :key="item.id"
          :class="ii !== group.items.length - 1 ? 'cart-divider' : ''"
        >
          <!-- Item row -->
          <div
            class="flex items-start gap-3 px-[var(--card-pad)] py-[var(--card-pad)] @7xl:gap-4"
          >
            <!-- Checkbox + 圖片：default 是整台一起、paused 不能結帳，都不顯示 item 勾選 -->
            <div class="flex shrink-0 items-center gap-3 @7xl:gap-4">
              <Checkbox
                v-if="isItemCheckable(group)"
                v-model="item.checked"
                binary
              />
              <button
                type="button"
                class="aspect-square w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-lg @3xl:w-20 @7xl:w-[100px]"
                :aria-label="`放大圖片：${item.name}`"
                @click="handleOpenImagePreview(item.image, item.name)"
              >
                <ProductImage :src="item.image" :alt="item.name" size="md" />
              </button>
            </div>

            <!-- Info：左側商品資訊 + 右側價格/刪除 -->
            <div class="flex min-w-0 flex-1 items-start gap-3 @7xl:gap-4">
              <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                <p
                  class="line-clamp-2 text-base font-bold text-slate-950"
                  :class="
                    item.productId != null
                      ? 'cursor-pointer transition-colors hover:text-[color:var(--primary)]'
                      : ''
                  "
                  @click="handleGoProduct(item.productId)"
                >
                  {{ item.name }}
                </p>
                <div
                  v-if="item.spec && item.spec !== '預設'"
                  class="text-sm text-slate-600"
                >
                  規格 {{ item.spec }}
                </div>
                <div class="flex items-center gap-3 text-sm">
                  <span class="text-slate-600">數量</span>
                  <InputNumber
                    v-model="item.qty"
                    :min="1"
                    :disabled="isPausedMode(group)"
                    show-buttons
                    button-layout="horizontal"
                    increment-button-icon="pi pi-plus"
                    decrement-button-icon="pi pi-minus"
                    class="qty-stepper"
                  />
                </div>
                <!-- 買多優惠提示 -->
                <div
                  v-if="item.bulkDiscount"
                  class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
                  :class="
                    hasBulkDiscount(item)
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700'
                  "
                >
                  <i class="pi pi-tag text-[10px]" />
                  <span>{{ item.bulkDiscount.note }}</span>
                  <span v-if="hasBulkDiscount(item)" class="font-medium">
                    · 已折抵 -${{ bulkDiscountAmount(item).toLocaleString() }}
                  </span>
                </div>
              </div>

              <!-- Right column：NTD 價格（上）+ 刪除（下） -->
              <div class="flex shrink-0 flex-col items-end gap-2">
                <div class="flex flex-col items-end gap-0.5">
                  <template v-if="hasBulkDiscount(item)">
                    <Tag
                      value="已達買多優惠"
                      severity="success"
                      class="!py-0.5 !text-[10px]"
                    />
                    <span
                      class="text-xs whitespace-nowrap text-slate-500 line-through"
                    >
                      ${{ lineOriginalTotal(item).toLocaleString() }}
                    </span>
                    <span
                      class="text-base leading-none font-bold whitespace-nowrap @7xl:text-lg"
                      style="color: var(--primary)"
                    >
                      NTD ${{ lineDisplayTotal(item).toLocaleString() }}
                    </span>
                  </template>
                  <template v-else>
                    <span
                      class="text-base leading-none font-bold whitespace-nowrap @7xl:text-lg"
                      style="color: var(--primary)"
                    >
                      NTD ${{ lineDisplayTotal(item).toLocaleString() }}
                    </span>
                    <span
                      v-if="item.original"
                      class="text-xs whitespace-nowrap text-slate-500 line-through"
                    >
                      ${{ lineOriginalTotal(item).toLocaleString() }}
                    </span>
                  </template>
                </div>
                <Button
                  v-if="!isDefaultMode(group)"
                  label="刪除"
                  icon="pi pi-trash"
                  severity="secondary"
                  outlined
                  size="small"
                  class="!min-h-8 !px-2 !py-1"
                  @click="removeItem(group, item.id)"
                />
              </div>
            </div>
          </div>

          <!-- 商品備註：跟在商品列下方，若有 note 才顯示 -->
          <div
            v-if="item.note"
            class="mx-[var(--card-pad)] mb-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700"
          >
            <i class="pi pi-info-circle mt-0.5 shrink-0" />
            <span class="min-w-0">
              <span class="font-medium">商品備註：</span>{{ item.note }}
            </span>
          </div>

          <!-- Bundle 組合商品 -->
          <div v-if="item.isBundle" class="px-[var(--card-pad)] pt-2 pb-4 pl-9">
            <div
              class="relative rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <!-- 標題：靠左 -->
              <button
                class="absolute top-0 left-3 flex -translate-y-1/2 items-center gap-1.5 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:text-[var(--primary)]"
                @click="item.bundleExpanded = !item.bundleExpanded"
              >
                <i
                  class="pi text-[10px]"
                  :class="item.bundleExpanded ? 'pi-minus' : 'pi-plus'"
                />
                <span>組合商品</span>
              </button>

              <!-- 未選 / 超選提示 banner：訊息由 bundleWarningMessage() 依情境給 -->
              <div
                v-if="item.bundleExpanded && bundleWarningMessage(item)"
                class="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500"
              >
                <i class="pi pi-exclamation-triangle text-base" />
                <span>{{ bundleWarningMessage(item) }}</span>
              </div>

              <!-- Sub-items grid：一律兩欄 -->
              <!-- 部分限購（任選組合）：一行一件；固定組合：兩欄 -->
              <div
                v-if="item.bundleExpanded"
                class="grid gap-3"
                :class="
                  isPickBundleItem(item)
                    ? 'grid-cols-1'
                    : 'grid-cols-1 @3xl:grid-cols-2'
                "
              >
                <div
                  v-for="(sub, si) in item.bundleItems"
                  :key="si"
                  class="flex items-start gap-3"
                >
                  <button
                    type="button"
                    class="aspect-square w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-lg bg-slate-200 @3xl:w-20 @7xl:w-[100px]"
                    :aria-label="`放大圖片：${sub.name}`"
                    @click="handleOpenImagePreview(sub.image, sub.name)"
                  >
                    <ProductImage :src="sub.image" :alt="sub.name" size="md" />
                  </button>
                  <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <p class="truncate text-base font-semibold text-slate-700">
                      {{ sub.name }}
                    </p>
                    <p
                      v-if="subNeedsAttention(sub, item)"
                      class="text-sm font-medium text-red-500"
                    >
                      {{ subMissingText(sub, item) }}
                    </p>
                    <!-- 規格：catalog 有 specOptions → 內嵌 Select 可改；否則顯示文字 -->
                    <template v-if="subSpecOptionsFor(item, sub, si)">
                      <div
                        class="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <span class="shrink-0">規格</span>
                        <Select
                          :model-value="sub.spec || null"
                          :options="subSpecOptionsFor(item, sub, si) ?? []"
                          placeholder="請選擇規格"
                          class="min-w-0 flex-1"
                          @update:model-value="(v) => setSubSpec(sub, v)"
                        />
                      </div>
                    </template>
                    <div
                      v-else-if="sub.spec && sub.spec !== '預設'"
                      class="flex gap-4 text-sm text-slate-700"
                    >
                      <span>規格</span><span>{{ sub.spec }}</span>
                    </div>
                    <!-- 任選組合：可調整子品數量（+/- stepper）；固定組合：純顯示數量 -->
                    <div
                      v-if="isPickBundleItem(item)"
                      class="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <span class="shrink-0">數量</span>
                      <InputNumber
                        :model-value="sub.qty"
                        :min="0"
                        :disabled="isPausedMode(group)"
                        show-buttons
                        button-layout="horizontal"
                        increment-button-icon="pi pi-plus"
                        decrement-button-icon="pi pi-minus"
                        class="qty-stepper min-w-0 flex-1"
                        @update:model-value="(v) => setSubQty(sub, v)"
                      />
                    </div>
                    <div v-else class="flex gap-4 text-sm text-slate-700">
                      <span>數量</span
                      ><span>{{ (sub.qty || 0) * item.qty }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Group subtotal -->
        <div
          class="cart-divider-top flex items-center justify-end gap-4 px-[var(--card-pad)] py-4"
        >
          <span class="text-sm text-slate-700 @3xl:text-lg">訂單金額小計</span>
          <span
            class="text-xl font-bold @3xl:text-3xl"
            style="color: var(--primary)"
          >
            ${{ groupSubtotal(group).toLocaleString() }}
          </span>
        </div>
      </div>

      <!-- 加購區：初始只有「更多加購商品 N 件」按鈕；
           選完 cart 後顯示該 cart 專屬加購清單 -->
      <section
        v-if="allCarts.length > 0"
        class="shadow-card rounded-xl bg-white"
      >
        <!-- Header：兩種狀態 -->
        <div
          class="flex items-center justify-between gap-3 border-b-2 px-4 py-2"
          style="
            background: color-mix(in srgb, var(--primary) 8%, transparent);
            border-color: var(--primary);
            border-radius: 12px 12px 0 0;
          "
        >
          <div class="flex min-w-0 flex-1 flex-col leading-tight">
            <span class="text-lg font-semibold text-slate-700">加購區</span>
            <span class="text-sm break-words text-slate-600">
              {{
                selectedAddOnCart
                  ? selectedAddOnCart.sellerName
                  : `全部購物車 · ${allAddOns.length} 件`
              }}
            </span>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <Button
              v-if="selectedAddOnCart"
              label="顯示全部"
              text
              size="small"
              @click="handleClearAddOnCart"
            />
            <Button
              :label="selectedAddOnCart ? '更換購物車' : '選擇購物車'"
              icon="pi pi-filter"
              outlined
              size="small"
              class="!bg-white"
              @click="handleOpenCartPicker"
            />
          </div>
        </div>

        <!-- 空狀態：沒有可加購商品 -->
        <div
          v-if="addOnCards.length === 0"
          class="flex flex-col items-center gap-2 px-4 py-8 text-center"
        >
          <i class="pi pi-inbox text-3xl text-slate-300" />
          <p class="text-sm text-slate-500">
            {{
              selectedAddOnCart
                ? '此購物車目前沒有可加購的商品'
                : '目前沒有可加購的商品'
            }}
          </p>
        </div>

        <!-- 加購清單：全部檢視去重（不顯示車名）；每張卡加購進其所屬購物車 -->
        <div
          v-else
          class="grid auto-rows-fr grid-cols-3 gap-1.5 p-[var(--card-pad)] @3xl:grid-cols-[repeat(auto-fill,minmax(120px,1fr))]"
        >
          <div
            v-for="{ product: p, cartId } in addOnCards"
            :key="addOnKey(cartId, p.id)"
            class="flex h-full min-w-0 flex-col gap-1 rounded-lg p-1"
          >
            <div
              class="aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-slate-200"
            >
              <ProductImage :src="p.image" :alt="p.name" size="md" />
            </div>
            <p
              class="line-clamp-2 min-h-[2lh] text-sm leading-snug text-slate-950 @7xl:text-base"
            >
              {{ p.name }}
            </p>
            <div class="flex flex-wrap items-baseline gap-x-1.5">
              <span
                class="text-base font-bold @7xl:text-lg"
                style="color: var(--primary)"
              >
                ${{ p.price }}
              </span>
              <span
                v-if="p.original"
                class="text-xs whitespace-nowrap text-slate-400 line-through"
              >
                ${{ p.original }}
              </span>
            </div>

            <!-- 加入購物車：外觀對齊分類頁 ProductCard 的 CTA；點按跳 Dialog 選規格 + 數量 -->
            <button
              class="add-cart-btn mt-auto flex w-full items-center justify-center font-medium transition-all duration-200"
              :class="[
                isPC
                  ? 'gap-2 rounded-lg px-4 py-3 text-base'
                  : 'min-h-11 gap-1 rounded-lg px-3 py-2 text-sm',
                justAddedMap[addOnKey(cartId, p.id)] ? 'added-pop' : '',
              ]"
              :style="
                justAddedMap[addOnKey(cartId, p.id)]
                  ? {
                      background: 'var(--success)',
                      border: '1px solid var(--success-border)',
                      color: '#fff',
                    }
                  : {
                      background: 'var(--primary-bg)',
                      border: '1px solid var(--primary)',
                      color: '#fff',
                    }
              "
              :disabled="justAddedMap[addOnKey(cartId, p.id)]"
              @mouseover="
                (e) => {
                  if (justAddedMap[addOnKey(cartId, p.id)]) return;
                  (e.currentTarget as HTMLElement).style.background =
                    'var(--primary-hover-bg)';
                }
              "
              @mouseleave="
                (e) => {
                  if (justAddedMap[addOnKey(cartId, p.id)]) return;
                  (e.currentTarget as HTMLElement).style.background =
                    'var(--primary-bg)';
                }
              "
              @click="handleOpenAddOnDialog(p, cartId)"
            >
              <i
                :class="[
                  justAddedMap[addOnKey(cartId, p.id)]
                    ? 'pi pi-check-circle'
                    : 'pi pi-cart-plus',
                  isPC ? 'text-sm' : 'text-xl',
                ]"
              />
              <span v-if="isPC">
                {{
                  justAddedMap[addOnKey(cartId, p.id)]
                    ? '已加入購物車'
                    : '加入購物車'
                }}
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- Livebuy 直播回放加購區：橫向 Carousel + 第一張是最新場次大卡 -->
      <section class="shadow-card rounded-xl bg-white">
        <div class="border-b border-slate-200 px-6 pt-6 pb-3">
          <h2
            class="text-center text-xl font-semibold text-slate-800 @7xl:text-2xl"
          >
            Livebuy直播回放加購區
          </h2>
        </div>
        <p class="pt-3 text-center text-sm text-slate-500">
          只要點選商品的圖片，就會跳轉到直播回放介紹
        </p>
        <div class="live-replay-carousel px-4 py-4 @3xl:px-8">
          <Carousel
            :key="replayPerView"
            :value="LIVE_REPLAYS"
            :num-visible="replayPerView"
            :num-scroll="1"
          >
            <template #item="{ data }">
              <div class="h-full px-2">
                <button
                  type="button"
                  class="flex w-full flex-col items-center gap-2 transition-transform hover:scale-[1.02]"
                  @click="handleGoReplay(data)"
                >
                  <div
                    class="relative aspect-[3/5] w-full overflow-hidden rounded-xl"
                    style="background: #1e2530"
                  >
                    <!-- Featured 卡：紅色 L 底 + 日期 / 時間 疊字 -->
                    <template v-if="data.isFeatured">
                      <span
                        class="absolute inset-0 flex items-center justify-center leading-none font-black select-none"
                        style="
                          color: #932c2c;
                          font-family:
                            system-ui,
                            -apple-system,
                            sans-serif;
                          font-size: min(60cqw, 220px);
                        "
                      >
                        L
                      </span>
                      <div
                        class="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center text-white"
                      >
                        <span class="text-xs @7xl:text-sm">
                          {{ data.date }}
                        </span>
                        <span
                          class="text-2xl leading-tight font-bold @7xl:text-4xl"
                        >
                          {{ data.time }}
                        </span>
                      </div>
                    </template>
                    <!-- 一般回放卡：播放時長 + 靜音 icon -->
                    <template v-else>
                      <div
                        class="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
                      >
                        <i class="pi pi-play text-[10px]" />
                        {{ data.duration }}
                      </div>
                      <div
                        v-if="data.muted"
                        class="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <i class="pi pi-volume-off text-[10px]" />
                      </div>
                    </template>
                  </div>
                  <span class="text-sm text-slate-700">{{ data.title }}</span>
                </button>
              </div>
            </template>
          </Carousel>
        </div>
      </section>
    </main>

    <!-- Sticky footer -->
    <div
      v-if="!isEmpty"
      class="sticky bottom-0 z-40 border-t border-b border-slate-200 bg-white"
    >
      <div
        class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3"
        style="padding-bottom: max(12px, env(safe-area-inset-bottom))"
      >
        <!-- Global select all -->
        <div class="flex shrink-0 items-center gap-2">
          <Checkbox
            :model-value="globalAllChecked"
            binary
            input-id="global-all"
            @update:model-value="toggleGlobalAll"
          />
          <label
            for="global-all"
            class="cursor-pointer text-base whitespace-nowrap text-slate-700"
          >
            <span class="@3xl:hidden">全選</span>
            <span class="hidden @3xl:inline">選擇全部購物車</span>
          </label>
        </div>

        <!-- 已選 · 總計 + checkout -->
        <div class="flex min-w-0 items-center gap-3 @7xl:gap-8">
          <div
            class="flex min-w-0 flex-col items-end gap-0.5 @3xl:flex-row @3xl:items-baseline @3xl:gap-3"
          >
            <span class="text-xs whitespace-nowrap text-slate-600 @3xl:text-sm">
              已選 {{ checkedCount }} 件 · 總計
            </span>
            <span
              class="truncate text-xl font-bold @7xl:text-2xl"
              style="color: var(--primary)"
            >
              ${{ globalTotal.toLocaleString() }}
            </span>
          </div>
          <Button
            :label="`去結帳 (${checkedCount})`"
            class="!min-h-12 shrink-0 !px-5 @7xl:!px-16"
            :disabled="checkedCount === 0"
            @click="handleGoCheckout"
          />
        </div>
      </div>
    </div>

    <!-- 加購區：選擇要加入的購物車 Dialog -->
    <Dialog
      v-model:visible="isCartPickerVisible"
      modal
      :draggable="false"
      dismissable-mask
      header="選擇購物車"
      :style="{ width: '440px' }"
      :breakpoints="{ '768px': '92vw' }"
    >
      <div class="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
        <p class="mb-1 text-sm text-slate-600">
          選好購物車後，下方將顯示該台的加購商品。
        </p>
        <button
          v-for="g in allCarts"
          :key="g.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3 text-left transition-colors hover:border-[var(--primary)] hover:bg-slate-50"
          :class="
            selectedAddOnCartId === g.id
              ? 'border-[var(--primary)] bg-slate-50'
              : ''
          "
          @click="handlePickAddOnCart(g.id)"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-base font-medium break-words text-slate-950">
              {{ g.sellerName }}
            </span>
            <span class="text-xs text-slate-500">
              {{ g.items.length }} 件商品 ·
              {{ g.addOnProductIds?.length ?? 0 }} 件加購商品可選
            </span>
          </div>
          <i class="pi pi-chevron-right text-sm text-slate-400" />
        </button>
      </div>
    </Dialog>

    <!-- 加價購：選規格 + 數量 Dialog（跟商品分類頁的規格挑選一致） -->
    <Dialog
      :visible="!!addOnDialog"
      modal
      :draggable="false"
      dismissable-mask
      header="加入購物車"
      :style="{ width: '400px' }"
      :breakpoints="{ '768px': '92vw' }"
      @update:visible="(v) => !v && (addOnDialog = null)"
    >
      <div v-if="addOnDialog" class="flex flex-col gap-4">
        <!-- 商品資訊 -->
        <div class="flex gap-3">
          <div
            class="aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200"
          >
            <ProductImage
              :src="addOnDialog.image"
              :alt="addOnDialog.name"
              size="sm"
            />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <p class="line-clamp-2 text-base font-semibold text-slate-950">
              {{ addOnDialog.name }}
            </p>
            <span class="text-lg font-bold" style="color: var(--primary)">
              ${{ addOnDialog.price }}
            </span>
          </div>
        </div>

        <!-- 規格：多維度合併成單一下拉（例：'粉色, S'） -->
        <div v-if="addOnDialog.specs?.length" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">
            {{
              addOnDialog.specs.length > 1 ? '規格' : addOnDialog.specs[0].label
            }}
          </label>
          <Select
            v-model="addOnDialogSpec"
            :options="combinedSpecOptions(addOnDialog)"
            class="w-full"
          />
        </div>

        <!-- 數量 -->
        <div class="flex items-center gap-3">
          <label class="w-14 shrink-0 text-sm font-medium text-slate-700">
            數量
          </label>
          <InputNumber
            v-model="addOnDialogQty"
            :min="1"
            :max="10"
            show-buttons
            button-layout="horizontal"
            increment-button-icon="pi pi-plus"
            decrement-button-icon="pi pi-minus"
            class="qty-stepper"
          />
        </div>
      </div>
      <template #footer>
        <Button
          label="取消"
          severity="secondary"
          outlined
          @click="addOnDialog = null"
        />
        <Button label="確認加入" @click="handleConfirmAddOn" />
      </template>
    </Dialog>

    <!-- 圖片放大預覽 -->
    <Dialog
      v-model:visible="isImagePreviewOpen"
      modal
      :draggable="false"
      :dismissable-mask="true"
      :show-header="false"
      :style="{ width: 'min(90vw, 640px)' }"
      :pt="{
        content: {
          style: 'padding: 0; background: transparent; box-shadow: none',
        },
      }"
    >
      <div class="relative flex items-center justify-center">
        <img
          v-if="previewImageSrc"
          :src="previewImageSrc"
          :alt="previewImageAlt"
          class="max-h-[80vh] w-auto rounded-lg object-contain"
        />
        <button
          type="button"
          class="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
          aria-label="關閉"
          @click="isImagePreviewOpen = false"
        >
          <i class="pi pi-times" />
        </button>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
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

/* Livebuy 直播回放 Carousel：左右切換鈕做成白底圓形，跟主題館一致 */
.live-replay-carousel :deep(.p-carousel-prev-button),
.live-replay-carousel :deep(.p-carousel-next-button) {
  width: 44px;
  height: 44px;
  border-radius: 9999px;
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition:
    background-color 0.2s,
    color 0.2s,
    box-shadow 0.2s;
}
.live-replay-carousel :deep(.p-carousel-prev-button:hover),
.live-replay-carousel :deep(.p-carousel-next-button:hover) {
  background-color: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}
.live-replay-carousel :deep(.p-carousel-prev-button:disabled),
.live-replay-carousel :deep(.p-carousel-next-button:disabled) {
  opacity: 0.4;
}
.live-replay-carousel :deep(.p-carousel-prev-button .p-icon),
.live-replay-carousel :deep(.p-carousel-next-button .p-icon) {
  width: 18px;
  height: 18px;
}

/* Featured card 的 L 底字使用 container query 單位：讓字大小隨卡片寬度縮放 */
.live-replay-carousel :deep(.p-carousel-item) {
  container-type: inline-size;
}
</style>
