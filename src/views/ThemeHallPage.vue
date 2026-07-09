<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import ThemeBanner from '../components/ThemeBanner.vue';
import FlashSaleBar from '../components/FlashSaleBar.vue';
import ProductCard from '../components/ProductCard.vue';
import { products } from '../data/products';
import { useInfiniteScroll } from '../composables/useInfiniteScroll';

const PAGE_SIZE = 10;
const HALL_TITLE = '秋冬童裝主題館';
const BANNER_IMG = `${import.meta.env.BASE_URL}banners/theme-banner.png`;

const router = useRouter();
const route = useRoute();
// 由 query.type 決定主題館 header 類型（flash = 限時搶購 bar，其餘 = 主題 Banner）
const isFlash = computed(() => route.query.type === 'flash');

// 主題館的完整商品清單 — 原型用既有資料重複堆疊出較長的列表
const feed = Array.from({ length: 5 }, (_, page) =>
  products.map((p) => ({ ...p, key: `${p.id}-${page}` })),
).flat();

const visibleCount = ref(PAGE_SIZE);
const visibleProducts = computed(() => feed.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < feed.length);

const { sentinelRef } = useInfiniteScroll(
  () => {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, feed.length);
  },
  () => hasMore.value,
);
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
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-3 text-base @7xl:text-lg">
          <Button
            icon="pi pi-home"
            severity="secondary"
            text
            rounded
            class="!min-h-11 !min-w-11"
            :pt="{ icon: '!text-lg' }"
            @click="router.push('/shop')"
          />
          <i class="pi pi-chevron-right text-sm text-slate-400" />
          <span class="font-medium text-slate-500">{{ HALL_TITLE }}</span>
        </nav>

        <!-- Title -->
        <div class="flex items-center gap-2">
          <span
            class="h-5 w-1 rounded-full"
            style="background: var(--primary)"
          />
          <h1 class="text-lg font-bold text-slate-700">{{ HALL_TITLE }}</h1>
        </div>

        <!-- Header：限時搶購用紅色倒數 bar，其餘用主題 Banner -->
        <FlashSaleBar v-if="isFlash" />
        <ThemeBanner v-else name="秋冬童裝主題館" :image="BANNER_IMG" />

        <div class="flex flex-col gap-4">
          <!-- 商品 grid：手機 2 欄、平板 3 欄、PC 5 欄 -->
          <div
            class="grid grid-cols-2 gap-2 @3xl:grid-cols-3 @3xl:gap-4 @4xl:grid-cols-5"
          >
            <ProductCard
              v-for="p in visibleProducts"
              :id="p.id"
              :key="p.key"
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
          <div
            v-if="hasMore"
            ref="sentinelRef"
            class="flex flex-col items-center gap-2 py-6 text-sm text-slate-500"
          >
            <ProgressSpinner
              style="width: 36px; height: 36px"
              stroke-width="4"
              animation-duration=".8s"
            />
            <span>載入更多商品…</span>
          </div>
          <div v-else class="py-6 text-center text-sm text-slate-400">
            — 已顯示全部商品 —
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
