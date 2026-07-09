<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import ProductCard from '../components/ProductCard.vue';
import { products } from '../data/products';

const route = useRoute();
const router = useRouter();

const keyword = computed(() => (route.query.q as string) ?? '');
const results = computed(() => {
  const queryText = keyword.value.trim().toLowerCase();
  if (!queryText) return [];
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(queryText) ||
      (p.category?.toLowerCase().includes(queryText) ?? false),
  );
});
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
        <nav class="flex items-center gap-3 py-1 text-base @7xl:text-lg">
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
          <span class="font-medium text-slate-500">搜尋結果</span>
        </nav>

        <!-- Result header -->
        <div class="flex items-baseline gap-2">
          <h1 class="text-lg font-bold text-slate-950 @4xl:text-xl">
            「{{ keyword }}」
          </h1>
          <span class="text-sm text-slate-500"
            >共 {{ results.length }} 筆結果</span
          >
        </div>

        <!-- Empty state -->
        <div
          v-if="results.length === 0"
          class="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-500"
        >
          <i class="pi pi-search" style="font-size: 56px" />
          <p class="text-base">找不到符合「{{ keyword }}」的商品</p>
        </div>

        <!-- Grid：mobile 2 欄、tablet 3 欄、PC 4 欄；改用容器 query 對應 frame 寬，不再用 JS 切換 -->
        <div
          v-else
          class="grid grid-cols-2 gap-2 @3xl:grid-cols-3 @3xl:gap-4 @4xl:grid-cols-4"
        >
          <ProductCard
            v-for="product in results"
            :id="product.id"
            :key="product.id"
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
