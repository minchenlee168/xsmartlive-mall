<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import ProductCard from './ProductCard.vue';
import { useViewportStore } from '../pinia/viewport';
import { products } from '../data/products';

const props = defineProps<{
  /** 後台開啟輪播功能 → 商品自動輪播（固定時間）；否則僅手動左右切換 */
  autoplay?: boolean;
  /** 精簡商品卡：不顯示數量選擇器與「還剩X件」 */
  simple?: boolean;
}>();

const vp = computed(() => useViewportStore().current.id);
// 一排顯示張數（PC 5 / 平板 3 / 手機 2）；商品共 10 個，超過可顯示數即用左右箭頭切換
const perView = computed(() =>
  vp.value === 'mobile' ? 2 : vp.value === 'tablet' ? 3 : 5,
);
const items = products.slice(0, 10);

// 手機改用 horizontal scroll（隱藏左右切換鈕），平板 / PC 維持 Carousel。
const isMobile = computed(() => vp.value === 'mobile');

// ── 手機版自動輪播：autoplay 為 true 時定時 scrollBy 一張卡寬，到底回頭 ──
const scrollerRef = ref<HTMLElement | null>(null);
let autoplayTimer: ReturnType<typeof setInterval> | null = null;

const stopAutoplay = (): void => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
};

const startAutoplay = (): void => {
  stopAutoplay();
  autoplayTimer = setInterval(() => {
    const el = scrollerRef.value;
    if (!el) return;
    // 卡寬：45% × scroller width + gap-3 (12px)
    const step = el.clientWidth * 0.45 + 12;
    // 接近底部 → 平滑回到 0
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: step, behavior: 'smooth' });
    }
  }, 3000);
};

watch(
  () => [isMobile.value, props.autoplay] as const,
  ([mob, auto]) => {
    if (mob && auto) startAutoplay();
    else stopAutoplay();
  },
  { immediate: true },
);

onBeforeUnmount(stopAutoplay);
</script>

<template>
  <!-- 手機：橫向卷軸滑動，每卡 45% 寬，snap 對齊；autoplay 時定時 scrollBy 一張卡寬 -->
  <div
    v-if="isMobile"
    ref="scrollerRef"
    class="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
  >
    <div
      v-for="data in items"
      :key="data.id"
      class="shrink-0 snap-start"
      style="width: 45%"
    >
      <ProductCard
        :id="data.id"
        :name="data.name"
        :price="data.price"
        :original="data.original"
        :has-variant="data.hasVariant"
        :stock="data.stock"
        :image="data.image"
        :simple="props.simple"
      />
    </div>
  </div>

  <!-- 平板 / PC：Carousel + 左右切換 -->
  <Carousel
    v-else
    :key="perView"
    :value="items"
    :num-visible="perView"
    :num-scroll="1"
    :circular="props.autoplay"
    :autoplay-interval="props.autoplay ? 3000 : undefined"
  >
    <template #item="{ data }">
      <div class="h-full px-2">
        <ProductCard
          :id="data.id"
          :name="data.name"
          :price="data.price"
          :original="data.original"
          :has-variant="data.hasVariant"
          :stock="data.stock"
          :image="data.image"
          :simple="props.simple"
        />
      </div>
    </template>
  </Carousel>
</template>

<style scoped>
/* 讓每個輪播項目等高，卡片才能撐滿（選擇規格的卡少了數量區塊也會同高） */
:deep(.p-carousel-item) {
  display: flex;
  align-items: stretch;
}

/* 左右切換鈕：凸顯圓形按鈕，避免與背景相近 */
:deep(.p-carousel-prev-button),
:deep(.p-carousel-next-button) {
  width: 44px;
  height: 44px;
  border-radius: 9999px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition:
    background-color 0.2s,
    color 0.2s,
    box-shadow 0.2s;
}
:deep(.p-carousel-prev-button:hover),
:deep(.p-carousel-next-button:hover) {
  background-color: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
:deep(.p-carousel-prev-button:disabled),
:deep(.p-carousel-next-button:disabled) {
  opacity: 0.4;
}
:deep(.p-carousel-prev-button .p-icon),
:deep(.p-carousel-next-button .p-icon) {
  width: 18px;
  height: 18px;
}

/* 手機橫向卷軸：隱藏 scrollbar 視覺，仍可滑動 */
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
