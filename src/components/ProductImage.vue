<script setup lang="ts">
import { ref, watch } from 'vue';

/**
 * 商品圖片：載入失敗或 src 為空時，顯示「圖片施工中」placeholder。
 * 外層由呼叫端決定尺寸（aspect-ratio / w-h）；此元件用 h-full w-full 撐滿。
 */
const props = defineProps<{
  src?: string;
  alt?: string;
  /** placeholder 圖示與字級的尺寸；預設 md。 */
  size?: 'sm' | 'md' | 'lg';
}>();

// src 變更時重置 hasError（避免新圖也被誤判為壞圖）
const hasError = ref(false);
watch(
  () => props.src,
  () => {
    hasError.value = false;
  },
);

const handleImgError = (): void => {
  hasError.value = true;
};
</script>

<template>
  <img
    v-if="src && !hasError"
    :src="src"
    :alt="alt"
    class="h-full w-full object-cover"
    loading="lazy"
    @error="handleImgError"
  />
  <div
    v-else
    class="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-gray-100"
  >
    <i
      class="pi pi-hammer text-gray-300"
      :class="
        size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-lg'
      "
    />
    <span
      class="text-gray-400"
      :class="size === 'sm' ? 'text-[10px]' : 'text-xs'"
    >
      圖片施工中
    </span>
  </div>
</template>
