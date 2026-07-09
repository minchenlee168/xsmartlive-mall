<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import CategorySidebar from '../components/CategorySidebar.vue';
import ProductCard from '../components/ProductCard.vue';
import { products } from '../data/products';
import { useInfiniteScroll } from '../composables/useInfiniteScroll';

const PAGE_SIZE = 12;

const route = useRoute();
const router = useRouter();

const tab = computed(() => decodeURIComponent(route.params.tab as string));
const activeSubCategory = ref((route.query.sub as string) ?? '');
const isSidebarOpen = ref(false);

/**
 * 依目前選擇的大分類過濾商品；對應 product.category。
 * 商品不足時，原型用既有資料重複堆疊出較長列表方便展示動態載入。
 */
const filteredProducts = computed(() =>
  products.filter((p) => p.category === tab.value),
);
const feed = computed(() =>
  Array.from({ length: 5 }, (_, page) =>
    filteredProducts.value.map((p) => ({ ...p, key: `${p.id}-${page}` })),
  ).flat(),
);

const visibleCount = ref(PAGE_SIZE);
const visibleProducts = computed(() => feed.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < feed.value.length);

const { sentinelRef } = useInfiniteScroll(
  () => {
    visibleCount.value = Math.min(
      visibleCount.value + PAGE_SIZE,
      feed.value.length,
    );
  },
  () => hasMore.value,
);

watch(
  () => route.query.sub,
  (sub) => {
    activeSubCategory.value = (sub as string) ?? '';
  },
);

// 切換大分類後，子分類自動清空
watch(
  () => route.params.tab,
  () => {
    activeSubCategory.value = '';
  },
);

// 切換大分類 / 子分類時 visibleCount 重置回初始
watch([() => route.params.tab, activeSubCategory], () => {
  visibleCount.value = PAGE_SIZE;
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
          <span class="font-medium text-slate-500">{{ tab }}</span>
          <template v-if="activeSubCategory">
            <i class="pi pi-chevron-right text-sm text-slate-400" />
            <span class="text-slate-500">{{ activeSubCategory }}</span>
          </template>
        </nav>

        <!-- Filter button — 手機才顯示，桌機改用左側 sidebar -->
        <div class="@3xl:hidden">
          <Button
            :icon="`pi pi-${isSidebarOpen ? 'chevron-up' : 'filter'}`"
            label="依分類篩選"
            class="!min-h-11"
            @click="isSidebarOpen = !isSidebarOpen"
          />

          <div v-if="isSidebarOpen" class="mt-2">
            <CategorySidebar
              :tab="tab"
              :active="activeSubCategory"
              @update:active="
                (value) => {
                  activeSubCategory = value;
                  // 手機版選了子分類後自動收合
                  isSidebarOpen = false;
                }
              "
            />
          </div>
        </div>

        <!-- Content: sidebar + grid -->
        <div class="flex items-start gap-4">
          <!-- Sidebar — 平板以上才顯示 -->
          <div class="hidden shrink-0 @3xl:block">
            <CategorySidebar :tab="tab" v-model:active="activeSubCategory" />
          </div>

          <!-- Product grid：手機 2 欄、平板 3 欄、PC 4 欄 -->
          <div class="flex min-w-0 flex-1 flex-col gap-4">
            <div
              class="grid grid-cols-2 gap-2 @3xl:grid-cols-3 @3xl:gap-4 @4xl:grid-cols-4"
            >
              <ProductCard
                v-for="product in visibleProducts"
                :id="product.id"
                :key="product.key"
                :name="product.name"
                :price="product.price"
                :original="product.original"
                :has-variant="product.hasVariant"
                :stock="product.stock"
                :image="product.image"
              />
            </div>

            <!-- 動態載入 sentinel -->
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
      </div>
    </main>
  </div>
</template>
