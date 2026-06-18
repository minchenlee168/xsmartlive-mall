<script setup lang="ts">
import { useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import BannerCarousel from '../components/BannerCarousel.vue';
import AnnouncementSection from '../components/AnnouncementSection.vue';
import ThemeBanner from '../components/ThemeBanner.vue';
import FlashSaleBar from '../components/FlashSaleBar.vue';
import ThemeHallProducts from '../components/ThemeHallProducts.vue';

const router = useRouter();
// 主題館 banner 圖（存放於 public/banners/theme-banner.png）
const BANNER_IMG = `${import.meta.env.BASE_URL}banners/theme-banner.png`;

const handleNavToTheme = (query?: string) => {
  router.push(query ? `/theme?type=${query}` : '/theme');
};
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
