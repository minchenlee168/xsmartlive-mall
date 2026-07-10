<script setup lang="ts">
import {
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import FloatingControls from './components/FloatingControls.vue';
import AppFooter from './components/AppFooter.vue';
import PageLoading from './components/PageLoading.vue';
import AuroraShell from './components/AuroraShell.vue';
import { useViewportStore } from './pinia/viewport';
import { useUiStore } from './pinia/ui';
import { useThemeStore } from './pinia/theme';

const viewportStore = useViewportStore();
const ui = useUiStore();
const themeStore = useThemeStore();
const route = useRoute();
const router = useRouter();

/** 加入購物車彈窗：按下「點此結帳」→ 導 /cart 並關閉。 */
const handleGoCartFromAdded = () => {
  ui.hideAddedToCart();
  router.push('/cart');
};

/** 加入購物車彈窗自動關閉：出現 3 秒後自動 hide；重新彈出會重置倒數。 */
const ADDED_TO_CART_AUTO_HIDE_MS = 3000;
let addedAutoHideTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => ui.addedProductName,
  (name) => {
    if (addedAutoHideTimer) {
      clearTimeout(addedAutoHideTimer);
      addedAutoHideTimer = null;
    }
    if (name !== null) {
      addedAutoHideTimer = setTimeout(() => {
        ui.hideAddedToCart();
        addedAutoHideTimer = null;
      }, ADDED_TO_CART_AUTO_HIDE_MS);
    }
  },
);
onBeforeUnmount(() => {
  if (addedAutoHideTimer) clearTimeout(addedAutoHideTimer);
});

// 入口頁與 auth 頁；不顯示 Footer、不套 Aurora shell
const AUTH_PATHS = ['/login', '/register', '/forgot', '/social-signup'];

const isAurora = computed(() => themeStore.current.id === 'aurora');
/** Aurora 但走到 auth 路徑時不套 Shell，讓頁面像其他外觀一樣全寬 */
const useAuroraShell = computed(
  () => isAurora.value && !AUTH_PATHS.includes(route.path),
);
const appearanceId = computed(() => themeStore.current.id);

// 把 PrimeVue ToastService 注入 ui store，讓全域 ui.toast() 走 PrimeVue <Toast>
ui.setToastService(useToast());
const frameRef = ref<HTMLElement | null>(null);
// 商城前台：所有頁面都允許 frame；入口頁外都顯示 FloatingControls
const isFullscreen = computed(() => false);
const showControls = computed(() => route.path !== '/');
const showFooter = computed(
  () => route.path !== '/' && !AUTH_PATHS.includes(route.path),
);

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
        class="rounded-full bg-white/80 px-3 py-1 text-xs text-slate-500 shadow-sm"
      >
        <i
          :class="`pi pi-${viewportStore.current.id === 'mobile' ? 'mobile' : 'tablet'} mr-1`"
        />
        {{ viewportStore.current.label }} — {{ viewportStore.current.width }}px
      </span>
    </div>

    <!-- viewport frame -->
    <div
      ref="frameRef"
      :style="frameStyle"
      class="@container"
      :class="`appearance-${appearanceId}`"
    >
      <template v-if="useAuroraShell">
        <AuroraShell>
          <RouterView />
        </AuroraShell>
      </template>
      <template v-else>
        <RouterView />
        <AppFooter v-if="showFooter" />
      </template>
    </div>
  </div>

  <FloatingControls v-if="showControls" />

  <!-- 換頁 loading 遮罩 -->
  <PageLoading />

  <!-- PrimeVue 全域 Toast：畫面正中、一次只顯示一個（add 前會 removeAllGroups） -->
  <Toast position="center" />

  <!-- 加入購物車成功彈窗：白底、靠上、不遮罩、3 秒後自動消失 -->
  <Dialog
    :visible="ui.addedProductName !== null"
    :modal="false"
    position="top"
    header="加入購物車"
    :draggable="false"
    :style="{ width: '380px' }"
    :breakpoints="{ '768px': '88vw' }"
    @update:visible="(v) => !v && ui.hideAddedToCart()"
  >
    <p class="mb-5 text-sm text-slate-700">
      商品名稱：{{ ui.addedProductName }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <Button label="點此結帳" @click="handleGoCartFromAdded" />
      <Button
        label="繼續購物"
        severity="secondary"
        outlined
        @click="ui.hideAddedToCart()"
      />
    </div>
  </Dialog>
</template>

<style scoped>
/* ═════════════ Aurora（極光珊瑚）全站樣式 ═════════════ */
/* AuroraShell 已提供 bottom nav，會員中心自己的手機底部 4-tab bar（z-30）隱藏，避免雙 bar 重疊 */
.appearance-aurora :deep(.sticky.bottom-0.z-30) {
  display: none !important;
}

/* ═════════════ Midnight（深夜藍）全站樣式 ═════════════ */
/* 整頁深底 + 亮字 */
.appearance-midnight {
  background: linear-gradient(
    160deg,
    #0f172a 0%,
    #1e293b 50%,
    #0f172a 100%
  ) !important;
  color: #f1f5f9;
}
.appearance-midnight :deep(h2),
.appearance-midnight :deep(p) {
  color: inherit;
}
/* 頁面 wrapper 若有 var(--page-bg) 背景蓋掉，維持深底 */
.appearance-midnight :deep(.min-h-screen) {
  background: transparent !important;
}

/* NavBar：深色底 + 亮字 */
.appearance-midnight :deep(header.sticky) {
  background: #0f172a !important;
  border-bottom-color: rgba(148, 163, 184, 0.15) !important;
}
.appearance-midnight :deep(header.sticky button:hover) {
  background-color: transparent !important;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.5) !important;
  border-radius: 8px !important;
}
.appearance-midnight :deep(header .text-slate-700),
.appearance-midnight :deep(header .text-slate-950) {
  color: #e0e7ff !important;
}
.appearance-midnight :deep(header .text-slate-400),
.appearance-midnight :deep(header .text-slate-500),
.appearance-midnight :deep(header .text-slate-600) {
  color: #94a3b8 !important;
}
.appearance-midnight :deep(header .p-inputtext) {
  background: #1e293b !important;
  border-color: rgba(148, 163, 184, 0.2) !important;
  color: #e0e7ff !important;
}

