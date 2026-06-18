<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import CouponDrawer from '../components/CouponDrawer.vue'
import { useViewportStore } from '../stores/viewport'
import { useCartStore } from '../stores/cart'
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'
import { products } from '../data/products'
import lineIcon from '../assets/line.svg'
import instagramIcon from '../assets/instagram.svg'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const auth = useAuthStore()
const vp = computed(() => useViewportStore().current.id)
const isPC = computed(() => vp.value === 'pc')
const isMobile = computed(() => vp.value === 'mobile')

const fromTheme = computed(() => route.query.from === 'theme')
const product = computed(() => products.find(p => p.id === Number(route.params.id)) ?? products[0])
const selectedSize = ref(product.value.sizes?.[0] ?? '')
const qty = ref(1)
const activeThumb = ref(0)

/** 組合商品：每個子品的目前選用規格；初始用該子品 spec 預設值。 */
const bundleSelections = ref<string[]>(
  product.value.bundleItems?.map(i => i.spec) ?? [],
)

/** 任選組合：每個 option 已挑選的數量 + 對應規格。預設 maxQty=1。 */
const pickedQty = ref<Record<number, number>>({})
const pickedSpecs = ref<Record<number, string>>({})
const pickedTotal = computed(() =>
  Object.values(pickedQty.value).reduce((s, n) => s + (n || 0), 0),
)
/** 任選組合需挑選的總件數 = 單組 pickCount × 購買組數（qty）。 */
const totalPickCount = computed(() => (product.value.pickCount ?? 0) * qty.value)
const isPickFull = computed(() =>
  product.value.isPickBundle && pickedTotal.value === totalPickCount.value,
)
/** 單一選項的上限：單組 maxQty × 購買組數（qty）。預設 maxQty=1。 */
function optMaxQty(opt: { maxQty?: number }): number {
  return (opt.maxQty ?? 1) * qty.value
}
/** 此選項可選的數量清單：0 ~ min(maxQty, 目前已選 + 剩餘額度)。 */
function qtyOptionsFor(opt: { id: number; maxQty?: number }): number[] {
  const remaining = totalPickCount.value - pickedTotal.value
  const cur = pickedQty.value[opt.id] ?? 0
  const max = Math.min(optMaxQty(opt), cur + Math.max(remaining, 0))
  return Array.from({ length: max + 1 }, (_, i) => i)
}
function setPickQty(opt: { id: number; spec: string }, qty: number): void {
  pickedQty.value = { ...pickedQty.value, [opt.id]: qty }
  if (qty === 0) {
    delete pickedSpecs.value[opt.id]
  } else if (!pickedSpecs.value[opt.id]) {
    pickedSpecs.value[opt.id] = opt.spec
  }
}

/** 商品詳情 mock：規格表 + 介紹段落（讓所有商品都有相同詳情區塊）。 */
const detailSpecs = computed(() => [
  { label: '商品編號', value: `P-${String(product.value.id).padStart(5, '0')}` },
  { label: '商品分類', value: product.value.category ?? '—' },
  { label: '商品材質', value: '純棉 / 棉混紡' },
  { label: '產地', value: '台灣' },
  { label: '適用年齡', value: '0~12 歲' },
  { label: '洗滌方式', value: '機洗 / 手洗皆可，請翻面洗滌' },
  { label: product.value.isBundle ? '組合內容' : '尺碼資訊', value: product.value.isBundle ? `${product.value.bundleItems?.length ?? 0} 件組合` : (product.value.sizes?.join(' / ') ?? '單一尺寸') },
])

const thumbCount = computed(() => isPC.value ? 5 : isMobile.value ? 3 : 4)
const showCouponDrawer = ref(false)
const loginPromptOpen = ref(false)
const ui = useUiStore()

// 查看優惠券：先判斷登入，未登入跳提示彈窗
function openCoupons() {
  if (auth.isLoggedIn) showCouponDrawer.value = true
  else loginPromptOpen.value = true
}
function goLoginForCoupons() {
  loginPromptOpen.value = false
  router.push({ path: '/login', query: { redirect: route.fullPath } })
}

