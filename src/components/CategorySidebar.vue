<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ tab: string }>();

const SUB_CATEGORIES: Record<string, string[]> = {
  大童童裝: ['上衣', '褲子', '裙子', '外套', '套裝'],
  小童童裝: ['上衣', '褲子', '裙子', '外套', '套裝'],
  寶寶包屁: ['短袖包屁', '長袖包屁', '親子裝', '禮盒組', '其他'],
  親子裝: ['親子上衣', '親子褲裝', '親子裙裝', '親子外套'],
  生鮮: ['海鮮', '肉品', '蔬果', '冷凍熟食', '組合特惠'],
  廠商出清: ['全部出清', '上衣特賣', '褲裝特賣', '套裝特賣', '配件特賣'],
};

// 切換大分類時 props.tab 會變，items 跟著 reactivity 重算
const items = computed(() => SUB_CATEGORIES[props.tab] ?? []);
const active = defineModel<string>('active');
</script>

<template>
  <div class="flex w-full shrink-0 flex-col @3xl:w-[160px] @5xl:w-[244px]">
    <!-- Header -->
    <div
      class="flex items-center rounded-t-lg px-3 py-2"
      style="background: var(--primary-bg)"
    >
      <span class="text-sm font-semibold text-white">依分類顯示</span>
    </div>

    <!-- Menu -->
    <div
      class="flex flex-col gap-1 rounded-b-lg border border-slate-200 bg-white p-1"
    >
      <button
        v-for="item in items"
        :key="item"
        class="flex min-h-10 w-full items-center rounded px-3 py-2 text-left text-sm transition-colors"
        :style="
          active === item
            ? {
                background:
                  'color-mix(in srgb, var(--primary) 10%, transparent)',
                color: 'var(--surface-950)',
              }
            : { color: 'var(--surface-700)' }
        "
        @click="active = item"
        @mouseover="
          (e) => {
            if (active !== item)
              (e.currentTarget as HTMLElement).style.background =
                'color-mix(in srgb, var(--primary) 5%, transparent)';
          }
        "
        @mouseleave="
          (e) => {
            if (active !== item)
              (e.currentTarget as HTMLElement).style.background = '';
          }
        "
      >
        {{ item }}
      </button>
    </div>
  </div>
</template>
