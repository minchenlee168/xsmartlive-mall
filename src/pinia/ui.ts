import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

/**
 * 最小 PrimeVue ToastService 介面，避開直接 import PrimeVue 型別。
 * App.vue 在 setup() 內呼叫 useToast()，再透過 setToastService 注入這裡。
 */
interface ToastServiceLike {
  add: (options: {
    severity?: ToastSeverity;
    summary?: string;
    detail?: string;
    life?: number;
    closable?: boolean;
  }) => void;
  removeAllGroups: () => void;
}

const TOAST_LIFE_MS = 2500;

export const useUiStore = defineStore('ui', () => {
  let toastService: ToastServiceLike | null = null;
  const setToastService = (svc: ToastServiceLike) => {
    toastService = svc;
  };

  /**
   * 顯示一則 PrimeVue Toast。預設視為「成功訊息」；
   * 失敗（error）或警告（warn）請在呼叫端明確帶入 severity，
   * 例如 `ui.toast('複製失敗', 'error')`。
   * 一次只顯示一則，避免堆疊。
   */
  const toast = (message: string, severity: ToastSeverity = 'success') => {
    if (!toastService) return;
    toastService.removeAllGroups();
    toastService.add({
      severity,
      summary: message,
      life: TOAST_LIFE_MS,
    });
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

  return {
    setToastService,
    toast,
    routeLoading,
    setRouteLoading,
    frameScrollLocked,
    setFrameScrollLocked,
  };
});
