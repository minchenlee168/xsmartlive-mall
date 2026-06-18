<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '../stores/ui'
import LoaderSpinner from './portal-ui/LoaderSpinner.vue'

const ui = useUiStore()
const route = useRoute()
/** 後台 / 抽獎大螢幕路由顯示品牌 logo flip loader；前台維持原本購物車掉貨動畫。 */
const isAdminLoader = computed(() =>
  route.path === '/admin'
  || route.path.startsWith('/admin/')
  || route.path.startsWith('/lottery/'),
)
</script>

<template>
  <Transition name="page-loading">
    <div
      v-if="ui.routeLoading"
      class="fixed inset-0 z-[9998] flex items-center justify-center"
      style="background: color-mix(in srgb, var(--page-bg) 70%, #fff); backdrop-filter: blur(2px);"
    >
      <!-- 後台 loader：品牌 logo Y 軸翻轉 -->
      <div v-if="isAdminLoader" class="flex flex-col items-center gap-8">
        <LoaderSpinner size="240" />
        <span class="text-sm font-medium text-[#94a3b8]">載入中</span>
      </div>

      <div v-else class="flex flex-col items-center gap-5">
        <!-- 彩色幾何圖形掉進購物車 -->
        <div class="relative w-[8rem] h-[8rem]">
          <span class="drop-item shape-circle"   style="--d: 0s;    background: #f43f5e" />
          <span class="drop-item shape-square"   style="--d: 0.35s; background: #f59e0b" />
          <span class="drop-item shape-triangle" style="--d: 0.7s;  background: #22c55e" />
          <span class="drop-item shape-diamond"  style="--d: 1.05s; background: #3b82f6" />

          <!-- 購物車 -->
          <svg class="cart-icon" viewBox="0 0 145 114" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.448309 28.2311L30.8149 86.7427H108.214L123.609 24.3867C123.609 24.3867 -0.196221 27.5873 0.448309 28.2311Z" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6.85669 39.4872L120.331 36.3418" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M13.9834 53.1533L117.182 50.5781" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21.3862 67.0973L112.909 64.8164" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M27.3896 79.3479L110.055 77.3613" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21.6809 27.8066L41.6429 86.4654" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M43.3557 26.9434L55.8964 85.8965" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M65.3064 26.373L69.8549 86.7609" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M84.4031 25.5254L84.6793 86.1891" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M100.074 24.9551L101.511 85.3245" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M27.9421 96.7114H103.499C106.501 96.7114 109.079 94.6329 109.742 91.7082L129.446 3.30616L143.994 0.455078" stroke="#616161" stroke-width="0.91" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M56.1726 105.982C56.1726 110.305 52.6553 113.818 48.3278 113.818C44.0002 113.818 40.4829 110.305 40.4829 105.982C40.4829 101.66 44.0002 98.1465 48.3278 98.1465C52.6553 98.1465 56.1726 101.66 56.1726 105.982Z" fill="#616161"/>
            <path d="M93.7212 105.982C93.7212 110.305 90.2039 113.818 85.8763 113.818C81.5488 113.818 78.0315 110.305 78.0315 105.982C78.0315 101.66 81.5488 98.1465 85.8763 98.1465C90.2039 98.1465 93.7212 101.66 93.7212 105.982Z" fill="#616161"/>
          </svg>
        </div>
        <span class="text-sm font-medium text-[#94a3b8]">載入中</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.page-loading-enter-active,
.page-loading-leave-active {
  transition: opacity 0.2s ease;
}
.page-loading-enter-from,
.page-loading-leave-to {
  opacity: 0;
}

/* 購物車置於下方中央 */
.cart-icon {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 7rem;
  height: auto;
  animation: cart-bounce 1.4s ease-in-out infinite;
}

/* 幾何圖形：從上方落入購物車後縮小消失，多顆錯開時間形成連續掉落 */
.drop-item {
  position: absolute;
  top: 0;
  left: 46%;
  width: 1.25rem;
  height: 1.25rem;
  opacity: 0;
  animation: drop 1.4s cubic-bezier(0.5, 0, 0.7, 1) infinite;
  animation-delay: var(--d);
}
.shape-circle   { border-radius: 9999px; }
.shape-square   { border-radius: 0.15rem; }
.shape-triangle { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }
.shape-diamond  { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); }

@keyframes drop {
  0%   { transform: translate(-50%, 0) scale(1);        opacity: 0; }
  12%  { opacity: 1; }
  60%  { transform: translate(-50%, 3.4rem) scale(0.9); opacity: 1; }
  76%  { transform: translate(-50%, 4rem) scale(0.35);  opacity: 0; }
  100% { transform: translate(-50%, 4rem) scale(0.35);  opacity: 0; }
}

/* 圖形落入時購物車輕彈一下 */
@keyframes cart-bounce {
  0%, 55%, 100% { transform: translateX(-50%) translateY(0); }
  68%           { transform: translateX(-50%) translateY(-4px); }
  80%           { transform: translateX(-50%) translateY(0); }
}
</style>
