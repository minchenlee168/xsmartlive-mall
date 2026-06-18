<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  /** 直播公告頂部橫幅圖；未提供則讀 public/banners/announcement.png，不存在則顯示占位 */
  image?: string;
}>();

const src =
  props.image ?? `${import.meta.env.BASE_URL}banners/announcement.png`;
const imgError = ref(false);
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 公告 header with dividers -->
    <div class="flex items-center gap-4">
      <div class="h-px flex-1 bg-slate-200" />
      <div class="flex items-center py-1">
        <span class="text-xl font-bold whitespace-nowrap text-slate-700"
          >公告</span
        >
      </div>
      <div class="h-px flex-1 bg-slate-200" />
    </div>

    <!-- Announcement card -->
    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <!-- 頂部橫幅圖（載入失敗則整塊收起，不顯示占位） -->
      <div v-if="!imgError" class="aspect-[3/1] w-full bg-gray-100">
        <img
          :src="src"
          alt="直播公告"
          class="h-full w-full object-cover"
          @error="imgError = true"
        />
      </div>

      <!-- 場次文字 -->
      <div
        class="flex flex-col gap-4 px-8 py-6 text-center text-lg font-medium text-slate-700"
      >
        <p>✨ 本週直播場次時間</p>
        <div class="text-base leading-relaxed">
          <p>秋冬童裝馬拉松來啦😎</p>
          <br />
          <p>週三 早上10點 ✨特別場✨</p>
          <p>🍂秋冬童裝廠商庫存特優廠拍🤎</p>
          <br />
          <p>週四下午兩點 ✨特別場✨</p>
          <p>🍂秋冬童裝廠商庫存特優廠拍🤎</p>
          <br />
          <p>週四晚上19點 ✨特別場✨</p>
          <br />
          <p>週五下午兩點</p>
          <p>工作室小物清倉場 快來撿優惠⚡️🤩</p>
        </div>
      </div>
    </div>
  </div>
</template>
