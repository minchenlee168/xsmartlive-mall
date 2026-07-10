<script setup lang="ts">
import { ref, computed } from 'vue';
import { useThemeStore, themes as allThemes } from '../pinia/theme';
import { useDensityStore, type DensityMode } from '../pinia/density';
import {
  useCartStore,
  type CartGroup,
  type RoutingRule,
  type ShippingMethodId,
  type PaymentMethodId,
  type CheckoutMode,
  type BulkDiscountRule,
} from '../pinia/cart';
import { useAppModeStore } from '../pinia/appMode';
import { products } from '../data/products';

declare const __BUILD_TIME__: string;

const themeStore = useThemeStore();
const densityStore = useDensityStore();
const cartStore = useCartStore();
const appMode = useAppModeStore();

// ---- 購物車設定 Dialog -----------------------------------------------------
const isCartSettingsOpen = ref(false);
const cartSettingsTab = ref<'carts' | 'rules' | 'discounts'>('carts');

type TempLabel = '常溫' | '冷藏' | '冷凍';
/** 溫層選項：冷凍藍 (info)、冷藏綠 (success)、常溫灰 (secondary)。 */
const TEMP_OPTIONS: {
  label: string;
  value: TempLabel;
  tagType: 'info' | 'success' | 'secondary';
}[] = [
  { label: '常溫', value: '常溫', tagType: 'secondary' },
  { label: '冷藏', value: '冷藏', tagType: 'success' },
  { label: '冷凍', value: '冷凍', tagType: 'info' },
];
const SHIPPING_OPTS: { label: string; value: ShippingMethodId }[] = [
  { label: '宅配', value: 'home' },
  { label: '超商', value: 'store' },
];
const PAYMENT_OPTS: { label: string; value: PaymentMethodId }[] = [
  { label: '信用卡', value: 'credit' },
  { label: 'ATM', value: 'atm' },
  { label: '貨到付款', value: 'cod' },
];
/** 結帳模式：對應 CheckoutMode，顯示用 label + 一句話說明。 */
const CHECKOUT_MODES: {
  label: string;
  value: CheckoutMode;
  desc: string;
}[] = [
  { label: '預設', value: 'default', desc: '一次結清整台購物車' },
  { label: '自選', value: 'pickable', desc: '可勾選要結帳的品項' },
  { label: '棄標', value: 'abandon', desc: '允許放棄先前喊下的商品' },
  { label: '暫停', value: 'paused', desc: '僅供瀏覽，暫停結帳' },
];

/** 從 group.tags 抓目前的溫層 label；沒有 → null（其他非溫層 tag 保留）。 */
const getTempOf = (g: CartGroup): TempLabel | null => {
  const tempLabels = TEMP_OPTIONS.map((o) => o.value) as string[];
  const t = g.tags.find((tg) => tempLabels.includes(tg.label));
  return (t?.label as TempLabel) ?? null;
};
const setTempOf = (g: CartGroup, temp: TempLabel | null) => {
  const tempLabels = TEMP_OPTIONS.map((o) => o.value) as string[];
  const others = g.tags.filter((tg) => !tempLabels.includes(tg.label));
  if (!temp) {
    cartStore.updateCart(g.id, { tags: others });
    return;
  }
  const opt = TEMP_OPTIONS.find((o) => o.value === temp);
  cartStore.updateCart(g.id, {
    tags: [...others, { label: temp, type: opt?.tagType ?? 'secondary' }],
  });
};

/** 分類清單：從商品目錄抽出唯一值，給規則 Select 用。 */
const categoryOptions = computed(() => {
  const set = new Set<string>();
  products.forEach((p) => {
    if (p.category) set.add(p.category);
  });
  return Array.from(set).map((c) => ({ label: c, value: c }));
});
const productOptions = computed(() =>
  products.map((p) => ({ label: `#${p.id} ${p.name}`, value: p.id })),
);
const cartOptions = computed(() =>
  cartStore.groups.map((g) => ({
    label: `${g.sellerName}（#${g.id}）`,
    value: g.id,
  })),
);