/* Header 展開的下拉選單（用戶選單 / 貨幣 / 購物車…）：實心深底 + 強陰影，避免透過看到後方內容 */
.appearance-midnight :deep(header .absolute.top-full),
.appearance-midnight :deep(header div.absolute.top-full.bg-white) {
  background-color: #0f172a !important;
  background-image: none !important;
  border: 1px solid rgba(148, 163, 184, 0.35) !important;
  box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.85) !important;
  backdrop-filter: none !important;
  opacity: 1 !important;
}
.appearance-midnight :deep(header .absolute.top-full .border-b),
.appearance-midnight :deep(header .absolute.top-full .border-t) {
  border-color: rgba(148, 163, 184, 0.15) !important;
}
.appearance-midnight :deep(header .absolute.top-full button:hover),
.appearance-midnight :deep(header .absolute.top-full a:hover) {
  background: rgba(59, 130, 246, 0.15) !important;
  box-shadow: none !important;
}
/* 選單內的文字：亮色 */
.appearance-midnight :deep(header .absolute.top-full .text-slate-700),
.appearance-midnight :deep(header .absolute.top-full .text-slate-950) {
  color: #e0e7ff !important;
}
.appearance-midnight :deep(header .absolute.top-full .text-slate-400),
.appearance-midnight :deep(header .absolute.top-full .text-slate-500),
.appearance-midnight :deep(header .absolute.top-full .text-slate-600) {
  color: #94a3b8 !important;
}

/* CategoryTabs：改膠囊式 */
.appearance-midnight :deep(.sticky[style*='--tabs-bg']),
.appearance-midnight :deep([style*='var(--tabs-bg)']) {
  background: transparent !important;
  padding: 8px 0;
}
.appearance-midnight :deep([style*='var(--tabs-bg)']) button {
  margin: 0 4px;
  border-radius: 9999px !important;
  padding: 6px 16px !important;
  border: 1px solid rgba(148, 163, 184, 0.4) !important;
  background: #1e293b !important;
  color: #e0e7ff !important;
  min-height: 36px !important;
}
.appearance-midnight :deep([style*='var(--tabs-bg)']) button:hover {
  background: rgba(59, 130, 246, 0.2) !important;
}
.appearance-midnight :deep([style*='var(--tabs-bg)']) button.bg-white\/15 {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
  color: #fff !important;
}
.appearance-midnight
  :deep([style*='var(--tabs-bg)'])
  button
  > span.absolute.bottom-0 {
  display: none !important;
}
.appearance-midnight :deep([style*='var(--tabs-bg)']) > div.absolute.top-full {
  background: #0f172a !important;
  border-bottom-color: rgba(148, 163, 184, 0.15) !important;
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.6) !important;
}
.appearance-midnight
  :deep([style*='var(--tabs-bg)'])
  > div.absolute.top-full
  .p-button {
  background: transparent !important;
  border-color: rgba(148, 163, 184, 0.3) !important;
  color: #e0e7ff !important;
}
.appearance-midnight
  :deep([style*='var(--tabs-bg)'])
  > div.absolute.top-full
  .p-button:hover {
  background: rgba(59, 130, 246, 0.2) !important;
}
.appearance-midnight
  :deep([style*='var(--tabs-bg)'])
  > div.absolute.top-full
  .p-button:not(.p-button-outlined) {
  background: #3b82f6 !important;
  border-color: #3b82f6 !important;
  color: #fff !important;
}

