<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import CouponDrawer from '../components/CouponDrawer.vue';
import { useViewportStore } from '../pinia/viewport';
import { useCartStore } from '../pinia/cart';
import { useUiStore } from '../pinia/ui';
import { useAuthStore } from '../pinia/auth';
import { products } from '../data/products';
import lineIcon from '../assets/line.svg';
import instagramIcon from '../assets/instagram.svg';

type SharePlatform = 'facebook' | 'line' | 'instagram' | 'link';

const FACEBOOK_BLUE = '#1877F2';

const route = useRoute();
const router = useRouter();
const cart = useCartStore();
const auth = useAuthStore();
const ui = useUiStore();
const viewport = useViewportStore();

const fromTheme = computed(() => route.query.from === 'theme');
const product = computed(
  () => products.find((p) => p.id === Number(route.params.id)) ?? products[0],
);
const selectedSize = ref(product.value.sizes?.[0] ?? '');
const qty = ref(1);
const activeThumb = ref(0);

/** 組合商品：每個子品的目前選用規格；初始用該子品 spec 預設值。 */
const bundleSelections = ref<string[]>(
  product.value.bundleItems?.map((i) => i.spec) ?? [],
);

/** 任選組合：每個 option 已挑選的數量 + 對應規格。預設 maxQty=1。 */
const pickedQty = ref<Record<number, number>>({});
const pickedSpecs = ref<Record<number, string>>({});
const pickedTotal = computed(() =>
  Object.values(pickedQty.value).reduce((s, n) => s + (n || 0), 0),
);
/** 任選組合需挑選的總件數 = 單組 pickCount × 購買組數（qty）。 */
const totalPickCount = computed(
  () => (product.value.pickCount ?? 0) * qty.value,
);
const isPickFull = computed(
  () =>
    product.value.isPickBundle && pickedTotal.value === totalPickCount.value,
);

/** 縮圖數量：依容器寬度切；屬於計數邏輯而非樣式，保留 viewport store。 */
const thumbCount = computed(() => {
  const id = viewport.current.id;
  if (id === 'pc') return 5;
  if (id === 'mobile') return 3;
  return 4;
});

const isCouponDrawerVisible = ref(false);
const isLoginPromptOpen = ref(false);

/** 單一選項的上限：單組 maxQty × 購買組數（qty）。預設 maxQty=1。 */
const optMaxQty = (opt: { maxQty?: number }): number =>
  (opt.maxQty ?? 1) * qty.value;

/** 此選項可選的數量清單：0 ~ min(maxQty, 目前已選 + 剩餘額度)。 */
const qtyOptionsFor = (opt: { id: number; maxQty?: number }): number[] => {
  const remaining = totalPickCount.value - pickedTotal.value;
  const cur = pickedQty.value[opt.id] ?? 0;
  const max = Math.min(optMaxQty(opt), cur + Math.max(remaining, 0));
  return Array.from({ length: max + 1 }, (_, i) => i);
};

const setPickQty = (opt: { id: number; spec: string }, picked: number) => {
  pickedQty.value = { ...pickedQty.value, [opt.id]: picked };
  if (picked === 0) {
    delete pickedSpecs.value[opt.id];
  } else if (!pickedSpecs.value[opt.id]) {
    pickedSpecs.value[opt.id] = opt.spec;
  }
};

// 查看優惠券：先判斷登入，未登入跳提示彈窗
const handleOpenCoupons = () => {
  if (auth.isLoggedIn) isCouponDrawerVisible.value = true;
  else isLoginPromptOpen.value = true;
};

const handleGoLogin = () => {
  isLoginPromptOpen.value = false;
  router.push({ path: '/login', query: { redirect: route.fullPath } });
};

const handleAddToCart = () => {
  if (product.value.isPickBundle) {
    const need = totalPickCount.value;
    if (pickedTotal.value !== need) {
      ui.toast(`請選擇 ${need} 件商品`, 'warn');
      return;
    }
  }
  let specLabel = selectedSize.value || '預設';
  let customBundle:
    | { name: string; image?: string; spec: string; qty: number }[]
    | undefined;
  if (product.value.isPickBundle) {
    const picked = Object.entries(pickedQty.value)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, n]) => {
        const opt = product.value.pickOptions?.find((o) => o.id === Number(id));
        const spec = pickedSpecs.value[Number(id)] ?? opt?.spec ?? '預設';
        return { id: Number(id), opt, spec, qty: n as number };
      });
    specLabel = picked
      .map((p) => `${p.opt?.name ?? ''}（${p.spec}）× ${p.qty}`)
      .join(' / ');
    customBundle = picked.map((p) => ({
      name: p.opt?.name ?? '',
      image: p.opt?.image,
      spec: p.spec,
      qty: p.qty,
    }));
  } else if (product.value.isBundle && bundleSelections.value.length > 0) {
    specLabel = bundleSelections.value.join(' / ');
  }
  cart.addItem(
    {
      id: product.value.id,
      name: product.value.name,
      price: product.value.price,
      original: product.value.original,
      image: product.value.image,
    },
    specLabel,
    qty.value,
    customBundle,
  );
  ui.toast('已加入購物車');
};