const handleAddCart = () => cartStore.addCart();
const handleRemoveCart = (g: CartGroup) => {
  if (!cartStore.removeCart(g.id)) {
    // 有商品時擋掉 —— 用 alert 快速提示（prototype，不接 toast 也 OK）
    alert(`「${g.sellerName}」還有 ${g.items.length} 件商品，無法刪除`);
  }
};
const handleAddRule = () => {
  const firstCartId = cartStore.groups[0]?.id;
  const firstCategory = categoryOptions.value[0]?.value;
  if (!firstCartId || !firstCategory) return;
  cartStore.addRule({ type: 'category', value: firstCategory }, firstCartId);
};
const handleChangeRuleType = (
  rule: RoutingRule,
  type: 'category' | 'productId',
) => {
  if (rule.condition.type === type) return;
  const nextValue =
    type === 'category'
      ? (categoryOptions.value[0]?.value ?? '')
      : (productOptions.value[0]?.value ?? 0);
  cartStore.updateRule(rule.id, {
    condition:
      type === 'category'
        ? { type: 'category', value: nextValue as string }
        : { type: 'productId', value: nextValue as number },
  });
};

/** 新增多件優惠：預設抓第一個未設定的商品，門檻 2 件、單價抓 9 折。 */
const handleAddDiscount = () => {
  const usedIds = new Set(cartStore.bulkDiscountRules.map((r) => r.productId));
  const firstUnused = products.find((p) => !usedIds.has(p.id)) ?? products[0];
  if (!firstUnused) return;
  const suggested = Math.max(1, Math.round(firstUnused.price * 0.9));
  cartStore.addBulkDiscountRule({
    productId: firstUnused.id,
    discount: {
      minQty: 2,
      unitPrice: suggested,
      note: `買 2 件以上每件 $${suggested.toLocaleString()}`,
    },
  });
};

/** 更新某條規則的單一 discount 欄位；備註在 unitPrice / minQty 改動時同步刷新（僅在還沒被手動編輯過時）。 */
const updateDiscountField = (
  rule: BulkDiscountRule,
  patch: Partial<BulkDiscountRule['discount']>,
) => {
  const nextDiscount = { ...rule.discount, ...patch };
  cartStore.updateBulkDiscountRule(rule.id, { discount: nextDiscount });
};

const densities: { id: DensityMode; label: string; icon: string }[] = [
  { id: 'wide', label: '寬', icon: 'pi-arrows-h' },
  { id: 'compact', label: '窄', icon: 'pi-arrow-right-arrow-left' },
];

// 外觀選項：預設(紫) + 4 個具名 preset；主題色只調整「預設」外觀的主色。
const APPEARANCE_IDS = ['aurora', 'midnight', 'bloom', 'retro'] as const;
const APPEARANCE_ID_SET = new Set<string>(APPEARANCE_IDS);
const appearanceThemes = APPEARANCE_IDS.map((id) =>
  allThemes.find((t) => t.id === id),
).filter((t): t is NonNullable<typeof t> => !!t);

/** 「預設」外觀在浮動控制列的顯示用資料（沒有實體 theme.id，代表「非外觀類的主題色」）。 */
const defaultAppearance = {
  id: 'default' as const,
  label: '預設',
  swatch: '#7008e7',
  swatchGradient: undefined as string | undefined,
};
const appearanceOptions = [defaultAppearance, ...appearanceThemes];

/** 主題色 palette：只顯示可作為「預設」主色的顏色（排除外觀主題和作為 default 的紫色）。 */
const paletteThemes = allThemes.filter(
  (t) => t.id !== 'purple' && !APPEARANCE_ID_SET.has(t.id),
);

const isAppearanceActive = (id: string): boolean => {
  if (id === 'default') return !APPEARANCE_ID_SET.has(themeStore.current.id);
  return themeStore.current.id === id;
};

/** 點按外觀：預設 → 若目前在外觀主題就跳回紫，否則保留現有主題色。 */
const handlePickAppearance = (opt: (typeof appearanceOptions)[number]) => {
  if (opt.id === 'default') {
    if (APPEARANCE_ID_SET.has(themeStore.current.id)) {
      const purple = allThemes.find((t) => t.id === 'purple');
      if (purple) themeStore.set(purple);
    }
    return;
  }
  const theme = allThemes.find((t) => t.id === opt.id);
  if (theme) themeStore.set(theme);
};