function addToCart() {
  if (product.value.isPickBundle) {
    const need = totalPickCount.value
    if (pickedTotal.value !== need) {
      ui.toast(`請選擇 ${need} 件商品`)
      return
    }
  }
  let specLabel = selectedSize.value || '預設'
  let customBundle: { name: string; image?: string; spec: string; qty: number }[] | undefined
  if (product.value.isPickBundle) {
    const picked = Object.entries(pickedQty.value)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, n]) => {
        const opt = product.value.pickOptions?.find(o => o.id === Number(id))
        const spec = pickedSpecs.value[Number(id)] ?? opt?.spec ?? '預設'
        return { id: Number(id), opt, spec, qty: n as number }
      })
    specLabel = picked.map(p => `${p.opt?.name ?? ''}（${p.spec}）× ${p.qty}`).join(' / ')
    customBundle = picked.map(p => ({
      name: p.opt?.name ?? '',
      image: p.opt?.image,
      spec: p.spec,
      qty: p.qty,
    }))
  } else if (product.value.isBundle && bundleSelections.value.length > 0) {
    specLabel = bundleSelections.value.join(' / ')
  }
  cart.addItem(
    { id: product.value.id, name: product.value.name, price: product.value.price, original: product.value.original, image: product.value.image },
    specLabel,
    qty.value,
    customBundle,
  )
  ui.toast('已加入購物車')
}