/* Footer 深色 */
.appearance-midnight :deep(footer) {
  background: #0f172a !important;
  border-top-color: rgba(148, 163, 184, 0.15) !important;
}
.appearance-midnight :deep(footer .text-slate-500),
.appearance-midnight :deep(footer .text-slate-400) {
  color: #94a3b8 !important;
}
.appearance-midnight :deep(footer .text-slate-300) {
  color: rgba(148, 163, 184, 0.4) !important;
}

/* AnnouncementSection：拿掉內部白底卡 */
.appearance-midnight :deep(.rounded-lg.border.border-slate-200.bg-white) {
  background: transparent !important;
  border-color: rgba(148, 163, 184, 0.2) !important;
}
.appearance-midnight
  :deep(.rounded-lg.border.border-slate-200.bg-white .bg-gray-100) {
  background: rgba(30, 41, 59, 0.5) !important;
}
.appearance-midnight :deep(.h-px.flex-1.bg-slate-200) {
  background: rgba(148, 163, 184, 0.2) !important;
}
.appearance-midnight
  :deep(.rounded-lg.border.border-slate-200.bg-white .text-slate-700) {
  color: #f1f5f9 !important;
}
.appearance-midnight :deep(span.text-xl.font-bold.text-slate-700) {
  color: #22d3ee !important;
  text-shadow: 0 0 12px rgba(34, 211, 238, 0.4);
}

/* 商品卡：透明底 + 淺藍框 + 螢光藍價格 */
.appearance-midnight :deep(.product-card) {
  background: transparent !important;
  border: 1px solid #93c5fd !important;
  box-shadow: none !important;
  color: #e0e7ff;
}
.appearance-midnight :deep(.product-card .text-rose-500) {
  color: #22d3ee !important;
}
.appearance-midnight :deep(.product-card .text-slate-700),
.appearance-midnight :deep(.product-card .text-slate-950) {
  color: #e0e7ff !important;
}
.appearance-midnight :deep(.product-card .text-slate-500),
.appearance-midnight :deep(.product-card .text-slate-400) {
  color: #94a3b8 !important;
}

/* 限時搶購：霓虹風（無底色、無邊線） */
.appearance-midnight :deep(.flash-sale-bar) {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  color: #f1f5f9;
}
.appearance-midnight :deep(.flash-sale-bar .text-slate-700) {
  color: #f1f5f9 !important;
}
.appearance-midnight :deep(.flash-sale-bar .pi-stopwatch) {
  color: #22d3ee !important;
  text-shadow: 0 0 8px rgba(34, 211, 238, 0.6);
}
.appearance-midnight :deep(.flash-sale-chip) {
  background: transparent !important;
  border: 1px solid rgba(56, 189, 248, 0.7) !important;
  color: #22d3ee !important;
  text-shadow: 0 0 8px rgba(34, 211, 238, 0.6);
  box-shadow:
    0 0 12px rgba(34, 211, 238, 0.25),
    inset 0 0 8px rgba(34, 211, 238, 0.1) !important;
}
.appearance-midnight :deep(.flash-sale-bar .text-slate-700):is(span) {
  color: #22d3ee !important;
}

/* ── 全站白底卡片改深底（購物車 / 會員 / 商品詳情…） ── */
.appearance-midnight :deep(.bg-white),
.appearance-midnight :deep(.bg-slate-50),
.appearance-midnight :deep(.bg-slate-100) {
  background: #1e293b !important;
}
/* 商品圖片預設灰底 → 略深板岩，避免亮灰在深底突出 */
.appearance-midnight :deep(.bg-slate-200) {
  background: #334155 !important;
}
.appearance-midnight :deep([class*='border-slate-200']) {
  border-color: rgba(148, 163, 184, 0.15) !important;
}
/* ── 一般 slate 文字色 → 亮色（specific overrides 會優先） ── */
.appearance-midnight :deep(.text-slate-950),
.appearance-midnight :deep(.text-slate-700) {
  color: #e0e7ff !important;
}
.appearance-midnight :deep(.text-slate-600),
.appearance-midnight :deep(.text-slate-500),
.appearance-midnight :deep(.text-slate-400) {
  color: #94a3b8 !important;
}
/* ── PrimeVue secondary text Button（返回箭頭等）→ 亮色 icon ── */
.appearance-midnight :deep(.p-button.p-button-text.p-button-secondary),
.appearance-midnight :deep(.p-button.p-button-text.p-button-secondary:hover) {
  color: #e0e7ff !important;
}

/* ── 金額 / 主色文字：深藍在深底看不清，改螢光藍 ── */
.appearance-midnight :deep([style*='color: var(--primary)']) {
  color: #22d3ee !important;
  text-shadow: 0 0 8px rgba(34, 211, 238, 0.3);
}
</style>
