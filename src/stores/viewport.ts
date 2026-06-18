import { defineStore } from 'pinia'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

export interface Viewport {
  id: 'mobile' | 'tablet' | 'pc'
  label: string
  icon: string
  width: number | null
  /** 限制高度（null = 不限），模擬實機螢幕高度；frame 內容超過會內部 scroll */
  height: number | null
}

export const viewports: Viewport[] = [
  { id: 'mobile', label: '手機', icon: 'pi-mobile',  width: 390,  height: 844  },
  { id: 'tablet', label: '平板', icon: 'pi-tablet',  width: 768,  height: 1024 },
  { id: 'pc',     label: 'PC',   icon: 'pi-desktop', width: null, height: null },
]

/** 自動判定手機 / 平板的 breakpoint（依實際視窗寬度切換 layout）。 */
const MOBILE_MAX = 768
const TABLET_MAX = 1024

export const useViewportStore = defineStore('viewport', () => {
  /** 使用者在 FloatingControls 手動挑的 viewport（mobile/tablet/pc）。 */
  const userSelection = ref<Viewport>(viewports[2])

  /** 實際視窗寬度（SSR safe）；resize 時更新。 */
  const windowWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
  function onResize(): void { windowWidth.value = window.innerWidth }
  onMounted(() => window.addEventListener('resize', onResize))
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))

  /**
   * 暴露給元件使用的「有效 viewport」：
   * - 使用者選 mobile / tablet → 走 simulator frame（用該設定的固定寬高）
   * - 使用者選 PC → 跟著實際視窗寬度切：< 768 視為 mobile、< 1024 視為 tablet、其餘 PC
   *   此分支永遠不開 frame（width=null），讓 layout 直接撐滿瀏覽器
   */
  const current = computed<Viewport>(() => {
    if (userSelection.value.id !== 'pc') return userSelection.value
    if (windowWidth.value < MOBILE_MAX) {
      return { id: 'mobile', label: viewports[0].label, icon: viewports[0].icon, width: null, height: null }
    }
    if (windowWidth.value < TABLET_MAX) {
      return { id: 'tablet', label: viewports[1].label, icon: viewports[1].icon, width: null, height: null }
    }
    return userSelection.value
  })

  function set(vp: Viewport): void {
    userSelection.value = vp
  }

  return { current, userSelection, viewports, set }
})
