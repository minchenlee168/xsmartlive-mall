<script setup lang="ts">
import { computed, ref } from 'vue';
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
import { products } from '../data/products';

interface AddOnProduct {
  id: number;
  name: string;
  price: number;
  original?: number;
  image: string;
  spec?: string;
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
  },
  {
    id: 9006,
    name: '媽咪保溫水壺 500ml',
    price: 290,
    original: 480,
    image:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&fit=crop',
  },
];

const router = useRouter();
const ui = useUiStore();
const cart = useCartStore();

const groups = computed(() => cart.groups);
const isEmpty = computed(() => groups.value.every((g) => g.items.length === 0));

// 不同配送方式 → 阻擋共同結帳並彈窗請使用者拆單
const isMixedShippingDialogVisible = ref(false);
const mixedShippingMethods = ref<string[]>([]);

/** 找到該購物車對應的配送方式 tag（label 含「配送」字樣的那個）。 */
const getGroupShipping = (group: CartGroup): string | null => {
  const tag = group.tags.find((tg) => tg.label.includes('配送'));
  return tag ? tag.label : null;
};

const isGroupAllChecked = (group: CartGroup) =>
  group.items.length > 0 && group.items.every((i) => i.checked);

const toggleGroupAll = (group: CartGroup) => {
  const all = isGroupAllChecked(group);
  group.items.forEach((i) => {
    i.checked = !all;
  });
};

const globalAllChecked = computed(() =>
  groups.value.every((g) => isGroupAllChecked(g)),
);

const toggleGlobalAll = () => {
  const all = globalAllChecked.value;
  groups.value.forEach((g) =>
    g.items.forEach((i) => {
      i.checked = !all;
    }),
  );
};

const groupSubtotal = (group: CartGroup) =>
  group.items.filter((i) => i.checked).reduce((s, i) => s + i.price * i.qty, 0);

const globalTotal = computed(() =>
  groups.value.reduce((s, g) => s + groupSubtotal(g), 0),
);
const checkedCount = computed(() =>
  groups.value.reduce((s, g) => s + g.items.filter((i) => i.checked).length, 0),
);

const removeItem = (group: CartGroup, id: string) => {
  cart.removeItem(group.id, id);
};

const isGroupLocked = (group: CartGroup) =>
  group.tags.some((t) => t.label === '禁止棄標');

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
    return subIssue || pickedTotalOf(item) !== need;
  }
  return subIssue;
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

/** 任選組合：單一子品可選的數量清單 0 ~ min(maxQty × itemQty, 已挑 + 剩餘額度)。 */
const subQtyOptionsFor = (item: CartItem, sub: CartBundleItem): number[] => {
  const cat = products.find((p) => p.id === item.productId);
  if (!cat?.isPickBundle) return [];
  const totalNeed = (cat.pickCount ?? 0) * item.qty;
  const opt = cat.pickOptions?.find((o) => o.name === sub.name);
  const perItemMax = (opt?.maxQty ?? 1) * item.qty;
  const cur = sub.qty || 0;
  const remaining = totalNeed - pickedTotalOf(item);
  const max = Math.min(perItemMax, cur + Math.max(remaining, 0));
  return Array.from({ length: max + 1 }, (_, i) => i);
};

const setSubQty = (sub: CartBundleItem, value: number) => {
  sub.qty = value;
};

const handleAddAddOn = (p: AddOnProduct) => {
  cart.addItem(
    {
      id: p.id,
      name: p.name,
      price: p.price,
      original: p.original,
      image: p.image,
    },
    p.spec ?? '預設',
    1,
  );
  ui.toast(`已加入「${p.name}」`);
};

