<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useThemeStore } from '../pinia/theme';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import BannerCarousel from '../components/BannerCarousel.vue';
import AnnouncementSection from '../components/AnnouncementSection.vue';
import ThemeBanner from '../components/ThemeBanner.vue';
import FlashSaleBar from '../components/FlashSaleBar.vue';
import ThemeHallProducts from '../components/ThemeHallProducts.vue';

const router = useRouter();
const themeStore = useThemeStore();
const BANNER_IMG = `${import.meta.env.BASE_URL}banners/theme-banner.png`;

/** 4 個外觀對應 4 種首頁版型，其他主題色回落到 default 版型。 */
const layoutId = computed(() => {
  const id = themeStore.current.id;
  return ['aurora', 'midnight', 'bloom', 'retro'].includes(id) ? id : 'default';
});

const handleNavToTheme = (query?: string) => {
  router.push(query ? `/theme?type=${query}` : '/theme');
};
</script>

<template>
  <div
    class="min-h-screen"
    :class="`home-layout-${layoutId}`"
    style="background: var(--page-bg)"
  >
    <NavBar />
    <CategoryTabs />

    <!-- 極光珊瑚 Aurora：AuroraShell 已提供 header + bottom nav；這裡只放內容 -->
    <div v-if="layoutId === 'aurora'" class="aurora-page">
      <main class="flex flex-col gap-5 px-4 pt-6 pb-6">
        <BannerCarousel />

        <!-- 公告：跟主題館 section 同樣排版 -->
        <section
          class="aurora-announcement flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm"
        >
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-md text-white"
              style="background: var(--primary)"
            >
              <i class="pi pi-megaphone text-xs" />
            </span>
            <h2 class="text-lg font-black text-slate-800">公告</h2>
          </div>
          <AnnouncementSection />
        </section>

        <!-- 主題館類型 1：標準 -->
        <section class="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <button
              class="group flex min-w-0 items-center gap-2"
              @click="handleNavToTheme()"
            >
              <span
                class="flex h-6 w-6 items-center justify-center rounded-md text-white"
                style="background: var(--primary)"
              >
                <i class="pi pi-play-circle text-xs" />
              </span>
              <h2 class="text-lg font-black text-slate-800 group-hover:text-[color:var(--primary)]">
                秋冬童裝主題館
              </h2>
            </button>
            <button
              class="text-sm whitespace-nowrap text-slate-500 hover:text-[color:var(--primary)]"
              @click="handleNavToTheme()"
            >
              看全部 ›
            </button>
          </div>
          <ThemeBanner name="秋冬童裝主題館" :image="BANNER_IMG" />
          <ThemeHallProducts />
        </section>

        <!-- 主題館類型 1b：精簡商品卡 -->
        <section class="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <button
              class="group flex min-w-0 items-center gap-2"
              @click="handleNavToTheme()"
            >
              <span
                class="flex h-6 w-6 items-center justify-center rounded-md text-white"
                style="background: var(--primary)"
              >
                <i class="pi pi-sparkles text-xs" />
              </span>
              <h2 class="text-lg font-black text-slate-800 group-hover:text-[color:var(--primary)]">
                秋冬童裝主題館
              </h2>
            </button>
            <button
              class="text-sm whitespace-nowrap text-slate-500 hover:text-[color:var(--primary)]"
              @click="handleNavToTheme()"
            >
              看全部 ›
            </button>
          </div>
          <ThemeBanner name="秋冬童裝主題館" :image="BANNER_IMG" />
          <ThemeHallProducts simple autoplay />
        </section>

        <!-- 主題館類型 2：限時搶購 -->
        <section class="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <button
              class="group flex min-w-0 items-center gap-2"
              @click="handleNavToTheme('flash')"
            >
              <span
                class="flex h-6 w-6 items-center justify-center rounded-md text-white"
                style="background: var(--primary)"
              >
                <i class="pi pi-bolt text-xs" />
              </span>
              <h2 class="text-lg font-black text-slate-800 group-hover:text-[color:var(--primary)]">
                限時搶購
              </h2>
            </button>
            <button
              class="text-sm whitespace-nowrap text-slate-500 hover:text-[color:var(--primary)]"
              @click="handleNavToTheme('flash')"
            >
              看全部 ›
            </button>
          </div>
          <FlashSaleBar />
          <ThemeHallProducts />
        </section>

        <!-- 主題館類型 2b：限時搶購 精簡 -->
        <section class="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <button
              class="group flex min-w-0 items-center gap-2"
              @click="handleNavToTheme('flash')"
            >
              <span
                class="flex h-6 w-6 items-center justify-center rounded-md text-white"
                style="background: var(--primary)"
              >
                <i class="pi pi-star-fill text-xs" />
              </span>
              <h2 class="text-lg font-black text-slate-800 group-hover:text-[color:var(--primary)]">
                今日精選
              </h2>
            </button>
            <button
              class="text-sm whitespace-nowrap text-slate-500 hover:text-[color:var(--primary)]"
              @click="handleNavToTheme('flash')"
            >
              看全部 ›
            </button>
          </div>
          <FlashSaleBar />
          <ThemeHallProducts simple autoplay />
        </section>
      </main>
    </div>

    <!-- 深夜藍 Midnight：深色、精練、專業 -->
    <main
      v-else-if="layoutId === 'midnight'"
      class="mx-auto max-w-7xl text-slate-100"
      style="padding: var(--page-pad-y) var(--page-pad-x)"
    >
      <div class="flex flex-col gap-6">
        <!-- 精練 Hero：橫向雙欄 -->
        <section class="grid grid-cols-1 gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 @4xl:grid-cols-[1.2fr_1fr]">
          <div class="flex flex-col justify-center gap-3">
            <p class="text-[10px] tracking-[0.3em] text-slate-400 uppercase">Midnight Edition</p>
            <h1 class="text-2xl leading-tight font-bold @3xl:text-4xl">
              深夜好眠<br />精選好物
            </h1>
            <p class="text-sm text-slate-400">極致精練的購物體驗，只挑最耐看的。</p>
            <div class="mt-2 flex gap-2">
              <Button label="立即選購" @click="handleNavToTheme()" />
              <Button label="全部主題" severity="secondary" outlined @click="handleNavToTheme()" />
            </div>
          </div>
          <BannerCarousel />
        </section>

        <!-- 精練條列公告（透明底，融入深底） -->
        <AnnouncementSection />

        <!-- 精練 grid：無多餘裝飾 -->
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between border-b border-slate-700 pb-2">
            <h2 class="text-sm font-medium tracking-wide">秋冬童裝主題館 / Fall Collection</h2>
            <button
              class="text-xs text-slate-400 transition-colors hover:text-white"
              @click="handleNavToTheme()"
            >
              查看全部 →
            </button>
          </div>
          <ThemeHallProducts />
        </section>

        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between border-b border-slate-700 pb-2">
            <h2 class="text-sm font-medium tracking-wide">限時精選 / Flash Deals</h2>
            <button
              class="text-xs text-slate-400 transition-colors hover:text-white"
              @click="handleNavToTheme('flash')"
            >
              查看全部 →
            </button>
          </div>
          <FlashSaleBar />
          <ThemeHallProducts simple autoplay />
        </section>
      </div>
    </main>

    <!-- 櫻花粉 Bloom：柔和、粉色系、可愛 -->
    <main
      v-else-if="layoutId === 'bloom'"
      class="mx-auto max-w-7xl"
      style="padding: var(--page-pad-y) var(--page-pad-x)"
    >
      <div class="flex flex-col gap-8">
        <!-- 可愛 Hero -->
        <section
          class="rounded-[32px] bg-white/70 p-6 text-center shadow-[0_10px_40px_rgba(244,114,182,0.15)] @3xl:p-10"
        >
          <div class="mx-auto flex max-w-2xl flex-col items-center gap-3">
            <span class="text-3xl">🌸</span>
            <h1
              class="text-2xl leading-tight font-black @3xl:text-4xl"
              style="color: var(--primary)"
            >
              一花一世界，一物一心動
            </h1>
            <p class="text-sm text-slate-600 @3xl:text-base">
              柔和粉調 × 精緻好物 — 每一次選購都像賞花一樣浪漫。
            </p>
            <Button
              label="開始賞逛"
              rounded
              icon="pi pi-heart-fill"
              class="mt-2 !min-h-12"
              @click="handleNavToTheme()"
            />
          </div>
        </section>

        <BannerCarousel />
        <AnnouncementSection />

        <!-- 可愛 section 標題（花瓣分隔） -->
        <section class="flex flex-col gap-4">
          <div class="flex items-center justify-center gap-3 text-center">
            <span class="h-px flex-1 max-w-[80px]" style="background: var(--primary-200)" />
            <h2 class="flex items-center gap-2 text-xl font-black" style="color: var(--primary)">
              🌷 秋冬童裝主題館 🌷
            </h2>
            <span class="h-px flex-1 max-w-[80px]" style="background: var(--primary-200)" />
          </div>
          <ThemeBanner name="秋冬童裝主題館" :image="BANNER_IMG" />
          <ThemeHallProducts />
          <div class="text-center">
            <Button
              label="查看更多"
              icon="pi pi-angle-right"
              icon-pos="right"
              rounded
              outlined
              @click="handleNavToTheme()"
            />
          </div>
        </section>

        <section class="flex flex-col gap-4">
          <div class="flex items-center justify-center gap-3 text-center">
            <span class="h-px flex-1 max-w-[80px]" style="background: var(--primary-200)" />
            <h2 class="flex items-center gap-2 text-xl font-black" style="color: var(--primary)">
              💗 限時心動 💗
            </h2>
            <span class="h-px flex-1 max-w-[80px]" style="background: var(--primary-200)" />
          </div>
          <FlashSaleBar />
          <ThemeHallProducts simple autoplay />
        </section>
      </div>
    </main>

    <!-- 復古橘 Retro：溫暖、經典、雜誌感 -->
    <main
      v-else-if="layoutId === 'retro'"
      class="mx-auto max-w-7xl"
      style="padding: var(--page-pad-y) var(--page-pad-x)"
    >
      <div class="flex flex-col gap-6">
        <!-- 雜誌感 Hero：雙欄（公告 + 輪播） -->
        <section class="border-t-4 border-b-2 border-double" style="border-color: var(--primary)">
          <div class="grid grid-cols-1 gap-4 py-6 @4xl:grid-cols-[1.4fr_1fr]">
            <!-- 公告取代原本雜誌感文字 -->
            <div class="flex flex-col justify-center border-r-0 pr-0 @4xl:border-r @4xl:border-slate-300 @4xl:pr-6">
              <AnnouncementSection />
            </div>
            <div>
              <BannerCarousel />
            </div>
          </div>
        </section>

        <!-- 雜誌感章節 -->
        <section class="flex flex-col gap-4">
          <div class="flex items-baseline gap-4">
            <span class="font-serif text-4xl font-black italic" style="color: var(--primary)">01</span>
            <div class="flex flex-1 flex-col">
              <h2 class="font-serif text-xl font-bold text-slate-800 italic @3xl:text-2xl">
                秋冬童裝主題館
              </h2>
              <span class="text-xs tracking-widest text-slate-500 uppercase">
                Fall / Winter Kids Collection
              </span>
            </div>
            <Button
              label="查看更多"
              icon="pi pi-angle-right"
              icon-pos="right"
              outlined
              class="!min-h-11 shrink-0"
              @click="handleNavToTheme()"
            />
          </div>
          <ThemeBanner name="秋冬童裝主題館" :image="BANNER_IMG" />
          <ThemeHallProducts />
        </section>

        <section class="flex flex-col gap-4 border-t border-slate-300 pt-6">
          <div class="flex items-baseline gap-4">
            <span class="font-serif text-4xl font-black italic" style="color: var(--primary)">02</span>
            <div class="flex flex-1 flex-col">
              <h2 class="font-serif text-xl font-bold text-slate-800 italic @3xl:text-2xl">
                限時特賣專輯
              </h2>
              <span class="text-xs tracking-widest text-slate-500 uppercase">
                Flash Sale Feature
              </span>
            </div>
            <Button
              label="查看更多"
              icon="pi pi-angle-right"
              icon-pos="right"
              outlined
              class="!min-h-11 shrink-0"
              @click="handleNavToTheme('flash')"
            />
          </div>
          <FlashSaleBar />
          <ThemeHallProducts simple autoplay />
        </section>
      </div>
    </main>

    <!-- Default：其他主題色沿用原本首頁 -->
    <main
      v-else
      class="mx-auto max-w-7xl"
      style="padding: var(--page-pad-y) var(--page-pad-x)"
    >
      <div class="flex flex-col" style="gap: var(--stack-gap)">
        <BannerCarousel />
        <AnnouncementSection />

        <!-- 主題館類型 1：標準（Banner） -->
        <section class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <button
                class="group flex shrink-0 cursor-pointer items-center gap-2"
                @click="handleNavToTheme()"
              >
                <span
                  class="h-5 w-1 rounded-full"
                  style="background: var(--primary)"
                />
                <h2
                  class="text-lg font-bold text-slate-700 transition-colors group-hover:text-[color:var(--primary)]"
                >
                  秋冬童裝主題館
                </h2>
              </button>
              <span class="truncate text-xs text-slate-400"
                >（主題館類型：標準・標準商品卡）</span
              >
            </div>
            <Button
              label="查看更多"
              icon="pi pi-angle-right"
              icon-pos="right"
              outlined
              class="!min-h-11 shrink-0 bg-white"
              @click="handleNavToTheme()"
            />
          </div>
          <ThemeBanner name="秋冬童裝主題館" :image="BANNER_IMG" />
          <ThemeHallProducts />
        </section>

        <!-- 主題館類型 1b：標準（精簡商品卡） -->
        <section class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <button
                class="group flex shrink-0 cursor-pointer items-center gap-2"
                @click="handleNavToTheme()"
              >
                <span
                  class="h-5 w-1 rounded-full"
                  style="background: var(--primary)"
                />
                <h2
                  class="text-lg font-bold text-slate-700 transition-colors group-hover:text-[color:var(--primary)]"
                >
                  秋冬童裝主題館
                </h2>
              </button>
              <span class="truncate text-xs text-slate-400">
                （主題館類型：標準・精簡商品卡・自動輪播）
              </span>
            </div>
            <Button
              label="查看更多"
              icon="pi pi-angle-right"
              icon-pos="right"
              outlined
              class="!min-h-11 shrink-0 bg-white"
              @click="handleNavToTheme()"
            />
          </div>
          <ThemeBanner name="秋冬童裝主題館" :image="BANNER_IMG" />
          <ThemeHallProducts simple autoplay />
        </section>

        <!-- 主題館類型 2：限時搶購（倒數 bar） -->
        <section class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <button
                class="group flex shrink-0 cursor-pointer items-center gap-2"
                @click="handleNavToTheme('flash')"
              >
                <span
                  class="h-5 w-1 rounded-full"
                  style="background: var(--primary)"
                />
                <h2
                  class="text-lg font-bold text-slate-700 transition-colors group-hover:text-[color:var(--primary)]"
                >
                  秋冬童裝主題館
                </h2>
              </button>
              <span class="truncate text-xs text-slate-400">
                （主題館類型：限時搶購・標準商品卡）
              </span>
            </div>
            <Button
              label="查看更多"
              icon="pi pi-angle-right"
              icon-pos="right"
              outlined
              class="!min-h-11 shrink-0 bg-white"
              @click="handleNavToTheme('flash')"
            />
          </div>
          <FlashSaleBar />
          <ThemeHallProducts />
        </section>

        <!-- 主題館類型 2b：限時搶購（精簡商品卡） -->
        <section class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <button
                class="group flex shrink-0 cursor-pointer items-center gap-2"
                @click="handleNavToTheme('flash')"
              >
                <span
                  class="h-5 w-1 rounded-full"
                  style="background: var(--primary)"
                />
                <h2
                  class="text-lg font-bold text-slate-700 transition-colors group-hover:text-[color:var(--primary)]"
                >
                  秋冬童裝主題館
                </h2>
              </button>
              <span class="truncate text-xs text-slate-400">
                （主題館類型：限時搶購・精簡商品卡・自動輪播）
              </span>
            </div>
            <Button
              label="查看更多"
              icon="pi pi-angle-right"
              icon-pos="right"
              outlined
              class="!min-h-11 shrink-0 bg-white"
              @click="handleNavToTheme('flash')"
            />
          </div>
          <FlashSaleBar />
          <ThemeHallProducts simple autoplay />
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Midnight 全站樣式已移到 App.vue 的 .appearance-midnight scoped style，這裡只留頁面級別的 */

