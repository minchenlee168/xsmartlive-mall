import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface ToastState {
  id: number;
  severity: ToastSeverity;
  summary: string;
  detail?: string;
}

const TOAST_LIFE_MS = 2500;
let toastSeq = 0;
let toastHideTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = defineStore('ui', () => {
  /** 目前顯示的 toast；一次一則。 */
  const currentToast = ref<ToastState | null>(null);

  /**
   * 顯示一則 toast。預設「成功訊息」；失敗（error）或警告（warn）由呼叫端指定，
   * 例如 `ui.toast('複製失敗', 'error')`。
   * 新的 toast 會直接覆蓋舊的、重置倒數。
   */
  const toast = (
    message: string,
    severity: ToastSeverity = 'success',
    detail?: string,
  ) => {
    toastSeq += 1;
    if (toastHideTimer) clearTimeout(toastHideTimer);
    currentToast.value = { id: toastSeq, severity, summary: message, detail };
    toastHideTimer = setTimeout(() => {
      currentToast.value = null;
      toastHideTimer = null;
    }, TOAST_LIFE_MS);
  };
  const hideToast = () => {
    if (toastHideTimer) {
      clearTimeout(toastHideTimer);
      toastHideTimer = null;
    }
    currentToast.value = null;
  };

  // 換頁 loading 狀態（由 router 導航守衛切換）
  const routeLoading = ref(false);
  const setRouteLoading = (v: boolean) => {
    routeLoading.value = v;
  };

  // 底部抽屜開啟時鎖 frame scroll，讓抽屜底部能對齊 frame 視覺底部
  const frameScrollLocked = ref(false);
  const setFrameScrollLocked = (v: boolean) => {
    frameScrollLocked.value = v;
  };

  /** 加入購物車後跳的成功彈窗（App.vue 統一渲染）：null 表示關閉。 */
  const addedProductName = ref<string | null>(null);
  const showAddedToCart = (productName: string) => {
    addedProductName.value = productName;
  };
  const hideAddedToCart = () => {
    addedProductName.value = null;
  };

  return {
    currentToast,
    toast,
    hideToast,
    routeLoading,
    setRouteLoading,
    frameScrollLocked,
    setFrameScrollLocked,
    addedProductName,
    showAddedToCart,
    hideAddedToCart,
  };
});
