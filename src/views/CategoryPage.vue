<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import CategorySidebar from '../components/CategorySidebar.vue'
import ProductCard from '../components/ProductCard.vue'
import { useViewportStore } from '../stores/viewport'
import { products } from '../data/products'

const route = useRoute()
const router = useRouter()

const tab = computed(() => decodeURIComponent(route.params.tab as string))
const activeSubCategory = ref((route.query.sub as string) ?? '')
const sidebarOpen = ref(false)

watch(() => route.query.sub, (sub) => {
  activeSubCategory.value = (sub as string) ?? ''
})

// 切換大分類後，子分類自動清空（活躍 sub 不會跨大分類殘留）
watch(() => route.params.tab, () => {
  activeSubCategory.value = ''
})

const viewport = useViewportStore()
const vp = computed(() => viewport.current.id)

// 手機版：選完子分類後自動收起篩選面板
watch(activeSubCategory, () => {
  if (vp.value === 'mobile') sidebarOpen.value = false
})
const gridCols = computed(() =>
  vp.value === 'pc' ? 'grid-cols-4' : vp.value === 'tablet' ? 'grid-cols-3' : 'grid-cols-2',
)

// 完整商品 feed — 原型用既有資料堆出較長列表方便展示動態載入
const feed = Array.from({ length: 5 }, (_, page) =>
  products.map((p) => ({ ...p, key: `${p.id}-${page}` })),
).flat()

/**
 * 動態載入：初始 PAGE_SIZE 筆，sentinel 進視窗時補一頁。
 * 切換大分類 / 子分類時 visibleCount 重置回初始。
 */
const PAGE_SIZE = 12
const visibleCount = ref(PAGE_SIZE)
const visibleProducts = computed(() => feed.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < feed.length)

watch([() => route.params.tab, activeSubCategory], () => {
  visibleCount.value = PAGE_SIZE
})

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

    <main class="max-w-[1280px] mx-auto" style="padding: var(--page-pad-y) var(--page-pad-x)">
      <div class="flex flex-col" style="gap: var(--stack-gap)">

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm py-1">
          <button class="text-[#64748b] hover:text-[color:var(--primary)] transition-colors" @click="router.push('/shop')">
            <i class="pi pi-home text-xs" />
          </button>
          <i class="pi pi-chevron-right text-[10px] text-[#94a3b8]" />
          <span class="font-medium text-[#64748b]">{{ tab }}</span>
          <template v-if="activeSubCategory">
            <i class="pi pi-chevron-right text-[10px] text-[#94a3b8]" />
            <span class="text-[#64748b]">{{ activeSubCategory }}</span>
          </template>
        </nav>

        <!-- Filter button — mobile only -->
        <div v-if="vp === 'mobile'">
          <button
            class="flex items-center gap-2 px-4 min-h-[44px] py-2 rounded-md text-base font-medium text-white transition-colors"
            style="background: var(--primary-bg)"
            @click="sidebarOpen = !sidebarOpen"
            @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--primary-hover-bg)'"
            @mouseleave="($event.currentTarget as HTMLElement).style.background = 'var(--primary-bg)'"
          >
            <i class="pi pi-filter text-sm" />
            依分類篩選
            <i :class="`pi pi-chevron-${sidebarOpen ? 'up' : 'down'} text-xs`" />
          </button>

          <!-- Collapsible sidebar panel (mobile) -->
          <div v-if="sidebarOpen" class="mt-2">
            <CategorySidebar :tab="tab" v-model:active="activeSubCategory" />
          </div>
        </div>

        <!-- Content: sidebar + grid -->
        <div class="flex items-start gap-4">
          <!-- Sidebar — tablet+ inline -->
          <div v-if="vp !== 'mobile'" class="shrink-0">
            <CategorySidebar :tab="tab" v-model:active="activeSubCategory" />
          </div>

          <!-- Product grid -->
          <div class="flex-1 min-w-0 flex flex-col gap-4">
            <div class="grid" :class="[gridCols, vp === 'mobile' ? 'gap-2' : 'gap-4']">
              <ProductCard
                v-for="product in visibleProducts"
                :key="product.key"
                :id="product.id"
                :name="product.name"
                :price="product.price"
                :original="product.original"
                :has-variant="product.hasVariant"
                :stock="product.stock"
                :image="product.image"
              />
            </div>

            <!-- 動態載入 sentinel -->
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

      </div>
    </main>
  </div>
</template>