/* Bloom：外層加更多柔和 padding */
.home-layout-bloom {
  background: linear-gradient(160deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%) !important;
}

/* Aurora：珊瑚白卡風格 */
.home-layout-aurora {
  /* 限時搶購 bar 換成珊瑚色系 */
  --flash-bar-bg: #f5c9b8;
  --flash-bar-chip-bg: #e07856;
}
/* 公告：Section 外殼已在 HomePage 加，內部隱藏 AnnouncementSection 自帶的「公告」header */
.aurora-announcement :deep(> div > .flex.items-center.gap-4:first-child) {
  display: none !important;
}
/* AnnouncementSection 內部原本的 rounded-lg 卡拿掉外框，直接融入外層 section 卡 */
.aurora-announcement :deep(.overflow-hidden.rounded-lg.border.border-slate-200.bg-white) {
  border: none !important;
  box-shadow: none !important;
  border-radius: 12px !important;
}
/* 主題館 section 內的商品卡：不再有白底 + 陰影，融入外層白卡 */
.home-layout-aurora :deep(.product-card) {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
}
/* 限時搶購 bar：Aurora 風全圓角 + 漸層 */
.home-layout-aurora :deep(.flash-sale-bar) {
  border-radius: 9999px !important;
  background: linear-gradient(135deg, #f5c9b8 0%, #f0b299 100%) !important;
}
.home-layout-aurora :deep(.flash-sale-chip) {
  background: linear-gradient(135deg, #e07856 0%, #b95a3d 100%) !important;
}

/* Retro：整體米黃紙感 */
.home-layout-retro {
  background: linear-gradient(160deg, #fef7ec 0%, #fdead0 50%, #fbd6a0 100%) !important;
}
</style>
