<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ProductCard from './ProductCard.vue'
import { useViewportStore } from '../stores/viewport'
import { products } from '../data/products'

defineProps<{
  /** 簡易版商品卡：不顯示數量選擇器與「還剩X件」 */
  simple?: boolean
}>()

const router = useRouter()

const vp = computed(() => useViewportStore().current.id)
const gridCols = computed(() => ({
  'grid-cols-2': vp.value === 'mobile',
  'grid-cols-3': vp.value === 'tablet',
  'grid-cols-5': vp.value === 'pc',
}))

const MAX_DISPLAY = 10
const displayProducts = products.slice(0, MAX_DISPLAY)
const hasMore = products.length > MAX_DISPLAY
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid" :class="[gridCols, vp === 'mobile' ? 'gap-2' : 'gap-4']">
      <ProductCard
        v-for="p in displayProducts"
        :key="p.id"
        :id="p.id"
        :name="p.name"
        :price="p.price"
        :original="p.original"
        :has-variant="p.hasVariant"
        :stock="p.stock"
        :image="p.image"
        :simple="simple"
      />
    </div>

    <!-- 查看更多 — shown when there are more than 10 theme-hall products -->
    <div v-if="hasMore" class="flex justify-center">
      <Button
        label="查看更多"
        icon="pi pi-angle-down"
        icon-pos="right"
        outlined
        rounded
        class="w-full max-w-[22.5rem]"
        @click="router.push('/theme')"
      />
    </div>
  </div>
</template>