function shareTo(platform: 'facebook' | 'line' | 'instagram' | 'link') {
  const url = window.location.href
  if (platform === 'facebook') {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,width=600,height=500')
  } else if (platform === 'line') {
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`, '_blank', 'noopener,width=600,height=500')
  } else if (platform === 'instagram') {
    ui.toast('Instagram 不支援網頁分享，請截圖分享')
  } else {
    navigator.clipboard?.writeText(url).then(
      () => ui.toast('已複製商品連結'),
      () => ui.toast('複製失敗，請手動複製網址'),
    )
  }
}
</script>

<template>
  <div class="min-h-screen" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <main class="max-w-[1280px] mx-auto" style="padding: var(--page-pad-y) var(--page-pad-x)">
      <div class="flex flex-col" style="gap: var(--stack-gap)">

        <!-- Breadcrumb（手機超過容器寬 → 商品名 truncate 顯示 ...） -->
        <nav class="flex items-center gap-[7px] text-sm py-1 min-w-0 overflow-hidden">
          <button class="text-[#64748b] hover:text-[color:var(--primary)] transition-colors shrink-0" @click="router.push('/shop')">
            <i class="pi pi-home text-xs" />
          </button>
          <i class="pi pi-chevron-right text-[10px] text-[#94a3b8] shrink-0" />
          <!-- 從主題館進來：中間段顯示「返回」回上一頁 -->
          <button
            v-if="fromTheme"
            class="font-medium text-[#64748b] hover:underline shrink-0 whitespace-nowrap"
            @click="router.back()"
          >返回</button>
          <button
            v-else-if="product.category"
            class="font-medium text-[#64748b] hover:underline shrink-0 whitespace-nowrap"
            @click="router.push(`/category/${encodeURIComponent(product.category!)}`)"
          >{{ product.category }}</button>
          <i class="pi pi-chevron-right text-[10px] text-[#94a3b8] shrink-0" />
          <span class="text-[#64748b] flex-1 min-w-0 truncate">{{ product.name }}</span>
        </nav>

        <!-- Product card -->
        <div class="bg-white rounded-xl shadow-[0px_1px_2px_rgba(0,0,0,0.1),0px_1px_3px_rgba(0,0,0,0.1)] p-4">
          <div class="flex flex-col gap-6">
          <div class="flex gap-6" :class="isMobile ? 'flex-col' : 'flex-row items-start'">

            <!-- Left: main image + thumbnails -->
            <div class="flex flex-col gap-3" :class="isPC ? 'w-[513px] shrink-0' : isMobile ? 'w-full' : 'w-[320px] shrink-0'">
              <!-- Main image -->
              <div class="w-full bg-[#d9d9d9] rounded-[8px] overflow-hidden flex items-center justify-center"
                   :class="isPC ? 'h-[512px]' : isMobile ? 'h-[280px]' : 'h-[320px]'">
                <img v-if="product.image" :src="product.image" :alt="product.name" class="w-full h-full object-cover" />
                <div v-else class="flex flex-col items-center justify-center gap-2">
                  <i class="pi pi-hammer text-gray-400" :class="isPC ? 'text-6xl' : 'text-5xl'" />
                  <span class="text-sm text-gray-400">圖片施工中</span>
                </div>
              </div>

              <!-- Thumbnails -->
              <div class="flex items-center gap-1">
                <button
                  class="flex items-center justify-center w-7 h-7 rounded-[6px] hover:bg-gray-100 shrink-0 text-[#64748b]"
                  @click="activeThumb = (activeThumb - 1 + thumbCount) % thumbCount"
                >
                  <i class="pi pi-chevron-left text-xs" />
                </button>
                <div class="flex flex-1 justify-between gap-1.5">
                  <div
                    v-for="i in thumbCount"
                    :key="i"
                    class="flex-1 aspect-square bg-[#d9d9d9] rounded-[6px] overflow-hidden cursor-pointer transition-all"
                    :class="activeThumb === i - 1 ? 'ring-2' : 'opacity-70 hover:opacity-100'"
                    :style="activeThumb === i - 1 ? 'outline: 2px solid var(--primary)' : ''"
                    @click="activeThumb = i - 1"
                  >
                    <img v-if="i === 1 && product.image" :src="product.image" :alt="product.name" class="w-full h-full object-cover" />
                  </div>
                </div>
                <button
                  class="flex items-center justify-center w-7 h-7 rounded-[6px] hover:bg-gray-100 shrink-0 text-[#64748b]"
                  @click="activeThumb = (activeThumb + 1) % thumbCount"
                >
                  <i class="pi pi-chevron-right text-xs" />
                </button>
              </div>
            </div>

            <!-- Right: product info -->
            <div class="flex-1 flex flex-col gap-4 min-w-0">

              <!-- Name -->
              <h1 class="font-bold text-[#020617] leading-snug text-2xl">
                {{ product.name }}
              </h1>

              <!-- Price block -->
              <div class="bg-[#f7f7f7] rounded-lg px-4 py-4 flex items-end gap-4">
                <span class="font-bold leading-none" style="color: var(--primary)" :class="isPC ? 'text-[32px]' : 'text-2xl'">
                  ${{ product.price }}
                </span>
                <span class="font-medium text-[#64748b] line-through" :class="isPC ? 'text-[20px]' : 'text-base'">
                  ${{ product.original }}
                </span>
              </div>

              <!-- Coupon -->
              <div class="flex items-center gap-6">
                <span class="text-sm text-[#334155] w-[80px] shrink-0">賣場優惠券</span>
                <span v-if="product.noCoupon || product.isBundle" class="text-sm text-[#334155] px-3">
                  ＊已為優惠商品，不適用任何優惠券
                </span>
                <Button
                  v-else
                  label="查看可使用的優惠券"
                  icon="pi pi-arrow-up-right"
                  icon-pos="right"
                  link
                  size="small"
                  @click="openCoupons"
                />
              </div>

              <!-- Size (hidden for bundle products) -->
              <div class="flex items-center gap-6" v-if="!product.isBundle && product.hasVariant && product.sizes?.length">
                <span class="text-sm text-[#334155] w-[80px] shrink-0">尺碼</span>
                <SelectButton v-model="selectedSize" :options="product.sizes" :allow-empty="false" />
              </div>

              <!-- Quantity -->
              <div class="flex items-center gap-6">
                <span class="text-sm text-[#334155] w-[80px] shrink-0">數量</span>
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
                  <span class="text-sm text-[#334155]">還剩{{ product.stock ?? 1 }}{{ product.isBundle ? '組' : '件' }}</span>
                </div>
              </div>

              <!-- Add to cart（手機改用底部 sticky bar） -->
              <div v-if="!isMobile" class="flex items-center">
                <Button
                  label="加入購物車"
                  icon="pi pi-cart-plus"
                  class="!min-h-[48px]"
                  @click="addToCart"
                />
              </div>

              <!-- Share -->
              <div class="flex items-center gap-0 pt-1 border-t border-[#e2e8f0]">
                <button class="flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-gray-50 text-sm font-medium text-[#334155] transition-colors whitespace-nowrap shrink-0" @click="shareTo('facebook')">
                  <i class="pi pi-facebook text-[#1877F2] text-base" />
                  分享
                </button>
                <div class="w-px h-5 bg-[#e2e8f0]" />
                <button class="flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-gray-50 text-sm font-medium text-[#334155] transition-colors whitespace-nowrap shrink-0" @click="shareTo('line')">
                  <img :src="lineIcon" alt="LINE" class="w-4 h-4" />
                  分享
                </button>
                <div class="w-px h-5 bg-[#e2e8f0]" />
                <button class="flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-gray-50 text-sm font-medium text-[#334155] transition-colors whitespace-nowrap shrink-0" @click="shareTo('instagram')">
                  <img :src="instagramIcon" alt="Instagram" class="w-4 h-4" />
                  分享
                </button>
                <div class="w-px h-5 bg-[#e2e8f0]" />
                <button class="flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-gray-50 text-sm font-medium text-[#334155] transition-colors whitespace-nowrap shrink-0" @click="shareTo('link')">
                  <i class="pi pi-link text-base" style="color: var(--primary)" />
                  連結分享
                </button>
              </div>

            </div>
          </div>

          <!-- 任選組合 section：從 pickOptions 挑 pickCount 件 -->
          <div v-if="product.isPickBundle && product.pickOptions?.length" class="flex flex-col gap-4">
            <div
              class="flex items-center justify-between px-4 py-2 rounded-t-[4px] border-b-2"
              style="background: color-mix(in srgb, var(--primary) 8%, transparent); border-color: var(--primary)"
            >
              <span class="text-[18px] font-semibold text-[#334155]">
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
                class="flex flex-col gap-2 p-2 rounded-[8px] border-2 transition relative overflow-hidden"
                :class="[
                  isPC
                    ? 'w-[243px]'
                    : isMobile
                      ? 'w-[calc((100%-1rem)/2)]'
                      : 'w-[180px]',
                  (pickedQty[opt.id] ?? 0) > 0
                    ? 'border-[color:var(--primary)] bg-[color:color-mix(in_srgb,var(--primary)_6%,transparent)]'
                    : 'border-[#e2e8f0]',
                ]"
              >
                <div class="aspect-[332/320] w-full bg-[#d9d9d9] rounded-[8px] overflow-hidden shrink-0">
                  <img v-if="opt.image" :src="opt.image" :alt="opt.name" class="w-full h-full object-cover" />
                </div>

                <div class="flex flex-col gap-1.5">
                  <!-- 上：商品名與限購提示 -->
                  <div class="flex flex-col gap-0.5">
                    <p
                      class="text-[#020617] leading-snug line-clamp-2 overflow-hidden"
                      :class="isPC ? 'text-[16px] h-[44px]' : 'text-sm h-[40px]'"
                    >{{ opt.name }}</p>
                    <p
                      v-if="opt.maxQty != null && opt.maxQty < (product.pickCount ?? 0)"
                      class="text-xs font-medium"
                      style="color: #ef4444"
                    >限購 {{ optMaxQty(opt) }} 個</p>
                  </div>
                  <!-- 下：規格 + 數量（緊接限購文字，移除 mt-auto 避免出現大片空白） -->
                  <div class="flex flex-col gap-2">
                    <div v-if="opt.specOptions?.length" class="flex items-center gap-2 text-sm text-[#334155]">
                      <span class="shrink-0 text-[#64748b]">規格</span>
                      <Select
                        :model-value="pickedSpecs[opt.id] ?? opt.spec"
                        :options="opt.specOptions"
                        size="small"
                        fluid
                        class="flex-1 min-w-0"
                        @update:model-value="(v) => (pickedSpecs[opt.id] = v)"
                      />
                    </div>
                    <div class="flex items-center gap-2 text-sm text-[#334155]">
                      <span class="shrink-0 text-[#64748b]">數量</span>
                      <Select
                        :model-value="pickedQty[opt.id] ?? 0"
                        :options="qtyOptionsFor(opt)"
                        size="small"
                        fluid
                        class="flex-1 min-w-0"
                        @update:model-value="(v) => setPickQty(opt, v)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 既有 Bundle items section -->
          <div v-else-if="product.isBundle && product.bundleItems?.length" class="flex flex-col gap-4">
            <!-- Section header -->
            <div
              class="flex items-center px-4 py-2 rounded-t-[4px] border-b-2"
              style="background: color-mix(in srgb, var(--primary) 8%, transparent); border-color: var(--primary)"
            >
              <span class="text-[18px] font-semibold text-[#334155]">組合商品內容</span>
            </div>

            <!-- Items grid：手機 2 欄填滿區塊寬，PC 維持 243px 固定卡片 -->
            <div class="flex flex-wrap gap-4">
              <div
                v-for="(item, idx) in product.bundleItems"
                :key="idx"
                class="flex flex-col gap-2 p-2 rounded-[8px]"
                :class="isPC ? 'w-[243px]' : isMobile ? 'w-[calc((100%-1rem)/2)]' : 'w-[180px]'"
              >
                <!-- Image -->
                <div class="aspect-[332/320] w-full bg-[#d9d9d9] rounded-[8px] overflow-hidden">
                  <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                    <i class="pi pi-image text-2xl" />
                  </div>
                </div>
                <!-- Info -->
                <div class="flex flex-col gap-1.5">
                  <p class="text-[#020617] leading-snug line-clamp-2" :class="isPC ? 'text-[16px]' : 'text-sm'">{{ item.name }}</p>
                  <div class="flex flex-col gap-1.5 text-sm text-[#334155]">
                    <!-- 規格：specOptions 存在 → 下拉可選；否則維持文字 -->
                    <div class="flex items-center gap-2">
                      <span class="shrink-0 text-[#64748b]">規格</span>
                      <Select
                        v-if="item.specOptions?.length"
                        v-model="bundleSelections[idx]"
                        :options="item.specOptions"
                        size="small"
                        fluid
                        class="flex-1 min-w-0"
                      />
                      <span v-else>{{ item.spec }}</span>
                    </div>
                    <div class="flex gap-4">
                      <span class="text-[#64748b]">數量</span>
                      <span>{{ item.qty * qty }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          </div><!-- /flex-col gap-6 -->
        </div>

        <!-- 商品詳情區塊（所有尺寸都顯示，參照蝦皮 / MOMO 排版） -->
        <div class="bg-white rounded-xl shadow-[0px_1px_2px_rgba(0,0,0,0.1),0px_1px_3px_rgba(0,0,0,0.1)] overflow-hidden">
          <!-- Header -->
          <div
            class="flex items-center px-4 py-3 border-b-2"
            style="background: color-mix(in srgb, var(--primary) 8%, transparent); border-color: var(--primary)"
          >
            <span class="font-semibold text-[#334155]" :class="isPC ? 'text-[18px]' : 'text-base'">商品詳情</span>
          </div>

          <div class="flex flex-col" :class="isPC ? 'gap-6 p-6' : 'gap-4 p-4'">
            <!-- 規格表 -->
            <section class="flex flex-col gap-2">
              <h3 class="font-bold text-[#020617]" :class="isPC ? 'text-[16px]' : 'text-sm'">商品規格</h3>
              <div
                class="grid border border-[#e2e8f0] rounded-md overflow-hidden"
                :class="isPC ? 'grid-cols-2' : 'grid-cols-1'"
              >
                <div
                  v-for="(s, i) in detailSpecs"
                  :key="s.label"
                  class="flex border-b border-[#e2e8f0] last:border-b-0"
                  :class="isPC && i % 2 === 0 ? 'border-r' : ''"
                >
                  <span class="shrink-0 px-3 py-2 text-sm text-[#64748b] bg-[#f7f7f7] w-[110px]">{{ s.label }}</span>
                  <span class="px-3 py-2 text-sm text-[#334155] flex-1 break-words">{{ s.value }}</span>
                </div>
              </div>
            </section>

            <!-- 商品介紹（圖文交錯） -->
            <section class="flex flex-col gap-3">
              <h3 class="font-bold text-[#020617]" :class="isPC ? 'text-[16px]' : 'text-sm'">商品介紹</h3>
              <div class="flex flex-col gap-4 text-sm leading-relaxed text-[#334155]">

                <!-- 大圖 1：情境照 -->
                <figure class="flex flex-col gap-2">
                  <div class="w-full rounded-lg overflow-hidden bg-[#f1f5f9]" :class="isPC ? 'aspect-[16/9]' : 'aspect-[4/3]'">
                    <img
                      src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&fit=crop"
                      alt="情境照"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <figcaption class="text-xs text-[#64748b] text-center">情境穿搭 ｜ 柔軟有機棉，親膚不刺激</figcaption>
                </figure>

                <p>本款商品採用親膚棉質面料，柔軟透氣，適合寶寶嬌嫩肌膚日常穿著；版型寬鬆舒適，不悶熱、不勒身。</p>

                <!-- 雙圖：細節 -->
                <div class="grid grid-cols-2 gap-3">
                  <figure class="flex flex-col gap-1.5">
                    <div class="aspect-square rounded-lg overflow-hidden bg-[#f1f5f9]">
                      <img
                        src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&fit=crop"
                        alt="細節照 1"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <figcaption class="text-xs text-[#64748b] text-center">細節 ｜ 無骨縫合，柔軟貼身</figcaption>
                  </figure>
                  <figure class="flex flex-col gap-1.5">
                    <div class="aspect-square rounded-lg overflow-hidden bg-[#f1f5f9]">
                      <img
                        src="https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&fit=crop"
                        alt="細節照 2"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <figcaption class="text-xs text-[#64748b] text-center">壓扣 ｜ 優質防滑、穿脫順手</figcaption>
                  </figure>
                </div>

                <p>細節做工嚴謹：採用無骨縫合與包邊處理，搭配防滑壓扣與優質鬆緊帶，穿脫順手、不勒紅小手腳。</p>

                <ul class="list-disc pl-5 flex flex-col gap-1">
                  <li>親膚透氣，四季可穿，適合 0~12 歲。</li>
                  <li>環保染色，無甲醛無熒光劑，敏感肌也安心。</li>
                  <li>機洗手洗皆可，不易掉色變形。</li>
                </ul>

                <!-- 大圖 2：材質特寫 -->
                <figure class="flex flex-col gap-2">
                  <div class="w-full rounded-lg overflow-hidden bg-[#f1f5f9]" :class="isPC ? 'aspect-[16/9]' : 'aspect-[4/3]'">
                    <img
                      src="https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=1200&fit=crop"
                      alt="材質特寫"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <figcaption class="text-xs text-[#64748b] text-center">面料特寫 ｜ 100% 純棉，柔軟舒適</figcaption>
                </figure>

                <p class="text-xs text-[#94a3b8]">※ 因螢幕與光線差異，實物色差請以實品為準。</p>
              </div>
            </section>
          </div>
        </div>

      </div>
    </main>

    <!-- 手機版 sticky 加入購物車 bar -->
    <div
      v-if="isMobile"
      class="sticky bottom-0 z-40 bg-white border-t border-[#e2e8f0] flex items-center gap-3 px-4 py-3"
      style="padding-bottom: max(12px, env(safe-area-inset-bottom))"
    >
      <div class="flex flex-col leading-tight shrink-0">
        <span class="text-xs text-[#64748b] line-through">${{ product.original }}</span>
        <span class="text-xl font-bold" style="color: var(--primary)">${{ product.price }}</span>
      </div>
      <Button label="加入購物車" icon="pi pi-cart-plus" class="flex-1 !min-h-[48px]" @click="addToCart" />
    </div>
  </div>

  <CouponDrawer v-model:visible="showCouponDrawer" />

  <!-- 未登入提示彈窗 -->
  <Dialog v-model:visible="loginPromptOpen" modal header="會員專屬優惠" :draggable="false" :closable="false" :style="{ width: '20rem' }">
    <p class="text-sm text-[#334155] leading-relaxed">登入會員即可查看與領取可使用的優惠券，要先登入嗎？</p>
    <template #footer>
      <Button label="再逛逛" severity="secondary" outlined @click="loginPromptOpen = false" />
      <Button label="去登入" @click="goLoginForCoupons" />
    </template>
  </Dialog>
</template>
