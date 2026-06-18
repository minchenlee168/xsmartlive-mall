<script setup lang="ts">
import {
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue';
import { RouterView, useRoute } from 'vue-router';
import FloatingControls from './components/FloatingControls.vue';
import PageLoading from './components/PageLoading.vue';
import { useViewportStore } from './pinia/viewport';
import { useUiStore } from './pinia/ui';

const viewportStore = useViewportStore();
const ui = useUiStore();
const route = useRoute();
const frameRef = ref<HTMLElement | null>(null);
// 商城前台：所有頁面都允許 frame；入口頁外都顯示 FloatingControls
const isFullscreen = computed(() => false);
const showControls = computed(() => route.path !== '/');

const frameStyle = computed(() => {
  if (isFullscreen.value) return {};
  const w = viewportStore.current.width;
  const h = viewportStore.current.height;
  if (!w) return {};
  return {
    width: `${w}px`,
    margin: '0 auto',
    boxShadow: '0 0 0 1px #e2e8f0, 0 8px 32px rgba(0,0,0,0.12)',
    // 模擬實機螢幕高度：內容超過 → frame 內部 scroll，不撐高外層
    height: h ? `${h}px` : '100vh',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
  };
});

const isConstrained = computed(
  () => !isFullscreen.value && !!viewportStore.current.width,
);

/**
 * 把 frame 的視窗座標暴露成 CSS 變數，給 position:fixed 抽屜
 * 用「frame 視覺底部 / 中心 / 寬度」作為定位，避免黏住瀏覽器視窗底部跑出 frame 外。
 */
function updateFrameVars(): void {
  if (!frameRef.value) {
    document.documentElement.style.removeProperty('--frame-bottom');
    document.documentElement.style.removeProperty('--frame-left');
    document.documentElement.style.removeProperty('--frame-width');
    document.documentElement.classList.remove('frame-mode');
    return;
  }
  const rect = frameRef.value.getBoundingClientRect();
  document.documentElement.style.setProperty(
    '--frame-bottom',
    `${Math.max(0, window.innerHeight - rect.bottom)}px`,
  );
  document.documentElement.style.setProperty('--frame-left', `${rect.left}px`);
  document.documentElement.style.setProperty(
    '--frame-width',
    `${rect.width}px`,
  );
  // 只在「使用者手動選擇 mobile/tablet」（current.width 有值）時加 frame-mode 旗標，
  // 給 PrimeVue Drawer 等用 CSS class 條件式覆寫定位（避免 inline style 與動畫時序衝突）
  if (viewportStore.current.width != null) {
    document.documentElement.classList.add('frame-mode');
  } else {
    document.documentElement.classList.remove('frame-mode');
  }
}

onMounted(() => {
  void nextTick(updateFrameVars);
  window.addEventListener('resize', updateFrameVars);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateFrameVars);
});

// 切換裝置 / 進出全螢幕時重新計算
watch([() => viewportStore.current.id, isFullscreen], () => {
  void nextTick(updateFrameVars);
});
</script>

<template>
  <div
    :class="isConstrained ? 'min-h-screen py-4' : ''"
    :style="
      isConstrained
        ? 'background: color-mix(in srgb, var(--page-bg) 60%, #94a3b8)'
        : ''
    "
  >
    <!-- device label -->
    <div v-if="isConstrained" class="mb-2 text-center">
      <span
        class="rounded-full bg-white/80 px-3 py-1 text-xs text-[#64748b] shadow-sm"
      >
        <i
          :class="`pi pi-${viewportStore.current.id === 'mobile' ? 'mobile' : 'tablet'} mr-1`"
        />
        {{ viewportStore.current.label }} — {{ viewportStore.current.width }}px
      </span>
    </div>

    <!-- viewport frame -->
    <div ref="frameRef" :style="frameStyle" class="@container">
      <RouterView />
    </div>
  </div>

  <FloatingControls v-if="showControls" />

  <!-- 換頁 loading 遮罩 -->
  <PageLoading />

  <!-- PrimeVue 全域 Toast：靠上置中、一次只顯示一個（add 前會 removeAllGroups） -->
  <Toast position="top-center" />

  <!-- Global toast -->
  <Transition name="ui-toast">
    <div
      v-if="ui.toastVisible"
      class="fixed top-6 left-1/2 z-[9999] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-[8px] bg-[#1e293b] px-4 py-2.5 text-sm text-white shadow-lg"
    >
      <i class="pi pi-info-circle" />
      {{ ui.toastMessage }}
    </div>
  </Transition>
</template>

<style>
.ui-toast-enter-active,
.ui-toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.ui-toast-enter-from,
.ui-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px);
}
</style>
