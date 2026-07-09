import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * 全站模式切換：目前只有「直播主未用商城」。
 * 開啟後隱藏商城首頁 (/shop)、主題館 (/theme)、分類頁 (/category/*)，
 * 導航守衛把這些 path 導到 /member；NavBar 的 logo 與 CategoryTabs 也會跟著隱藏。
 */
export const useAppModeStore = defineStore('appMode', () => {
  const noShopMode = ref(false);
  const setNoShopMode = (v: boolean) => {
    noShopMode.value = v;
  };
  return { noShopMode, setNoShopMode };
});
