import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * 線上客服彈窗開關（原型假 UI，後端未開發）。
 * 面板由 App.vue 全站掛一次的 CustomerServiceFab 渲染，狀態抽到 store，
 * 讓浮動鈕（購物車／會員中心）與 Footer 的「線上客服」連結都能開同一個彈窗。
 */
export const useCustomerServiceStore = defineStore('customerService', () => {
  const isOpen = ref(false);
  const open = () => {
    isOpen.value = true;
  };
  const close = () => {
    isOpen.value = false;
  };
  return { isOpen, open, close };
});
