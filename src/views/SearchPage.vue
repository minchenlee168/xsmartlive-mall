<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import ProductCard from '../components/ProductCard.vue'
import { useViewportStore } from '../stores/viewport'
import { products } from '../data/products'

const route = useRoute()
const router = useRouter()

const keyword = computed(() => (route.query.q as string) ?? '')
const viewport = useViewportStore()
const vp = computed(() => viewport.current.id)
const gridCols = computed(() =>
  vp.value === 'pc' ? 'grid-cols-4' : vp.value === 'tablet' ? 'grid-cols-3' : 'grid-cols-2',
)

const results = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return []
  return products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.category?.toLowerCase().includes(q) ?? false)
  )
})
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
          <span class="font-medium text-[#64748b]">搜尋結果</span>
        </nav>

        <!-- Result header -->
        <div class="flex items-baseline gap-2">
          <h1 class="text-lg @4xl:text-xl font-bold text-[#020617]">「{{ keyword }}」</h1>
          <span class="text-sm text-[#64748b]">共 {{ results.length }} 筆結果</span>
        </div>

        <!-- Empty state -->
        <div v-if="results.length === 0" class="flex flex-col items-center justify-center min-h-[300px] gap-3 text-[#64748b]">
          <i class="pi pi-search" style="font-size: 56px" />
          <p class="text-base">找不到符合「{{ keyword }}」的商品</p>
        </div>

        <!-- Grid -->
        <div v-else class="grid" :class="[gridCols, vp === 'mobile' ? 'gap-2' : 'gap-4']">
          <ProductCard
            v-for="product in results"
            :key="product.id"
            :id="product.id"
            :name="product.name"
            :price="product.price"
            :original="product.original"
            :has-variant="product.hasVariant"
            :stock="product.stock"
            :image="product.image"
          />
        </div>

      </div>
    </main>
  </div>
</template>
