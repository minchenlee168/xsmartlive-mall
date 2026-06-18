<script setup lang="ts">
import { computed } from 'vue'
import logoMark from '@/assets/logo-mark.svg'

/**
 * 後台 loading 動畫：使用品牌 logo-mark 配合 Y 軸翻轉動畫。
 * 取代原本 12 條 bar 的 spinner，讓 loading 視覺有品牌感。
 */
const props = defineProps<{
  size?: string | number
}>()

const DEFAULT_SIZE = '48px'
const sizeValue = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size || DEFAULT_SIZE,
)
</script>

<template>
  <div
    class="relative inline-flex items-center justify-center"
    :style="{ width: sizeValue, height: sizeValue, perspective: '200px' }"
  >
    <img
      :src="logoMark"
      alt="loading"
      class="loader-logo block select-none pointer-events-none"
      :style="{ width: sizeValue, height: sizeValue }"
    />
  </div>
</template>

<style scoped>
@keyframes loader-flip {
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(180deg);
  }
  100% {
    transform: rotateY(360deg);
  }
}

.loader-logo {
  animation: loader-flip 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
  transform-style: preserve-3d;
  backface-visibility: visible;
}
</style>
