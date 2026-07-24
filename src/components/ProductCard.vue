<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useViewportStore } from '../pinia/viewport';
import { useCartStore } from '../pinia/cart';
import { useUiStore } from '../pinia/ui';
import { products } from '../data/products';
import { burstAddToCartFromEvent } from '../utils/cart-burst';

const props = defineProps<{
  id: number;
  name: string;
  price: number;
  original: number;
  hasVariant?: boolean;
  stock?: number;
  image?: string;
  hideActions?: boolean;
  /** 簡易版：不顯示數量選擇器與「還剩X件」，仍保留 CTA 按鈕 */
  simple?: boolean;
  /** 來源標記（如 'theme'）— 帶進商品頁 query，供麵包屑顯示「返回」 */
  from?: string;
}>();

const router = useRouter();
const cart = useCartStore();
const ui = useUiStore();

const qty = ref(1);
const vp = computed(() => useViewportStore().current.id);
const isPC = computed(() => vp.value === 'pc');

const product = computed(() => products.find((p) => p.id === props.id));

// 規格選項取自商品目錄
const sizes = computed(() => product.value?.sizes ?? []);

// 選擇規格彈窗狀態
const isSpecDialogVisible = ref(false);
const dialogSize = ref('');

/** 是否為需挑選的組合商品（任選，或固定組合內含可選規格）。 */
const needsBundlePicker = computed(() => {
  const p = product.value;
  if (!p) return false;
  if (p.isPickBundle) return true;
  if (p.isBundle && p.bundleItems?.some((i) => i.specOptions?.length))
    return true;
  return false;
});

// 組合商品挑選彈窗狀態
const isBundleDialogVisible = ref(false);
/** 任選組合：已選清單（確定時直接作為 customBundleItems）。 */
type PickedRow = { name: string; image?: string; spec: string; qty: number };
const pickedList = ref<PickedRow[]>([]);
/** 底部「已選」區塊收合狀態，預設收合。 */
const isPickedListExpanded = ref(false);
/** 各選項「加入前」的規格下拉暫存值。 */
const optSpecDraft = ref<Record<number, string>>({});
const bundleSelections = ref<string[]>([]);
const pickedTotal = computed(() =>
  pickedList.value.reduce((s, r) => s + (r.qty || 0), 0),
);
const totalPickCount = computed(
  () => (product.value?.pickCount ?? 0) * qty.value,
);
/** 單一選項的限購上限：opt.maxQty × 購買組數（qty）。 */
const optMaxQtyCard = (opt: { maxQty?: number }): number =>
  (opt.maxQty ?? 10) * qty.value;
/** 是否超過總挑選數（用於紅色警示 + 阻擋送出）。 */
const isPickOverCard = computed(
  () =>
    !!product.value?.isPickBundle && pickedTotal.value > totalPickCount.value,
);
/** 某選項（依 name）在已選清單中的數量加總。 */
const optPickedQty = (name: string): number =>
  pickedList.value.reduce((s, r) => s + (r.name === name ? r.qty : 0), 0);
