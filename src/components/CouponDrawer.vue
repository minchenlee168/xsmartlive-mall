<script setup lang="ts">
import { computed } from 'vue'
import { useViewportStore } from '../stores/viewport'

const visible = defineModel<boolean>('visible', { default: false })

const viewportStore = useViewportStore()
const isMobile = computed(() => viewportStore.current.id === 'mobile')

// 平板與電腦版固定 680px；手機符合 frame 寬度（自動 RWD 時 current.width=null → 100vw）
const drawerWidth = computed(() => {
  if (!isMobile.value) return '680px'
  const w = viewportStore.current.width
  return w ? `${w}px` : '100vw'
})

interface Coupon {
  id: number
  discount: string
  name: string
  description: string
  tagText: string
  tagType: 'danger' | 'info' | 'secondary'
  expiry: string
  disabled?: boolean
}

const coupons: Coupon[] = [
  {
    id: 1,
    discount: '折100',
    name: '滿千折百優惠券（滿1000元使用）',
    description: '活動訂單滿 $1000 現折 $100',
    tagText: '適用範圍（直播場次）：我是直播場次-2025-12-24',
    tagType: 'danger',
    expiry: '有效期限至 2026.01.20 23:00',
  },
  {
    id: 2,
    discount: '50%',
    name: '滿千五折（滿1000元使用）',
    description: '活動訂單滿 $1000 打5折',
    tagText: '適用範圍(粉絲團貼文)：我是粉絲團貼文-2025-12-24',
    tagType: 'info',
    expiry: '有效期限至 2026.01.20 23:00',
  },
  {
    id: 3,
    discount: '折300',
    name: '滿三千折三百（滿3000元使用）',
    description: '常客單筆滿 $3000 現折 $300',
    tagText: '適用範圍：全站',
    tagType: 'secondary',
    expiry: '有效期限至 2026.01.20 23:00',
  },
]
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div v-if="visible" class="coupon-drawer-backdrop" @click="visible = false" />
    </Transition>
    <Transition name="drawer-slide">
      <div v-if="visible" class="coupon-drawer-panel" :style="{ width: drawerWidth, maxWidth: '100vw' }">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] sticky top-0 bg-white z-10">
          <span class="font-bold text-[16px] text-[#020617]">可使用優惠券</span>
          <button class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f1f5f9]" @click="visible = false">
            <i class="pi pi-times text-[14px] text-[#64748b]" />
          </button>
        </div>

        <!-- Coupon list -->
        <div class="px-4 py-4 max-w-[680px] mx-auto flex flex-col gap-3">
          <div
            v-for="coupon in coupons"
            :key="coupon.id"
            class="flex border border-[#e2e8f0] rounded-[10px]"
          >
            <div
              class="shrink-0 flex items-center justify-center rounded-l-[10px] bg-[#ede9fe]"
              :class="isMobile ? 'w-[76px] gap-1 px-2 py-3' : 'w-[140px] gap-2 px-3 py-4'"
            >
              <i v-if="!isMobile" class="pi pi-gift text-[22px]" style="color: var(--primary)" />
              <span
                class="font-bold"
                :class="isMobile ? 'text-[18px]' : 'text-[24px]'"
                style="color: var(--primary)"
              >{{ coupon.discount }}</span>
            </div>

            <div class="flex-1 min-w-0 flex flex-col gap-1" :class="isMobile ? 'px-3 py-3' : 'px-4 py-4'">
              <p class="font-medium text-[15px] text-[#334155]">{{ coupon.name }}</p>
              <p class="text-[13px] text-[#475569]">{{ coupon.description }}</p>
              <span class="self-start px-2 py-0.5 rounded text-[12px] break-words" style="background: #fce7f3; color: #be185d">{{ coupon.tagText }}</span>
              <p class="text-[12px] text-[#64748b] mt-1">{{ coupon.expiry }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* 跟 CheckoutPage 同一套手刻 drawer：用 frame CSS 變數定位、自己處理 enter / leave 動畫，
   不再經過 PrimeVue Drawer 的 transform 動畫計算（避免在 < 768 與 frame 模式有時序衝突）。 */
.coupon-drawer-backdrop {
  position: fixed;
  top: 0;
  left: var(--frame-left, 0);
  width: var(--frame-width, 100vw);
  height: calc(100vh - var(--frame-bottom, 0px));
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
}
.coupon-drawer-panel {
  position: fixed;
  left: calc(var(--frame-left, 0px) + var(--frame-width, 100vw) / 2);
  bottom: var(--frame-bottom, 0px);
  transform: translateX(-50%);
  z-index: 1010;
  background: white;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

/* 自動 RWD 縮到手機寬：背景遮罩全螢幕；drawer 硬鎖 bottom: 0，不再依賴 --frame-bottom，
   避免 frame 元素在 updateFrameVars 第一次跑時內容還沒完整渲染，--frame-bottom 算到正數
   把 drawer 推離螢幕底部（要拉動視窗才正常的根本原因） */
@media (max-width: 768px) {
  .coupon-drawer-backdrop {
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
  }
  .coupon-drawer-panel {
    left: 50vw !important;
    bottom: 0 !important;
  }
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(-50%) translateY(100%);
}
.drawer-slide-enter-to,
.drawer-slide-leave-from {
  transform: translateX(-50%) translateY(0);
}
</style>