const handleShareTo = (platform: SharePlatform) => {
  const url = window.location.href;
  if (platform === 'facebook') {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,width=600,height=500',
    );
  } else if (platform === 'line') {
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,width=600,height=500',
    );
  } else if (platform === 'instagram') {
    ui.toast('Instagram 不支援網頁分享，請截圖分享', 'info');
  } else {
    navigator.clipboard?.writeText(url).then(
      () => ui.toast('已複製商品連結'),
      () => ui.toast('複製失敗，請手動複製網址', 'error'),
    );
  }
};

const handlePrevThumb = () => {
  activeThumb.value =
    (activeThumb.value - 1 + thumbCount.value) % thumbCount.value;
};
const handleNextThumb = () => {
  activeThumb.value = (activeThumb.value + 1) % thumbCount.value;
};
</script>

<template>
  <div class="min-h-screen" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <main
      class="mx-auto max-w-7xl"
      style="padding: var(--page-pad-y) var(--page-pad-x)"
    >
      <div class="flex flex-col" style="gap: var(--stack-gap)">
        <!-- Breadcrumb（手機超過容器寬 → 商品名 truncate 顯示 ...） -->
        <nav
          class="flex min-w-0 items-center gap-[7px] overflow-hidden py-1 text-sm"
        >
          <Button
            icon="pi pi-home"
            severity="secondary"
            text
            rounded
            class="!min-h-11 !min-w-11 shrink-0"
            @click="router.push('/shop')"
          />
          <i class="pi pi-chevron-right shrink-0 text-xs text-slate-400" />
          <!-- 從主題館進來：中間段顯示「返回」回上一頁 -->
          <Button
            v-if="fromTheme"
            label="返回"
            severity="secondary"
            text
            class="shrink-0 !font-medium !text-slate-500"
            @click="router.back()"
          />
          <Button
            v-else-if="product.category"
            :label="product.category"
            severity="secondary"
            text
            class="shrink-0 !font-medium !text-slate-500"
            @click="
              router.push(`/category/${encodeURIComponent(product.category!)}`)
            "
          />
          <i class="pi pi-chevron-right shrink-0 text-xs text-slate-400" />
          <span class="min-w-0 flex-1 truncate text-slate-500">{{
            product.name
          }}</span>
        </nav>

        <!-- Product card -->
        <div
          class="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)]"
        >
          <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-6 @3xl:flex-row @3xl:items-start">
              <!-- Left: main image + thumbnails -->
              <div
                class="flex flex-col gap-3 @3xl:w-[320px] @3xl:shrink-0 @7xl:w-[513px]"
              >
                <!-- Main image -->
                <div
                  class="aspect-square w-full overflow-hidden rounded-lg bg-slate-200 @3xl:aspect-[4/5] @7xl:aspect-square"
                >
                  <ProductImage
                    :src="product.image"
                    :alt="product.name"
                    size="lg"
                  />
                </div>

                <!-- Thumbnails -->
                <div class="flex items-center gap-1">
                  <Button
                    icon="pi pi-chevron-left"
                    severity="secondary"
                    text
                    rounded
                    class="!min-h-11 !min-w-11 shrink-0"
                    @click="handlePrevThumb"
                  />
                  <div class="flex flex-1 justify-between gap-1.5">
                    <div
                      v-for="i in thumbCount"
                      :key="i"
                      class="aspect-square flex-1 cursor-pointer overflow-hidden rounded-md bg-[#d9d9d9] transition-all"
                      :class="
                        activeThumb === i - 1
                          ? 'ring-2'
                          : 'opacity-70 hover:opacity-100'
                      "
                      :style="
                        activeThumb === i - 1
                          ? 'outline: 2px solid var(--primary)'
                          : ''
                      "
                      @click="activeThumb = i - 1"
                    >
                      <ProductImage
                        v-if="i === 1"
                        :src="product.image"
                        :alt="product.name"
                        size="sm"
                      />
                    </div>
                  </div>
                  <Button
                    icon="pi pi-chevron-right"
                    severity="secondary"
                    text
                    rounded
                    class="!min-h-11 !min-w-11 shrink-0"
                    @click="handleNextThumb"
                  />
                </div>
              </div>

              <!-- Right: product info -->
              <div class="flex min-w-0 flex-1 flex-col gap-4">
                <!-- Name -->
                <h1 class="text-2xl leading-snug font-bold text-slate-950">
                  {{ product.name }}
                </h1>

                <!-- Price block -->
                <div
                  class="flex items-end gap-4 rounded-lg bg-gray-50 px-4 py-4"
                >
                  <span
                    class="text-2xl leading-none font-bold @7xl:text-3xl"
                    style="color: var(--primary)"
                  >
                    ${{ product.price }}
                  </span>
                  <span
                    class="text-base font-medium text-slate-500 line-through @7xl:text-xl"
                  >
                    ${{ product.original }}
                  </span>
                </div>

                <!-- Coupon -->
                <div class="flex items-center gap-6">
                  <span class="w-20 shrink-0 text-sm text-slate-700"
                    >賣場優惠券</span
                  >
                  <span
                    v-if="product.noCoupon || product.isBundle"
                    class="px-3 text-sm text-slate-700"
                  >
                    ＊已為優惠商品，不適用任何優惠券
                  </span>
                  <Button
                    v-else
                    label="查看可使用的優惠券"
                    icon="pi pi-arrow-up-right"
                    icon-pos="right"
                    link
                    size="small"
                    @click="handleOpenCoupons"
                  />
                </div>

                <!-- Size -->
                <div
                  v-if="
                    !product.isBundle &&
                    product.hasVariant &&
                    product.sizes?.length
                  "
                  class="flex items-center gap-6"
                >
                  <span class="w-20 shrink-0 text-sm text-slate-700">尺碼</span>
                  <SelectButton
                    v-model="selectedSize"
                    :options="product.sizes"
                    :allow-empty="false"
                  />
                </div>

                <!-- Quantity -->
                <div class="flex items-center gap-6">
                  <span class="w-20 shrink-0 text-sm text-slate-700">數量</span>
                  <div class="flex items-center gap-4">
                    <InputNumber
                      v-model="qty"
                      :min="1"
                      show-buttons
                      button-layout="horizontal"
                      increment-button-icon="pi pi-plus"
                      decrement-button-icon="pi pi-minus"
                      class="qty-stepper"
                    />
                    <span class="text-sm text-slate-700">
                      還剩{{ product.stock ?? 1
                      }}{{ product.isBundle ? '組' : '件' }}
                    </span>
                  </div>
                </div>

                <!-- Add to cart（手機由底部 sticky bar 取代，這裡 @3xl 以上才顯示） -->
                <div class="hidden items-center @3xl:flex">
                  <Button
                    label="加入購物車"
                    icon="pi pi-cart-plus"
                    class="!min-h-12"
                    @click="handleAddToCart"
                  />
                </div>

                <!-- Share -->
                <div
                  class="flex items-center gap-0 border-t border-slate-200 pt-1"
                >
                  <Button
                    label="分享"
                    severity="secondary"
                    text
                    class="shrink-0 !font-medium whitespace-nowrap !text-slate-700"
                    @click="handleShareTo('facebook')"
                  >
                    <i
                      class="pi pi-facebook text-base"
                      :style="{ color: FACEBOOK_BLUE }"
                    />
                    分享
                  </Button>
                  <div class="h-5 w-px bg-slate-200" />
                  <Button
                    severity="secondary"
                    text
                    class="shrink-0 !font-medium whitespace-nowrap !text-slate-700"
                    @click="handleShareTo('line')"
                  >
                    <img :src="lineIcon" alt="LINE" class="h-4 w-4" />
                    分享
                  </Button>
                  <div class="h-5 w-px bg-slate-200" />
                  <Button
                    severity="secondary"
                    text
                    class="shrink-0 !font-medium whitespace-nowrap !text-slate-700"
                    @click="handleShareTo('instagram')"
                  >
                    <img :src="instagramIcon" alt="Instagram" class="h-4 w-4" />
                    分享
                  </Button>
                  <div class="h-5 w-px bg-slate-200" />
                  <Button
                    label="連結分享"
                    severity="secondary"
                    text
                    class="shrink-0 !font-medium whitespace-nowrap !text-slate-700"
                    @click="handleShareTo('link')"
                  >
                    <i
                      class="pi pi-link text-base"
                      style="color: var(--primary)"
                    />
                    連結分享
                  </Button>
                </div>
              </div>
            </div>

            <!-- 任選組合 section：從 pickOptions 挑 pickCount 件 -->
            <div
              v-if="product.isPickBundle && product.pickOptions?.length"
              class="flex flex-col gap-4"
            >
              <div
                class="flex items-center justify-between rounded-t border-b-2 px-4 py-2"
                style="
                  background: color-mix(
                    in srgb,
                    var(--primary) 8%,
                    transparent
                  );
                  border-color: var(--primary);
                "
              >
                <span class="text-lg font-semibold text-slate-700">
                  商品組合（請選擇 {{ totalPickCount }} 件商品）
                </span>
                <span class="text-sm font-medium" style="color: var(--primary)">
                  已選 {{ pickedTotal }} / {{ totalPickCount }}
                </span>
              </div>

              <div class="flex flex-wrap gap-4">
                <div
                  v-for="opt in product.pickOptions"
                  :key="opt.id"
                  class="relative flex w-[calc((100%-1rem)/2)] flex-col gap-2 overflow-hidden rounded-lg border-2 p-2 transition @3xl:w-[180px] @7xl:w-[243px]"
                  :class="
                    (pickedQty[opt.id] ?? 0) > 0
                      ? 'border-[color:var(--primary)] bg-[color:color-mix(in_srgb,var(--primary)_6%,transparent)]'
                      : 'border-slate-200'
                  "
                >
                  <div
                    class="aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-slate-200"
                  >
                    <ProductImage :src="opt.image" :alt="opt.name" size="sm" />
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <div class="flex flex-col gap-0.5">
                      <p
                        class="line-clamp-2 h-10 overflow-hidden text-sm leading-snug text-slate-950 @7xl:h-[44px] @7xl:text-base"
                      >
                        {{ opt.name }}
                      </p>
                      <p
                        v-if="
                          opt.maxQty != null &&
                          opt.maxQty < (product.pickCount ?? 0)
                        "
                        class="text-xs font-medium text-red-500"
                      >
                        限購 {{ optMaxQty(opt) }} 個
                      </p>
                    </div>
                    <div class="flex flex-col gap-2 text-sm text-slate-700">
                      <div
                        v-if="opt.specOptions?.length"
                        class="flex items-center gap-2"
                      >
                        <span class="shrink-0 text-slate-500">規格</span>
                        <Select
                          :model-value="pickedSpecs[opt.id] ?? opt.spec"
                          :options="opt.specOptions"
                          size="small"
                          fluid
                          class="min-w-0 flex-1"
                          @update:model-value="(v) => (pickedSpecs[opt.id] = v)"
                        />
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="shrink-0 text-slate-500">數量</span>
                        <Select
                          :model-value="pickedQty[opt.id] ?? 0"
                          :options="qtyOptionsFor(opt)"
                          size="small"
                          fluid
                          class="min-w-0 flex-1"
                          @update:model-value="(v) => setPickQty(opt, v)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 既有 Bundle items section -->
            <div
              v-else-if="product.isBundle && product.bundleItems?.length"
              class="flex flex-col gap-4"
            >
              <div
                class="flex items-center rounded-t border-b-2 px-4 py-2"
                style="
                  background: color-mix(
                    in srgb,
                    var(--primary) 8%,
                    transparent
                  );
                  border-color: var(--primary);
                "
              >
                <span class="text-lg font-semibold text-slate-700"
                  >組合商品內容</span
                >
              </div>

              <div class="flex flex-wrap gap-4">
                <div
                  v-for="(item, idx) in product.bundleItems"
                  :key="idx"
                  class="flex w-[calc((100%-1rem)/2)] flex-col gap-2 rounded-lg p-2 @3xl:w-[180px] @7xl:w-[243px]"
                >
                  <div
                    class="aspect-square w-full overflow-hidden rounded-lg bg-slate-200"
                  >
                    <ProductImage :src="item.image" :alt="item.name" size="md" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <p
                      class="line-clamp-2 text-sm leading-snug text-slate-950 @7xl:text-base"
                    >
                      {{ item.name }}
                    </p>
                    <div class="flex flex-col gap-1.5 text-sm text-slate-700">
                      <div class="flex items-center gap-2">
                        <span class="shrink-0 text-slate-500">規格</span>
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
                      <div class="flex gap-4">
                        <span class="text-slate-500">數量</span>
                        <span>{{ item.qty * qty }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 商品詳情區塊（所有尺寸都顯示，參照蝦皮 / MOMO 排版） -->
        <div
          class="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)]"
        >
          <!-- Header -->
          <div
            class="flex items-center border-b-2 px-4 py-3"
            style="
              background: color-mix(in srgb, var(--primary) 8%, transparent);
              border-color: var(--primary);
            "
          >
            <span class="text-base font-semibold text-slate-700 @7xl:text-lg"
              >商品詳情</span
            >
          </div>

          <div class="flex flex-col gap-4 p-4 @7xl:gap-6 @7xl:p-6">
            <!-- 商品介紹（圖文交錯） -->
            <section class="flex flex-col gap-3">
              <div
                class="flex flex-col gap-4 text-sm leading-relaxed text-slate-700"
              >
                <!-- 大圖 1：情境照 -->
                <figure class="flex flex-col gap-2">
                  <div
                    class="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100 @7xl:aspect-video"
                  >
                    <ProductImage
                      src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&fit=crop"
                      alt="情境照"
                      size="lg"
                    />
                  </div>
                  <figcaption class="text-center text-xs text-slate-500">
                    情境穿搭 ｜ 柔軟有機棉，親膚不刺激
                  </figcaption>
                </figure>

                <p>
                  本款商品採用親膚棉質面料，柔軟透氣，適合寶寶嬌嫩肌膚日常穿著；版型寬鬆舒適，不悶熱、不勒身。
                </p>

                <!-- 雙圖：細節 -->
                <div class="grid grid-cols-2 gap-3">
                  <figure class="flex flex-col gap-1.5">
                    <div
                      class="aspect-square overflow-hidden rounded-lg bg-slate-100"
                    >
                      <ProductImage
                        src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&fit=crop"
                        alt="細節照 1"
                        size="md"
                      />
                    </div>
                    <figcaption class="text-center text-xs text-slate-500">
                      細節 ｜ 無骨縫合，柔軟貼身
                    </figcaption>
                  </figure>
                  <figure class="flex flex-col gap-1.5">
                    <div
                      class="aspect-square overflow-hidden rounded-lg bg-slate-100"
                    >
                      <ProductImage
                        src="https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&fit=crop"
                        alt="細節照 2"
                        size="md"
                      />
                    </div>
                    <figcaption class="text-center text-xs text-slate-500">
                      壓扣 ｜ 優質防滑、穿脫順手
                    </figcaption>
                  </figure>
                </div>

                <p>
                  細節做工嚴謹：採用無骨縫合與包邊處理，搭配防滑壓扣與優質鬆緊帶，穿脫順手、不勒紅小手腳。
                </p>

                <ul class="flex list-disc flex-col gap-1 pl-5">
                  <li>親膚透氣，四季可穿，適合 0~12 歲。</li>
                  <li>環保染色，無甲醛無熒光劑，敏感肌也安心。</li>
                  <li>機洗手洗皆可，不易掉色變形。</li>
                </ul>

                <!-- 大圖 2：材質特寫 -->
                <figure class="flex flex-col gap-2">
                  <div
                    class="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100 @7xl:aspect-video"
                  >
                    <ProductImage
                      src="https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=1200&fit=crop"
                      alt="材質特寫"
                      size="lg"
                    />
                  </div>
                  <figcaption class="text-center text-xs text-slate-500">
                    面料特寫 ｜ 100% 純棉，柔軟舒適
                  </figcaption>
                </figure>

                <p class="text-xs text-slate-400">
                  ※ 因螢幕與光線差異，實物色差請以實品為準。
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>

    <!-- 手機版 sticky 加入購物車 bar（@3xl 以上隱藏） -->
    <div
      class="sticky bottom-0 z-40 flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-3 @3xl:hidden"
      style="padding-bottom: max(12px, env(safe-area-inset-bottom))"
    >
      <div class="flex shrink-0 flex-col leading-tight">
        <span class="text-xs text-slate-500 line-through"
          >${{ product.original }}</span
        >
        <span class="text-xl font-bold" style="color: var(--primary)">
          ${{ product.price }}
        </span>
      </div>
      <Button
        label="加入購物車"
        icon="pi pi-cart-plus"
        class="!min-h-12 flex-1"
        @click="handleAddToCart"
      />
    </div>
  </div>

  <CouponDrawer v-model:visible="isCouponDrawerVisible" />

  <!-- 未登入提示彈窗 -->
  <Dialog
    v-model:visible="isLoginPromptOpen"
    modal
    header="會員專屬優惠"
    :draggable="false"
    :closable="false"
    :style="{ width: '20rem' }"
  >
    <p class="text-sm leading-relaxed text-slate-700">
      登入會員即可查看與領取可使用的優惠券，要先登入嗎？
    </p>
    <template #footer>
      <Button
        label="再逛逛"
        severity="secondary"
        outlined
        @click="isLoginPromptOpen = false"
      />
      <Button label="去登入" @click="handleGoLogin" />
    </template>
  </Dialog>
</template>