/** 各選項「加入前」的數量暫存值（預設 1）。 */
const optQtyDraft = ref<Record<number, number>>({});
const optQtyOf = (id: number): number => optQtyDraft.value[id] ?? 1;
const setOptQty = (id: number, n: number): void => {
  optQtyDraft.value = { ...optQtyDraft.value, [id]: Math.max(1, n || 1) };
};
/** 把選項加進已選清單（同 name+spec 則合併）。不限制數量，超過限購 / 總數只提醒。 */
const addPickOption = (opt: {
  id: number;
  name: string;
  image?: string;
  spec: string;
  maxQty?: number;
}): void => {
  const spec = optSpecDraft.value[opt.id] ?? opt.spec;
  const addQty = optQtyOf(opt.id);
  const exist = pickedList.value.find(
    (r) => r.name === opt.name && r.spec === spec,
  );
  if (exist) exist.qty += addQty;
  else
    pickedList.value.push({ name: opt.name, image: opt.image, spec, qty: addQty });
  optQtyDraft.value = { ...optQtyDraft.value, [opt.id]: 1 };
  // 不限制數量；超過限購 / 總數只提醒，不阻擋
  if (optPickedQty(opt.name) > optMaxQtyCard(opt)) {
    ui.toast(`「${opt.name}」已超過限購 ${optMaxQtyCard(opt)} 個`, 'warn');
  } else if (pickedTotal.value > totalPickCount.value) {
    ui.toast(`已超過 ${totalPickCount.value} 件`, 'warn');
  }
};
/** 修改已選清單某列數量。 */
const setPickedRowQty = (idx: number, n: number): void => {
  const row = pickedList.value[idx];
  if (row) row.qty = Math.max(1, n || 1);
};
/** 移除已選清單某列。 */
const removePickedRow = (idx: number): void => {
  pickedList.value.splice(idx, 1);
};

const handleGoDetail = () => {
  router.push({
    path: `/product/${props.id}`,
    query: props.from ? { from: props.from } : {},
  });
};

/** 「加入購物車」視覺回饋：按鈕暫時變綠色 + ✓，1.5 秒後恢復 */
const isJustAdded = ref(false);
let addedTimer: ReturnType<typeof setTimeout> | null = null;
const flashAddedFeedback = () => {
  isJustAdded.value = true;
  if (addedTimer) clearTimeout(addedTimer);
  addedTimer = setTimeout(() => {
    isJustAdded.value = false;
    addedTimer = null;
  }, 1500);
};
onUnmounted(() => {
  if (addedTimer) clearTimeout(addedTimer);
});

const addToCart = (spec: string, n: number, event?: MouseEvent) => {
  cart.addItem(
    {
      id: props.id,
      name: props.name,
      price: props.price,
      original: props.original,
      image: props.image,
    },
    spec,
    n,
  );
  if (event) burstAddToCartFromEvent(event);
  flashAddedFeedback();
  ui.showAddedToCart(props.name);
};

const handlePrimaryAction = (e: MouseEvent) => {
  e.stopPropagation();
  if (needsBundlePicker.value) {
    pickedList.value = [];
    isPickedListExpanded.value = false;
    optSpecDraft.value = {};
    optQtyDraft.value = {};
    bundleSelections.value =
      product.value?.bundleItems?.map((i) => i.spec) ?? [];
    isBundleDialogVisible.value = true;
    return;
  }
  if (props.hasVariant) {
    // 有規格 → 跳彈窗選規格；數量沿用卡片上選的數量
    dialogSize.value = sizes.value[0] ?? '';
    isSpecDialogVisible.value = true;
  } else {
    addToCart('預設', qty.value, e);
  }
};

const handleConfirmSpecAdd = (e: MouseEvent) => {
  if (sizes.value.length && !dialogSize.value) return;
  addToCart(dialogSize.value || '預設', qty.value, e);
  isSpecDialogVisible.value = false;
};

/** 先加入待選擇：不要求挑滿規格，把組合商品先放進購物車，
 *  之後在購物車頁的內嵌挑選器補齊組合內容。 */
const handlePendingBundleAdd = (e: MouseEvent) => {
  const p = product.value;
  if (!p) return;
  if (p.isPickBundle) {
    // 任選：把所有 pickOptions 帶入做為待挑清單（qty=0、spec=''），購物車展開後可補選
    const placeholderItems = (p.pickOptions ?? []).map((opt) => ({
      name: opt.name,
      image: opt.image,
      spec: '',
      qty: 0,
    }));
    cart.addItem(
      {
        id: props.id,
        name: props.name,
        price: props.price,
        original: props.original,
        image: props.image,
      },
      '待選擇',
      qty.value,
      { customBundleItems: placeholderItems },
    );
  } else {
    // 固定組合：以目錄子品為基礎、規格清空，由購物車頁面補挑
    const placeholderItems = (p.bundleItems ?? []).map((b) => ({
      name: b.name,
      image: b.image,
      spec: b.specOptions?.length ? '' : b.spec,
      qty: b.qty,
    }));
    cart.addItem(
      {
        id: props.id,
        name: props.name,
        price: props.price,
        original: props.original,
        image: props.image,
      },
      '待選擇',
      qty.value,
      { customBundleItems: placeholderItems },
    );
  }
  burstAddToCartFromEvent(e);
  flashAddedFeedback();
  ui.showAddedToCart(props.name);
  isBundleDialogVisible.value = false;
};

