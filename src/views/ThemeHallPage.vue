<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import ThemeBanner from '../components/ThemeBanner.vue'
import FlashSaleBar from '../components/FlashSaleBar.vue'
import ProductCard from '../components/ProductCard.vue'
import { useViewportStore } from '../stores/viewport'
import { products } from '../data/products'

const router = useRouter()
const route = useRoute()
// 由 query.type 決定主題館 header 類型（flash = 限時搶購 bar，其餘 = 主題 Banner）
const isFlash = computed(() => route.query.type === 'flash')
const hallTitle = '秋冬童裝主題館'
const bannerImg = `${import.meta.env.BASE_URL}banners/theme-banner.png`

const vp = computed(() => useViewportStore().current.id)
const gridCols = computed(() => ({
  'grid-cols-2': vp.value === 'mobile',
  'grid-cols-3': vp.value === 'tablet',
  'grid-cols-5': vp.value === 'pc',
}))

// 主題館的完整商品清單 — 原型用既有資料重複堆疊出較長的列表
const feed = Array.from({ length: 5 }, (_, page) =>
  products.map((p) => ({ ...p, key: `${p.id}-${page}` })),
).flat()

/**
 * 動態載入：初始 PAGE_SIZE 筆，使用者捲到接近底部時自動補一頁。
 * sentinel ref 用 IntersectionObserver 監聽，進入視窗即觸發 loadMore。
 */
const PAGE_SIZE = 10
const visibleCount = ref(PAGE_SIZE)
const visibleProducts = computed(() => feed.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < feed.length)

const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function loadMore(): void {
  if (!hasMore.value) return
  visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, feed.length)
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) loadMore()
    },
    { rootMargin: '300px' },
  )
  if (sentinelRef.value) observer.observe(sentinelRef.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="min-h-screen" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <main class="max-w-[80rem] mx-auto" style="padding: var(--page-pad-y) var(--page-pad-x)">
      <div class="flex flex-col" style="gap: var(--stack-gap)">

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm py-1">
          <button class="text-[#64748b] hover:text-[color:var(--primary)] transition-colors" @click="router.push('/shop')">
            <i class="pi pi-home text-xs" />
          </button>
          <i class="pi pi-chevron-right text-[0.625rem] text-[#94a3b8]" />
          <span class="font-medium text-[#64748b]">{{ hallTitle }}</span>
        </nav>

        <!-- Title -->
        <div class="flex items-center gap-2">
          <span class="w-1 h-5 rounded-full" style="background: var(--primary)" />
          <h1 class="text-lg font-bold text-[#334155]">{{ hallTitle }}</h1>
        </div>

        <!-- Header：限時搶購用紅色倒數 bar，其餘用主題 Banner -->
        <FlashSaleBar v-if="isFlash" />
        <ThemeBanner v-else name="秋冬童裝主題館" :image="bannerImg" />

        <div class="flex flex-col gap-4">
          <div class="grid" :class="[gridCols, vp === 'mobile' ? 'gap-2' : 'gap-4']">
            <ProductCard
              v-for="p in visibleProducts"
              :key="p.key"
              :id="p.id"
              :name="p.name"
              :price="p.price"
              :original="p.original"
              :has-variant="p.hasVariant"
              :stock="p.stock"
              :image="p.image"
              from="theme"
            />
          </div>

          <!-- 動態載入 sentinel：進視窗就 load 下一頁；全部載完顯示 footer 提示 -->
          <div v-if="hasMore" ref="sentinelRef" class="py-6 flex flex-col items-center gap-2 text-sm text-[#64748b]">
            <ProgressSpinner
              style="width: 36px; height: 36px"
              stroke-width="4"
              animation-duration=".8s"
            />
            <span>載入更多商品…</span>
          </div>
          <div v-else class="py-6 text-center text-sm text-[#94a3b8]">
            — 已顯示全部商品 —
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
