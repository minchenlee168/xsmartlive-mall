<script setup lang="ts">
withDefaults(defineProps<{
  /** 主題館名稱 — 未設定 banner 圖時改顯示此名稱 */
  name?: string
  /** 主題館 banner 圖片網址 */
  image?: string
}>(), {
  name: '主題館',
})
</script>

<template>
  <!-- 有設定 banner 圖：顯示圖片 -->
  <div v-if="image" class="relative aspect-[3/1] rounded-[0.5rem] overflow-hidden">
    <img :src="image" :alt="name" class="w-full h-full object-cover" />
  </div>

  <!-- 沒有設定 banner 圖：名稱由區段標題顯示，這裡只留底色占位 -->
  <div v-else class="relative aspect-[3/1] rounded-[0.5rem] overflow-hidden">
    <div class="absolute inset-0" style="background-color: var(--primary-200)" />
    <div class="absolute inset-0 opacity-20"
      style="background-image: repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 0.0625rem, transparent 0, transparent 50%); background-size: 0.75rem 0.75rem;" />
  </div>
</template>