const handleConfirmBundleAdd = (e: MouseEvent) => {
  const p = product.value;
  if (!p) return;
  if (p.isPickBundle) {
    if (pickedTotal.value > totalPickCount.value) {
      ui.toast(
        `已超過 ${totalPickCount.value} 件（目前 ${pickedTotal.value} 件），請減少數量`,
        'warn',
      );
      return;
    }
    if (pickedTotal.value < totalPickCount.value) {
      ui.toast(`請選擇 ${totalPickCount.value} 件商品`, 'warn');
      return;
    }
    const picked = pickedList.value.map((r) => ({ ...r }));
    const specLabel = picked
      .map((p2) => `${p2.name}（${p2.spec}）× ${p2.qty}`)
      .join(' / ');
    cart.addItem(
      {
        id: props.id,
        name: props.name,
        price: props.price,
        original: props.original,
        image: props.image,
      },
      specLabel,
      qty.value,
      { customBundleItems: picked },
    );
  } else {
    const specLabel = bundleSelections.value.length
      ? bundleSelections.value.join(' / ')
      : '預設';
    cart.addItem(
      {
        id: props.id,
        name: props.name,
        price: props.price,
        original: props.original,
        image: props.image,
      },
      specLabel,
      qty.value,
    );
  }
  burstAddToCartFromEvent(e);
  flashAddedFeedback();
  ui.showAddedToCart(props.name);
  isBundleDialogVisible.value = false;
};
</script>

