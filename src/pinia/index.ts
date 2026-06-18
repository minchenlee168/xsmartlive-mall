/**
 * Pinia store 統一匯出 + 全域清除（對齊 reference repo 慣例）。
 * 加 store 時記得：
 * 1) 在這裡 re-export
 * 2) 若有登出需清空的狀態，在 clearAllStores() 中呼叫該 store 的 reset
 */
export { useAuthStore } from './auth';
export { useCartStore } from './cart';
export { useDensityStore } from './density';
export { useOrdersStore } from './orders';
export { usePrefsStore } from './prefs';
export { useThemeStore } from './theme';
export { useUiStore } from './ui';
export { useViewportStore } from './viewport';

import { useAuthStore } from './auth';
import { useCartStore } from './cart';
import { useOrdersStore } from './orders';

/** 登出時呼叫，清空所有與使用者帳號相關的 store 狀態。 */
export const clearAllStores = (): void => {
  useAuthStore().$reset?.();
  useCartStore().$reset?.();
  useOrdersStore().$reset?.();
};