const isOpen = ref(false);
const isHidden = ref(false);

/** vite.config 在 build/dev 啟動時注入 ISO 字串，轉成 YYYY/MM/DD HH:mm 顯示。 */
const buildTimeDisplay = (() => {
  const d = new Date(__BUILD_TIME__);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
})();
</script>

<template>
  <div
    v-if="!isHidden"
    class="fixed right-6 bottom-24 z-[9999] flex flex-col items-end gap-2"
  >
    <!-- Panel -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-if="isOpen"
        class="flex w-60 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
      >
        <!-- 外觀 -->
        <div>
          <p
            class="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase"
          >
            外觀
          </p>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="opt in appearanceOptions"
              :key="opt.id"
              class="flex min-h-12 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition-all"
              :style="
                isAppearanceActive(opt.id)
                  ? {
                      background: 'var(--primary-bg)',
                      borderColor: 'var(--primary)',
                      color: '#fff',
                    }
                  : {}
              "
              :class="
                !isAppearanceActive(opt.id)
                  ? 'border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  : ''
              "
              @click="handlePickAppearance(opt)"
            >
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                :style="{
                  background: opt.swatchGradient ?? opt.swatch,
                  borderColor: isAppearanceActive(opt.id)
                    ? '#fff'
                    : 'transparent',
                }"
              />
              <span class="leading-tight">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-200" />

        <!-- Density -->
        <div>
          <p
            class="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase"
          >
            間距
          </p>
          <div class="flex gap-1.5">
            <button
              v-for="d in densities"
              :key="d.id"
              class="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-all"
              :style="
                densityStore.mode === d.id
                  ? {
                      background: 'var(--primary-bg)',
                      borderColor: 'var(--primary)',
                      color: '#fff',
                    }
                  : {}
              "
              :class="
                densityStore.mode !== d.id
                  ? 'border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  : ''
              "
              @click="densityStore.set(d.id)"
            >
              <i :class="`pi ${d.icon} text-sm`" />
              {{ d.label }}
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-200" />

        <!-- Theme -->
        <div>
          <p
            class="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase"
          >
            主題色
          </p>
          <div class="grid grid-cols-4 gap-x-2 gap-y-3">
            <button
              v-for="theme in paletteThemes"
              :key="theme.id"
              class="group flex flex-col items-center gap-1"
              @click="themeStore.set(theme)"
            >
              <!-- swatch：漸層或純色 -->
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-110"
                :style="{
                  background: theme.swatchGradient ?? theme.swatch,
                  borderColor:
                    themeStore.current.id === theme.id
                      ? '#020617'
                      : 'transparent',
                  transform:
                    themeStore.current.id === theme.id ? 'scale(1.15)' : '',
                }"
              >
                <i
                  v-if="themeStore.current.id === theme.id"
                  class="pi pi-check text-xs text-white drop-shadow"
                />
              </span>
              <span class="text-center text-xs leading-tight text-slate-500">{{
                theme.label
              }}</span>
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-200" />

        <!-- 購物車設定 -->
        <div>
          <p
            class="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase"
          >
            購物車
          </p>
          <button
            class="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
            @click="
              isOpen = false;
              isCartSettingsOpen = true;
            "
          >
            <span class="flex items-center gap-2">
              <i class="pi pi-cog text-sm" />
              購物車設定
            </span>
            <span class="text-xs text-slate-400">
              {{ cartStore.groups.length }} 台 ·
              {{ cartStore.routingRules.length }} 規則
            </span>
          </button>

          <!-- 直播主未用商城：開啟後隱藏商城首頁 / 分類 / 主題館 -->
          <div
            class="mt-2 flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-700">直播主未用商城</p>
              <p class="mt-0.5 text-xs leading-snug text-slate-400">
                開啟後隱藏商城首頁、主題館與分類頁，僅保留其他功能
              </p>
            </div>
            <ToggleSwitch
              :model-value="appMode.noShopMode"
              class="mt-0.5 shrink-0"
              @update:model-value="appMode.setNoShopMode(!!$event)"
            />
          </div>
        </div>

        <div class="h-px bg-slate-200" />

        <!-- Prototype 識別 + 更新時間 -->
        <p class="text-center text-xs leading-relaxed text-slate-400">
          此為 prototype 展示<br />更新時間：{{ buildTimeDisplay }}
        </p>
      </div>
    </Transition>

    <!-- FAB -->
    <div class="relative">
      <button
        class="flex h-12 w-12 items-center justify-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 hover:scale-110 active:scale-95"
        style="background: var(--primary-bg)"
        @click="isOpen = !isOpen"
      >
        <i
          class="pi text-lg text-white"
          :class="isOpen ? 'pi-times' : 'pi-cog'"
          :style="{
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }"
        />
      </button>
      <!-- 暫時隱藏（重整後恢復） -->
      <button
        v-show="!isOpen"
        class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="暫時隱藏（重整後恢復）"
        title="暫時隱藏（重整後恢復）"
        @click.stop="isHidden = true"
      >
        <i class="pi pi-times text-[10px]" />
      </button>
    </div>
  </div>

  <!-- ============== 購物車設定 Dialog ============== -->
  <Dialog
    v-model:visible="isCartSettingsOpen"
    modal
    :draggable="false"
    :dismissable-mask="true"
    :style="{ width: '720px' }"
    :breakpoints="{ '768px': '92vw' }"
    :pt="{
      header: { style: 'padding: 16px 20px' },
      content: { style: 'padding: 0 20px 20px' },
    }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-shopping-cart text-lg text-slate-700" />
        <span class="text-base font-bold text-slate-950">購物車設定</span>
        <span class="text-xs text-slate-400">（原型測試用）</span>
      </div>
    </template>

    <Tabs v-model:value="cartSettingsTab">
      <TabList>
        <Tab value="carts">
          <span class="flex items-center gap-1.5">
            <i class="pi pi-list" />
            購物車清單
            <span class="text-xs text-slate-400">
              ({{ cartStore.groups.length }})
            </span>
          </span>
        </Tab>
        <Tab value="rules">
          <span class="flex items-center gap-1.5">
            <i class="pi pi-sitemap" />
            分派規則
            <span class="text-xs text-slate-400">
              ({{ cartStore.routingRules.length }})
            </span>
          </span>
        </Tab>
        <Tab value="discounts">
          <span class="flex items-center gap-1.5">
            <i class="pi pi-percentage" />
            多件優惠
            <span class="text-xs text-slate-400">
              ({{ cartStore.bulkDiscountRules.length }})
            </span>
          </span>
        </Tab>
      </TabList>
      <TabPanels>
        <!-- ==== 購物車清單 ==== -->
        <TabPanel value="carts">
          <div class="flex flex-col gap-3">
            <div
              v-for="g in cartStore.groups"
              :key="g.id"
              class="rounded-xl border border-slate-200 p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <label class="mb-1 block text-xs text-slate-500">
                    賣家名稱
                  </label>
                  <InputText
                    :model-value="g.sellerName"
                    class="w-full"
                    @update:model-value="
                      cartStore.updateCart(g.id, {
                        sellerName: String($event ?? ''),
                      })
                    "
                  />
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-xs text-slate-400">#{{ g.id }}</p>
                  <p class="text-xs text-slate-500">
                    {{ g.items.length }} 件商品
                  </p>
                </div>
              </div>

              <div class="mt-3">
                <p class="mb-1 text-xs text-slate-500">溫層</p>
                <SelectButton
                  :model-value="getTempOf(g)"
                  :options="TEMP_OPTIONS"
                  option-label="label"
                  option-value="value"
                  :allow-empty="true"
                  size="small"
                  @update:model-value="setTempOf(g, $event ?? null)"
                />
              </div>

              <div class="mt-3">
                <p class="mb-1 text-xs text-slate-500">結帳模式</p>
                <SelectButton
                  :model-value="g.checkoutMode"
                  :options="CHECKOUT_MODES"
                  option-label="label"
                  option-value="value"
                  :allow-empty="false"
                  size="small"
                  @update:model-value="
                    cartStore.updateCart(g.id, { checkoutMode: $event })
                  "
                />
                <p class="mt-1 text-xs text-slate-500">
                  {{
                    CHECKOUT_MODES.find((m) => m.value === g.checkoutMode)?.desc
                  }}
                </p>
              </div>

              <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p class="mb-1 text-xs text-slate-500">支援運送方式</p>
                  <div class="flex flex-wrap gap-3">
                    <label
                      v-for="opt in SHIPPING_OPTS"
                      :key="opt.value"
                      class="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <Checkbox
                        :model-value="g.shippingMethods.includes(opt.value)"
                        :binary="true"
                        @update:model-value="
                          cartStore.updateCart(g.id, {
                            shippingMethods: $event
                              ? [...g.shippingMethods, opt.value]
                              : g.shippingMethods.filter(
                                  (m) => m !== opt.value,
                                ),
                          })
                        "
                      />
                      {{ opt.label }}
                    </label>
                  </div>
                </div>
                <div>
                  <p class="mb-1 text-xs text-slate-500">支援付款方式</p>
                  <div class="flex flex-wrap gap-3">
                    <label
                      v-for="opt in PAYMENT_OPTS"
                      :key="opt.value"
                      class="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <Checkbox
                        :model-value="g.paymentMethods.includes(opt.value)"
                        :binary="true"
                        @update:model-value="
                          cartStore.updateCart(g.id, {
                            paymentMethods: $event
                              ? [...g.paymentMethods, opt.value]
                              : g.paymentMethods.filter((m) => m !== opt.value),
                          })
                        "
                      />
                      {{ opt.label }}
                    </label>
                  </div>
                </div>
              </div>

              <div class="mt-3 flex justify-end">
                <Button
                  label="刪除購物車"
                  icon="pi pi-trash"
                  severity="danger"
                  outlined
                  size="small"
                  :disabled="g.items.length > 0"
                  @click="handleRemoveCart(g)"
                />
              </div>
            </div>

            <Button
              label="新增購物車"
              icon="pi pi-plus"
              severity="secondary"
              outlined
              class="!min-h-11 w-full"
              @click="handleAddCart"
            />
          </div>
        </TabPanel>

        <!-- ==== 分派規則 ==== -->
        <TabPanel value="rules">
          <div class="flex flex-col gap-3">
            <p class="text-xs text-slate-500">
              加入商品時，從上到下逐條檢查，第一條命中的規則決定進哪台購物車；沒命中則放到第一台可用的購物車。
            </p>

            <div
              v-for="(rule, idx) in cartStore.routingRules"
              :key="rule.id"
              class="rounded-xl border border-slate-200 p-3"
            >
              <div class="flex items-start gap-3">
                <span
                  class="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600"
                >
                  {{ idx + 1 }}
                </span>
                <div class="min-w-0 flex-1">
                  <div
                    class="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr_auto_1fr]"
                  >
                    <div>
                      <p class="mb-1 text-xs text-slate-500">條件</p>
                      <SelectButton
                        :model-value="rule.condition.type"
                        :options="[
                          { label: '分類', value: 'category' },
                          { label: '商品', value: 'productId' },
                        ]"
                        option-label="label"
                        option-value="value"
                        :allow-empty="false"
                        size="small"
                        @update:model-value="handleChangeRuleType(rule, $event)"
                      />
                    </div>
                    <div>
                      <p class="mb-1 text-xs text-slate-500">值</p>
                      <Select
                        v-if="rule.condition.type === 'category'"
                        :model-value="rule.condition.value"
                        :options="categoryOptions"
                        option-label="label"
                        option-value="value"
                        class="w-full"
                        @update:model-value="
                          cartStore.updateRule(rule.id, {
                            condition: {
                              type: 'category',
                              value: String($event ?? ''),
                            },
                          })
                        "
                      />
                      <Select
                        v-else
                        :model-value="rule.condition.value"
                        :options="productOptions"
                        option-label="label"
                        option-value="value"
                        class="w-full"
                        filter
                        @update:model-value="
                          cartStore.updateRule(rule.id, {
                            condition: {
                              type: 'productId',
                              value: Number($event),
                            },
                          })
                        "
                      />
                    </div>
                    <div class="flex items-end pb-1 text-xs text-slate-500">
                      →
                    </div>
                    <div>
                      <p class="mb-1 text-xs text-slate-500">目標購物車</p>
                      <Select
                        :model-value="rule.targetCartId"
                        :options="cartOptions"
                        option-label="label"
                        option-value="value"
                        class="w-full"
                        @update:model-value="
                          cartStore.updateRule(rule.id, {
                            targetCartId: Number($event),
                          })
                        "
                      />
                    </div>
                  </div>
                </div>
                <div class="flex shrink-0 flex-col gap-1">
                  <Button
                    icon="pi pi-arrow-up"
                    severity="secondary"
                    text
                    size="small"
                    :disabled="idx === 0"
                    aria-label="上移"
                    @click="cartStore.reorderRule(rule.id, idx - 1)"
                  />
                  <Button
                    icon="pi pi-arrow-down"
                    severity="secondary"
                    text
                    size="small"
                    :disabled="idx === cartStore.routingRules.length - 1"
                    aria-label="下移"
                    @click="cartStore.reorderRule(rule.id, idx + 1)"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    size="small"
                    aria-label="刪除"
                    @click="cartStore.removeRule(rule.id)"
                  />
                </div>
              </div>
            </div>

            <Button
              label="新增規則"
              icon="pi pi-plus"
              severity="secondary"
              outlined
              class="!min-h-11 w-full"
              :disabled="cartStore.groups.length === 0"
              @click="handleAddRule"
            />
          </div>
        </TabPanel>

        <!-- ==== 多件優惠 ==== -->
        <TabPanel value="discounts">
          <div class="flex flex-col gap-3">
            <p class="text-xs text-slate-500">
              「買到 N 件、每件變 M
              元」的規則綁在商品上；修改後會即時同步到所有購物車內同商品的顯示與計價。
            </p>

            <div
              v-for="rule in cartStore.bulkDiscountRules"
              :key="rule.id"
              class="rounded-xl border border-slate-200 p-3"
            >
              <div class="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr]">
                <div>
                  <p class="mb-1 text-xs text-slate-500">商品</p>
                  <Select
                    :model-value="rule.productId"
                    :options="productOptions"
                    option-label="label"
                    option-value="value"
                    class="w-full"
                    filter
                    @update:model-value="
                      cartStore.updateBulkDiscountRule(rule.id, {
                        productId: Number($event),
                      })
                    "
                  />
                </div>
                <div>
                  <p class="mb-1 text-xs text-slate-500">門檻數量</p>
                  <InputNumber
                    :model-value="rule.discount.minQty"
                    :min="2"
                    show-buttons
                    button-layout="horizontal"
                    increment-button-icon="pi pi-plus"
                    decrement-button-icon="pi pi-minus"
                    class="w-full"
                    @update:model-value="
                      updateDiscountField(rule, { minQty: Number($event ?? 2) })
                    "
                  />
                </div>
                <div>
                  <p class="mb-1 text-xs text-slate-500">每件單價</p>
                  <InputNumber
                    :model-value="rule.discount.unitPrice"
                    :min="1"
                    mode="currency"
                    currency="TWD"
                    locale="zh-TW"
                    class="w-full"
                    @update:model-value="
                      updateDiscountField(rule, {
                        unitPrice: Number($event ?? 1),
                      })
                    "
                  />
                </div>
              </div>

              <div class="mt-3">
                <p class="mb-1 text-xs text-slate-500">
                  說明（顯示於購物車 / 結帳頁）
                </p>
                <InputText
                  :model-value="rule.discount.note"
                  class="w-full"
                  @update:model-value="
                    updateDiscountField(rule, { note: String($event ?? '') })
                  "
                />
              </div>

              <div class="mt-2 flex justify-end">
                <Button
                  label="刪除規則"
                  icon="pi pi-trash"
                  severity="danger"
                  outlined
                  size="small"
                  @click="cartStore.removeBulkDiscountRule(rule.id)"
                />
              </div>
            </div>

            <Button
              label="新增優惠規則"
              icon="pi pi-plus"
              severity="secondary"
              outlined
              class="!min-h-11 w-full"
              :disabled="productOptions.length === 0"
              @click="handleAddDiscount"
            />
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Dialog>
</template>