<template>
  <div
    class="product-card flex h-full w-full cursor-pointer flex-col gap-2 rounded-xl bg-white p-2 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-md"
    @click="handleGoDetail"
  >
    <!-- Product image -->
    <div
      class="aspect-square w-full overflow-hidden bg-gray-100"
      :class="isPC ? 'rounded-lg' : 'rounded-md'"
    >
      <ProductImage :src="image" :alt="name" :size="isPC ? 'lg' : 'md'" />
    </div>

    <!-- Product info -->
    <div
      class="flex flex-1 flex-col px-1 pt-1"
      :class="isPC ? 'gap-2 px-2 pt-2' : 'gap-1'"
    >
      <!-- Title -->
      <p
        class="line-clamp-2 text-base leading-normal font-medium text-slate-950"
      >
        {{ name }}
      </p>

      <!-- Price -->
      <div class="flex flex-col gap-1">
        <span
          class="text-slate-500 line-through"
          :class="isPC ? 'text-base' : 'text-xs'"
          >NTD ${{ original }}</span
        >
        <span
          class="font-semibold text-rose-500"
          :class="isPC ? 'text-2xl' : 'text-base'"
        >
          <span class="text-xs font-normal">NTD</span> ${{ price }}
        </span>
      </div>

      <!-- Quantity + CTA -->
      <div
        v-if="!hideActions"
        class="mt-auto flex flex-col"
        :class="isPC ? 'gap-2' : 'gap-1'"
      >
        <!-- Quantity selector -->
        <div v-if="!simple" class="flex flex-col gap-1" @click.stop>
          <div class="flex items-center" :class="isPC ? 'gap-4' : 'gap-2'">
            <span class="text-slate-700" :class="isPC ? 'text-sm' : 'text-sm'"
              >數量</span
            >
            <InputNumber
              v-model="qty"
              :min="1"
              show-buttons
              button-layout="horizontal"
              increment-button-icon="pi pi-plus"
              decrement-button-icon="pi pi-minus"
              class="qty-stepper"
              :class="{ 'is-sm': !isPC }"
            />
          </div>
          <span class="text-slate-700" :class="isPC ? 'text-sm' : 'text-xs'"
            >還剩{{ stock ?? 11 }}件</span
          >
        </div>

        <!-- CTA Button — 一律「加入購物車」；成功後暫時變成綠色✓ -->
        <button
          class="add-cart-btn flex w-full items-center justify-center font-medium transition-all duration-200"
          :class="[
            isPC
              ? 'gap-2 rounded-lg px-4 py-3 text-base'
              : 'min-h-11 gap-1 rounded-lg px-3 py-2 text-sm',
            isJustAdded ? 'added-pop' : '',
          ]"
          :style="
            isJustAdded
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
          :disabled="isJustAdded"
          @mouseover="
            (e) => {
              if (isJustAdded) return;
              (e.currentTarget as HTMLElement).style.background =
                'var(--primary-hover-bg)';
            }
          "
          @mouseleave="
            (e) => {
              if (isJustAdded) return;
              (e.currentTarget as HTMLElement).style.background =
                'var(--primary-bg)';
            }
          "
          @click.stop="handlePrimaryAction"
        >
          <i
            :class="[
              isJustAdded ? 'pi pi-check-circle' : 'pi pi-cart-plus',
              isPC ? 'text-sm' : 'text-xl',
            ]"
          />
          <span v-if="isPC">{{
            isJustAdded ? '已加入購物車' : '加入購物車'
          }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 選擇規格彈窗 -->
  <Dialog
    v-model:visible="isSpecDialogVisible"
    modal
    header="選擇商品規格"
    :draggable="false"
    dismissable-mask
    :style="{ width: '360px', maxWidth: '90vw' }"
  >
    <div class="flex flex-col gap-4">
      <!-- 商品圖 + 名稱 -->
      <div class="flex gap-3">
        <div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <ProductImage :src="image" :alt="name" size="sm" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <p class="line-clamp-2 text-base font-semibold text-slate-700">
            {{ name }}
          </p>
          <span class="text-lg font-bold" style="color: var(--primary)"
            >${{ price }}</span
          >
        </div>
      </div>

      <!-- 規格 -->
      <div v-if="sizes.length" class="flex flex-col gap-2">
        <span class="text-sm font-medium text-slate-700">規格</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in sizes"
            :key="s"
            type="button"
            class="min-h-11 rounded-md border px-4 text-sm transition-colors"
            :style="
              dialogSize === s
                ? {
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                    background:
                      'color-mix(in srgb, var(--primary) 8%, transparent)',
                  }
                : {
                    borderColor: 'var(--border-light)',
                    color: 'var(--surface-700)',
                    background: '#fff',
                  }
            "
            @click="dialogSize = s"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- 數量 -->
      <div class="flex items-center gap-3">
        <span class="w-[60px] shrink-0 text-sm font-medium text-slate-700">
          數量
        </span>
        <InputNumber
          v-model="qty"
          :min="1"
          :max="stock ?? 10"
          show-buttons
          button-layout="horizontal"
          increment-button-icon="pi pi-plus"
          decrement-button-icon="pi pi-minus"
          class="qty-stepper"
        />
        <span v-if="stock != null" class="text-sm text-slate-500">
          庫存 {{ stock }} 件
        </span>
      </div>
    </div>

    <template #footer>
      <Button
        label="取消"
        severity="secondary"
        outlined
        @click="isSpecDialogVisible = false"
      />
      <Button
        label="加入購物車"
        icon="pi pi-cart-plus"
        :disabled="!!sizes.length && !dialogSize"
        @click="handleConfirmSpecAdd"
      />
    </template>
  </Dialog>

  <!-- 組合商品挑選彈窗：任選 或 固定組合（含可選規格） -->
  <Dialog
    v-model:visible="isBundleDialogVisible"
    modal
    :draggable="false"
    dismissable-mask
    :class="product?.isPickBundle ? 'picked-sticky-dialog' : null"
    :header="
      product?.isPickBundle
        ? `請選擇 ${totalPickCount} 件商品`
        : '選擇組合商品內容'
    "
    :style="{ width: '560px' }"
    :breakpoints="{ '768px': '92vw' }"
    @click.stop
  >
    <div @click.stop class="flex flex-col gap-4">
      <!-- 商品圖 + 名稱 + 主數量 -->
      <div class="flex gap-3">
        <div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <ProductImage :src="image" :alt="name" size="sm" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <p class="line-clamp-2 text-base font-semibold text-slate-700">
            {{ name }}
          </p>
          <span class="text-lg font-bold" style="color: var(--primary)"
            >${{ price }}</span
          >
        </div>
      </div>

      <!-- 主數量（買幾組） -->
      <div class="flex items-center gap-3">
        <span class="w-[60px] shrink-0 text-sm text-slate-700">數量</span>
        <InputNumber
          v-model="qty"
          :min="1"
          show-buttons
          button-layout="horizontal"
          increment-button-icon="pi pi-plus"
          decrement-button-icon="pi pi-minus"
          class="qty-stepper"
        />
        <span class="text-sm text-slate-500">組</span>
      </div>

      <!-- 任選組合：每選項一顆「加入」→ 加到上方已選清單 -->
      <div
        v-if="product?.isPickBundle && product.pickOptions?.length"
        class="flex flex-col gap-3"
      >
        <p class="text-xs font-medium text-slate-500">選擇商品</p>

        <!-- 選項清單：柔和淺底卡片（無線框）；已加入 → 主色淺底 + 圖片角落打勾 -->
        <div
          v-for="opt in product.pickOptions"
          :key="opt.id"
          class="flex items-start gap-3 rounded-xl p-3 transition-colors"
          :class="optPickedQty(opt.name) > 0 ? '' : 'bg-slate-50'"
          :style="
            optPickedQty(opt.name) > 0
              ? 'background: var(--primary-surface)'
              : ''
          "
        >
          <div
            class="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-slate-200"
          >
            <ProductImage :src="opt.image" :alt="opt.name" size="sm" />
            <span
              v-if="optPickedQty(opt.name) > 0"
              class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm"
            >
              <i class="pi pi-check text-xs" style="color: var(--primary)" />
            </span>
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <p class="line-clamp-2 text-sm leading-snug text-slate-950">
              {{ opt.name }}
            </p>
            <p
              v-if="opt.maxQty != null && opt.maxQty < (product.pickCount ?? 0)"
              class="text-xs font-medium"
              style="color: var(--danger)"
            >
              限購 {{ optMaxQtyCard(opt) }} 個
            </p>
            <div
              v-if="opt.specOptions?.length"
              class="flex items-center gap-2 text-sm text-slate-700"
            >
              <span class="w-[36px] shrink-0 text-slate-500">規格</span>
              <Select
                :model-value="optSpecDraft[opt.id] ?? opt.spec"
                :options="opt.specOptions"
                size="small"
                fluid
                class="min-w-0 flex-1"
                @update:model-value="(v) => (optSpecDraft[opt.id] = v)"
              />
            </div>
            <div class="flex items-center gap-2 text-sm text-slate-700">
              <span class="w-[36px] shrink-0 text-slate-500">數量</span>
              <InputNumber
                :model-value="optQtyOf(opt.id)"
                :min="1"
                show-buttons
                button-layout="horizontal"
                increment-button-icon="pi pi-plus"
                decrement-button-icon="pi pi-minus"
                class="qty-stepper min-w-0 flex-1"
                @update:model-value="(v) => setOptQty(opt.id, v)"
              />
            </div>
          </div>
          <Button
            label="加入"
            icon="pi pi-plus"
            size="small"
            class="pick-add-btn shrink-0"
            @click="addPickOption(opt)"
          />
        </div>
      </div>

      <!-- 固定組合：每個子商品挑規格 -->
      <div
        v-else-if="product?.isBundle && product.bundleItems?.length"
        class="flex flex-col gap-3"
      >
        <div
          v-for="(item, idx) in product.bundleItems"
          :key="idx"
          class="flex gap-3 rounded-lg border border-slate-200 p-2"
        >
          <div
            class="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-slate-200"
          >
            <ProductImage :src="item.image" :alt="item.name" size="sm" />
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <p class="line-clamp-2 text-sm leading-snug text-slate-950">
              {{ item.name }}
            </p>
            <div class="flex items-center gap-2 text-sm text-slate-700">
              <span class="w-[36px] shrink-0 text-slate-500">規格</span>
              <Select
                v-if="item.specOptions?.length"
                v-model="bundleSelections[idx]"
                :options="item.specOptions"
                size="small"
                fluid
                class="min-w-0 flex-1"
              />
              <span v-else>{{ item.spec }}</span>
            </div>
            <div class="flex gap-4 text-sm text-slate-700">
              <span class="w-[36px] text-slate-500">數量</span>
              <span>{{ item.qty * qty }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 已選 + 已選內容：黏在彈窗底部，選項清單捲動時固定顯示 -->
      <div
        v-if="product?.isPickBundle && product.pickOptions?.length"
        class="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white px-5 pb-4 pt-3"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between text-sm"
          @click="isPickedListExpanded = !isPickedListExpanded"
        >
          <span
            :class="isPickOverCard ? 'text-red-500' : ''"
            :style="isPickOverCard ? '' : 'color: var(--primary)'"
          >
            已選 {{ pickedTotal }} / {{ totalPickCount }}
          </span>
          <span class="flex items-center gap-1 text-xs text-slate-400">
            {{ isPickedListExpanded ? '收合' : '展開' }}
            <i
              class="pi text-xs"
              :class="isPickedListExpanded ? 'pi-chevron-down' : 'pi-chevron-up'"
            />
          </span>
        </button>
        <div v-show="isPickedListExpanded" class="mt-2 flex flex-col gap-2">
          <p class="text-xs font-medium text-slate-500">已選內容</p>
          <template v-if="pickedList.length">
            <div
              v-for="(row, idx) in pickedList"
              :key="`${row.name}-${row.spec}`"
              class="flex items-center gap-2"
            >
              <span class="min-w-0 flex-1 truncate text-sm text-slate-700">
                {{ row.name
                }}<span
                  v-if="row.spec && row.spec !== '預設'"
                  class="text-slate-500"
                >
                  / {{ row.spec }}</span
                >
              </span>
              <InputNumber
                :model-value="row.qty"
                :min="1"
                size="small"
                class="w-16 shrink-0"
                :input-style="{ width: '100%', textAlign: 'center' }"
                @update:model-value="(v) => setPickedRowQty(idx, v)"
              />
              <button
                type="button"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-red-500"
                aria-label="移除此項"
                @click="removePickedRow(idx)"
              >
                <i class="pi pi-trash text-xs" />
              </button>
            </div>
          </template>
          <p v-else class="text-sm text-slate-400">尚未選擇</p>
        </div>
      </div>
    </div>

    <template #footer>
      <Button
        label="加入購物車"
        icon="pi pi-cart-plus"
        @click="handleConfirmBundleAdd"
      />
    </template>
  </Dialog>
</template>

<style scoped>
/* 加入購物車成功時的 pop 動畫 */
.add-cart-btn.added-pop {
  animation: cart-added-pop 0.5s ease;
}
@keyframes cart-added-pop {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  40% {
    transform: scale(1.06);
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}
.add-cart-btn:disabled {
  cursor: default;
}
</style>
