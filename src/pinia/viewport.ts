import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Viewport } from '../types/viewport';

export type { Viewport } from '../types/viewport';

export const viewports: Viewport[] = [
  { id: 'mobile', label: '手機', icon: 'pi-mobile', width: 390, height: 844 },
  { id: 'tablet', label: '平板', icon: 'pi-tablet', width: 768, height: 1024 },
  { id: 'pc', label: 'PC', icon: 'pi-desktop', width: null, height: null },
];

/** 自動判定手機 / 平板的 breakpoint（依實際視窗寬度切換 layout）。 */
const MOBILE_MAX = 768;
const TABLET_MAX = 1024;

export const useViewportStore = defineStore('viewport', () => {
  /** 使用者在 FloatingControls 手動挑的 viewport（mobile/tablet/pc）。 */
  const userSelection = ref<Viewport>(viewports[2]);

  /** 實際視窗寬度（SSR safe）；resize 時更新。
   *  Resize listener 直接於 module 層級綁定，不依賴 onMounted —
   *  setup store 內 onMounted 會綁到第一個 use 該 store 的元件，
   *  若該元件先卸載即失效，導致 PC 視窗縮放時 layout 不會自動切手機版。 */
  const windowWidth = ref(
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  );
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      windowWidth.value = window.innerWidth;
    });
  }

  /**
   * 暴露給元件使用的「有效 viewport」：
   * - 使用者選 mobile / tablet → 走 simulator frame（用該設定的固定寬高）
   * - 使用者選 PC → 跟著實際視窗寬度切：< 768 視為 mobile、< 1024 視為 tablet、其餘 PC
   *   此分支永遠不開 frame（width=null），讓 layout 直接撐滿瀏覽器
   */
  const current = computed<Viewport>(() => {
    if (userSelection.value.id !== 'pc') return userSelection.value;
    if (windowWidth.value < MOBILE_MAX) {
      return {
        id: 'mobile',
        label: viewports[0].label,
        icon: viewports[0].icon,
        width: null,
        height: null,
      };
    }
    if (windowWidth.value < TABLET_MAX) {
      return {
        id: 'tablet',
        label: viewports[1].label,
        icon: viewports[1].icon,
        width: null,
        height: null,
      };
    }
    return userSelection.value;
  });

  function set(vp: Viewport): void {
    userSelection.value = vp;
  }

  return { current, userSelection, viewports, set };
});
