<script setup lang="ts">
const banners = [
  { id: 1, label: '新品上市', title: '新品上市\n第二件全面五折起' },
  { id: 2, label: '秋冬特賣', title: '秋冬童裝\n限時搶購中' },
  { id: 3, label: '廠商出清', title: '廠商庫存\n超低特價放送' },
];
</script>

<template>
  <Carousel
    class="banner-carousel"
    :value="banners"
    :num-visible="1"
    :num-scroll="1"
    :autoplay-interval="4000"
    circular
    :show-navigators="false"
  >
    <template #item="{ data }">
      <div
        class="relative flex h-[480px] items-end overflow-hidden rounded-lg border border-[#e5e5e5] bg-gradient-to-br from-slate-700 to-slate-900"
      >
        <!-- overlay -->
        <div class="absolute inset-0 bg-black/40" />
        <!-- text badge top-right -->
        <div class="absolute top-6 right-8 z-10 text-right">
          <span
            class="rounded-full px-3 py-1 text-sm font-bold text-white"
            style="background: var(--primary-bg)"
            >{{ data.label }}</span
          >
          <p
            class="mt-2 text-2xl leading-snug font-bold whitespace-pre-line text-white drop-shadow"
          >
            {{ data.title }}
          </p>
        </div>
      </div>
    </template>
  </Carousel>
</template>

<style scoped>
/* 關掉 PrimeVue Carousel 所有內建過場（transform / opacity / animation），秒切 */
.banner-carousel :deep(*),
.banner-carousel :deep(*::before),
.banner-carousel :deep(*::after) {
  transition: none !important;
  animation: none !important;
}
</style>
