<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import ProductCard from '../components/ProductCard.vue';
import { products } from '../data/products';
import notFoundImg from '../assets/not-found.png';

/** 分類固定排序（與 CategoryTabs 一致），搜尋結果分類頁籤依此順序呈現。 */
const CATEGORY_ORDER = [
  '大童童裝',
  '小童童裝',
  '寶寶包屁',
  '親子裝',
  '生鮮',
  '廠商出清',
];
/** 全部頁籤的 key（非分類名，代表不篩選）。 */
const ALL_KEY = 'all';

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

// ── 分類篩選頁籤：只列出「搜尋結果中有出現」的分類，各自帶數量 ──
const activeCategory = ref<string>(ALL_KEY);

/** 依搜尋結果統計各分類數量，回傳「全部 + 有結果的分類（依固定順序）」。 */
const categoryTabs = computed(() => {
  const counts = new Map<string, number>();
  results.value.forEach((p) => {
    if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  });
  const cats = CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => ({
    key: c,
    label: c,
    count: counts.get(c) ?? 0,
  }));
  return [
    { key: ALL_KEY, label: '全部', count: results.value.length },
    ...cats,
  ];
});

/** 依選定分類過濾；全部則不過濾。 */
const filteredResults = computed(() =>
  activeCategory.value === ALL_KEY
    ? results.value
    : results.value.filter((p) => p.category === activeCategory.value),
);

// 換關鍵字（重新搜尋）時回到「全部」，避免停留在上一次選的分類。
watch(keyword, () => {
  activeCategory.value = ALL_KEY;
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
        <!-- Breadcrumb：返回（回上一頁）> 搜尋結果 -->
        <nav class="flex items-center gap-2 text-base @7xl:text-lg">
          <button
            type="button"
            class="flex min-h-11 items-center font-medium text-slate-500 transition-colors hover:text-[color:var(--primary)]"
            @click="router.back()"
          >
            返回
          </button>
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

        <!-- 分類篩選頁籤：全部 + 有結果的分類，各帶數量（例：大童童裝 (3)） -->
        <div
          v-if="results.length > 0"
          class="-mx-[var(--page-pad-x)] flex gap-2 overflow-x-auto px-[var(--page-pad-x)] pb-1 @7xl:mx-0 @7xl:px-0"
        >
          <button
            v-for="tab in categoryTabs"
            :key="tab.key"
            type="button"
            class="min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors"
            :style="
              activeCategory === tab.key
                ? {
                    borderColor: 'var(--primary)',
                    background: 'var(--primary-bg)',
                    color: '#fff',
                  }
                : {
                    borderColor: 'var(--border-light)',
                    color: 'var(--surface-700)',
                    background: '#fff',
                  }
            "
            @click="activeCategory = tab.key"
          >
            {{ tab.label }} ({{ tab.count }})
          </button>
        </div>

        <!-- Empty state -->
        <div
          v-if="results.length === 0"
          class="flex min-h-[300px] flex-col items-center justify-center gap-4 text-slate-500"
        >
          <img
            :src="notFoundImg"
            alt="找不到商品"
            class="w-40 max-w-full @4xl:w-52"
          />
          <p class="max-w-md text-center text-base leading-relaxed">
            找不到符合「{{
              keyword
            }}」的商品，請嘗試其他關鍵字，或聯繫客服獲得幫助。
          </p>
        </div>

        <!-- Grid：mobile 2 欄、tablet 3 欄、PC 4 欄；改用容器 query 對應 frame 寬，不再用 JS 切換 -->
        <div
          v-else
          class="grid grid-cols-2 gap-2 @3xl:grid-cols-3 @3xl:gap-4 @4xl:grid-cols-4"
        >
          <ProductCard
            v-for="product in filteredResults"
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