const handleGoCheckout = () => {
  // 已勾選的組合商品若有未選規格 / 數量 → 阻擋並提示
  const incompleteBundle = groups.value
    .flatMap((g) => g.items)
    .find((i) => i.checked && bundleNeedsAttention(i));
  if (incompleteBundle) {
    ui.toast(`「${incompleteBundle.name}」尚未選擇規格或數量`);
    return;
  }
  // 勾選的群組若包含不同配送方式 → 不能合併結帳，跳提示請拆單
  const checkedGroups = groups.value.filter((g) =>
    g.items.some((i) => i.checked),
  );
  const methods = Array.from(
    new Set(
      checkedGroups.map(getGroupShipping).filter((s): s is string => !!s),
    ),
  );
  if (methods.length > 1) {
    mixedShippingMethods.value = methods;
    isMixedShippingDialogVisible.value = true;
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
          @click="router.back()"
        />
        <h1 class="text-xl font-bold text-slate-950 @7xl:text-2xl">
          購物車結帳
        </h1>
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
        v-for="group in groups"
        :key="group.id"
        class="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)]"
      >
        <!-- Group header -->
        <div
          class="cart-divider flex items-center gap-4 px-[var(--card-pad)] py-[var(--card-pad)]"
        >
          <div class="flex shrink-0 items-center gap-2">
            <Checkbox
              :model-value="isGroupAllChecked(group)"
              binary
              :input-id="'grp-' + group.id"
              @update:model-value="toggleGroupAll(group)"
            />
            <label
              :for="'grp-' + group.id"
              class="cursor-pointer text-sm text-slate-700"
            >
              全選
            </label>
          </div>
          <!-- 名稱 + tag：手機版直式（避免名稱過長與 tag 一起折行），@3xl 以上橫式 -->
          <div
            class="flex min-w-0 flex-1 flex-col items-start gap-1 @3xl:flex-row @3xl:items-center @3xl:gap-2"
          >
            <span
              class="max-w-full truncate text-[17.5px] font-medium text-slate-700"
            >
              {{ group.sellerName }}
            </span>
            <div class="flex flex-wrap items-center gap-2">
              <Tag
                v-for="tag in group.tags"
                :key="tag.label"
                :value="tag.label"
                :severity="tag.type"
              />
            </div>
          </div>
        </div>

        <!-- Items -->
        <div
          v-for="(item, ii) in group.items"
          :key="item.id"
          :class="ii !== group.items.length - 1 ? 'cart-divider' : ''"
        >
          <!-- Item row -->
          <div
            class="flex items-center gap-3 px-[var(--card-pad)] py-[var(--card-pad)] @7xl:gap-4"
          >
            <Checkbox v-model="item.checked" binary class="shrink-0" />

            <!-- Image -->
            <div
              class="aspect-square w-16 shrink-0 overflow-hidden rounded @3xl:w-20 @7xl:w-[100px]"
            >
              <img
                v-if="item.image"
                :src="item.image"
                :alt="item.name"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-gray-100"
              >
                <i class="pi pi-hammer text-lg text-gray-300" />
                <span class="text-xs text-gray-400">圖片施工中</span>
              </div>
            </div>

            <!-- Info -->
            <div
              class="flex min-w-0 flex-1 flex-col gap-1 @7xl:flex-row @7xl:items-center @7xl:gap-4"
            >
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <p
                  class="truncate text-base font-semibold text-slate-700"
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
                  class="flex gap-4 text-base text-slate-700 @7xl:text-sm"
                >
                  <span>規格</span>
                  <span>{{ item.spec }}</span>
                </div>
                <div class="flex items-center gap-4 text-base @7xl:text-sm">
                  <span class="text-slate-700">數量</span>
                  <InputNumber
                    v-model="item.qty"
                    :min="1"
                    show-buttons
                    button-layout="horizontal"
                    increment-button-icon="pi pi-plus"
                    decrement-button-icon="pi pi-minus"
                    class="qty-stepper"
                  />
                </div>
              </div>

              <!-- Price + Delete -->
              <div
                class="mt-1 flex shrink-0 items-center justify-between @7xl:mt-0 @7xl:gap-8"
              >
                <div class="flex flex-col items-start">
                  <span
                    v-if="item.original"
                    class="text-sm text-slate-500 line-through"
                  >
                    ${{ (item.original * item.qty).toLocaleString() }}
                  </span>
                  <span
                    class="text-base leading-none font-medium @7xl:text-2xl"
                    style="color: var(--primary)"
                  >
                    ${{ (item.price * item.qty).toLocaleString() }}
                  </span>
                </div>
                <Button
                  v-if="!isGroupLocked(group)"
                  label="刪除"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  class="!min-h-11 !px-3"
                  @click="removeItem(group, item.id)"
                />
              </div>
            </div>
          </div>

          <!-- Bundle fieldset -->
          <div v-if="item.isBundle" class="px-[var(--card-pad)] pt-4 pb-4 pl-9">
            <div
              class="relative rounded-md border border-slate-200 bg-white p-4"
            >
              <!-- Legend button -->
              <button
                class="absolute flex items-center gap-2 rounded-md border-0 bg-transparent px-3 py-2 text-sm font-black text-slate-700 transition-colors hover:text-[var(--primary)]"
                style="top: -18px; left: 16px"
                @click="item.bundleExpanded = !item.bundleExpanded"
              >
                <i
                  class="pi text-xs"
                  :class="item.bundleExpanded ? 'pi-minus' : 'pi-plus'"
                />
                組合商品內容
              </button>

              <!-- 未選規格 / 數量提示 banner -->
              <div
                v-if="item.bundleExpanded && bundleNeedsAttention(item)"
                class="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500"
              >
                <i class="pi pi-exclamation-triangle text-base" />
                <span
                  >此組合商品尚未選擇規格或數量，請至商品頁完成選擇後再結帳</span
                >
              </div>

              <!-- Sub-items grid -->
              <div
                v-if="item.bundleExpanded"
                class="grid grid-cols-1 gap-4 @7xl:grid-cols-2"
              >
                <div
                  v-for="(sub, si) in item.bundleItems"
                  :key="si"
                  class="flex items-center gap-4 rounded-xl bg-slate-100 p-[var(--card-pad)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                  :style="
                    subNeedsAttention(sub, item)
                      ? 'outline: 1px solid #ef4444'
                      : ''
                  "
                >
                  <div
                    class="h-20 w-20 shrink-0 overflow-hidden rounded bg-[#d9d9d9]"
                  >
                    <img
                      v-if="sub.image"
                      :src="sub.image"
                      :alt="sub.name"
                      class="h-full w-full object-cover"
                    />
                  </div>
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
                          size="small"
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
                    <!-- 任選組合：可調整子品數量；固定組合：純顯示數量 -->
                    <div
                      v-if="isPickBundleItem(item)"
                      class="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <span class="shrink-0">數量</span>
                      <Select
                        :model-value="sub.qty"
                        :options="subQtyOptionsFor(item, sub)"
                        size="small"
                        fluid
                        class="min-w-0 flex-1"
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

      <!-- 加價購區塊 -->
      <section class="shadow-card rounded-xl bg-white">
        <div
          class="flex items-center border-b-2 px-4 py-2"
          style="
            background: color-mix(in srgb, var(--primary) 8%, transparent);
            border-color: var(--primary);
            border-radius: 12px 12px 0 0;
          "
        >
          <span class="text-lg font-semibold text-slate-700">加價購</span>
        </div>

        <!-- 加價購卡片 — auto-fill grid -->
        <div
          class="grid gap-2 p-[var(--card-pad)]"
          style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))"
        >
          <div
            v-for="p in ADD_ON_PRODUCTS"
            :key="p.id"
            class="flex flex-col gap-[7px] rounded-lg p-2"
          >
            <div
              class="aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-[#d9d9d9]"
            >
              <img
                :src="p.image"
                :alt="p.name"
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div class="flex min-h-0 flex-1 flex-col gap-2 p-2">
              <p
                class="line-clamp-2 min-h-9 overflow-hidden text-sm leading-snug text-slate-950 @7xl:min-h-11 @7xl:text-base"
              >
                {{ p.name }}
              </p>
              <span
                class="text-base font-bold @7xl:text-lg"
                style="color: var(--primary)"
              >
                ${{ p.price }}
              </span>
              <Button
                label="加入購物車"
                icon="pi pi-plus"
                size="small"
                class="mt-auto whitespace-nowrap"
                @click="handleAddAddOn(p)"
              />
            </div>
          </div>
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

        <!-- Total + checkout -->
        <div class="flex min-w-0 items-center gap-3 @7xl:gap-8">
          <div class="flex min-w-0 items-baseline gap-2">
            <span class="hidden text-lg text-slate-700 @3xl:inline"
              >訂單總金額</span
            >
            <span
              class="truncate text-2xl font-bold @7xl:text-3xl"
              style="color: var(--primary)"
            >
              ${{ globalTotal.toLocaleString() }}
            </span>
          </div>
          <Button
            :label="checkedCount > 0 ? `去結帳 (${checkedCount})` : '去結帳'"
            class="!min-h-12 shrink-0 !px-5 @7xl:!px-16"
            :disabled="checkedCount === 0"
            @click="handleGoCheckout"
          />
        </div>
      </div>
    </div>

    <!-- 不同配送方式提示：阻擋共同結帳 -->
    <Dialog
      v-model:visible="isMixedShippingDialogVisible"
      modal
      :draggable="false"
      :dismissable-mask="true"
      :style="{ width: '420px' }"
      :breakpoints="{ '768px': '90vw' }"
      :pt="{
        header: { style: 'padding: 16px 20px' },
        content: { style: 'padding: 0 20px 16px' },
        footer: { style: 'padding: 12px 20px' },
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <i class="pi pi-exclamation-triangle text-lg text-red-500" />
          <span class="text-base font-bold text-slate-950">無法合併結帳</span>
        </div>
      </template>
      <div class="flex flex-col gap-2 text-sm text-slate-700">
        <p>所選購物車包含不同配送方式，無法一起結帳：</p>
        <ul class="list-disc pl-5">
          <li v-for="m in mixedShippingMethods" :key="m">{{ m }}</li>
        </ul>
        <p class="text-slate-500">
          請分別勾選同一配送方式的購物車後再進行結帳。
        </p>
      </div>
      <template #footer>
        <div class="flex w-full justify-end">
          <Button
            label="我知道了"
            @click="isMixedShippingDialogVisible = false"
          />
        </div>
      </template>
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
  background: #e2e8f0;
}
.cart-divider::after {
  bottom: 0;
}
.cart-divider-top::before {
  top: 0;
}
</style>
