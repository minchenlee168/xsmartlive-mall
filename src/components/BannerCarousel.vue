<script setup lang="ts">
const banners = [
  { id: 1, label: '新品上市', title: '新品上市\n第二件全面五折起' },
  { id: 2, label: '秋冬特賣', title: '秋冬童裝\n限時搶購中' },
  { id: 3, label: '廠商出清', title: '廠商庫存\n超低特價放送' },
]
</script>

<template>
  <Carousel
    :value="banners"
    :num-visible="1"
    :num-scroll="1"
    :autoplay-interval="4000"
    circular
    :show-navigators="false"
  >
    <template #item="{ data }">
      <div class="relative h-[480px] rounded-lg overflow-hidden border border-[#e5e5e5] bg-gradient-to-br from-slate-700 to-slate-900 flex items-end">
        <!-- overlay -->
        <div class="absolute inset-0 bg-black/40" />
        <!-- text badge top-right -->
        <div class="absolute top-6 right-8 text-right z-10">
          <span class="text-white text-sm font-bold px-3 py-1 rounded-full" style="background: var(--primary-bg)">{{ data.label }}</span>
          <p class="text-white text-2xl font-bold mt-2 whitespace-pre-line leading-snug drop-shadow">{{ data.title }}</p>
        </div>
      </div>
    </template>
  </Carousel>
</template>
