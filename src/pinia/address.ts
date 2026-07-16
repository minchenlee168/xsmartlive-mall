import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Address } from '../types/address';

export type { Address, CvsChain } from '../types/address';

/**
 * 收件地址 store：宅配地址與超商門市的單一真相。
 * 會員中心（設定 / 設為預設）與結帳頁（帶出預設門市）共讀同一份。
 */
export const useAddressStore = defineStore('address', () => {
  /** 宅配收件地址。 */
  const homeAddrs = ref<Address[]>([
    {
      id: 'h1',
      name: '王小明',
      phone: '+886 912****56',
      address: '台北市信義區忠孝東路五段 100 號 10 樓',
      isDefault: true,
    },
    {
      id: 'h2',
      name: '王小明',
      phone: '+886 912****56',
      address: '台中市西屯區台灣大道三段 99 號',
      isDefault: false,
    },
  ]);

  /** 超商取貨門市。 */
  const storeAddrs = ref<Address[]>([
    {
      id: 's1',
      name: '王小明',
      phone: '+886 912****56',
      chain: '7-11',
      storeName: '鑫工門市',
      address: '台北市信義區忠孝東路五段 100 號 10 樓',
      isDefault: true,
    },
    {
      id: 's2',
      name: '王小明',
      phone: '+886 912****56',
      chain: '7-11',
      storeName: '連興門市',
      address: '高雄市三民區大連街 314 號',
      isDefault: false,
    },
    {
      id: 's3',
      name: '王小明',
      phone: '+886 912****56',
      chain: 'FamilyMart',
      storeName: '平鎮上海店',
      address: '桃園市平鎮區上海路２０５號１樓',
      isDefault: false,
    },
  ]);

  /** 預設宅配地址（無 isDefault 時退回第一筆）。 */
  const defaultHomeAddr = computed(
    () => homeAddrs.value.find((a) => a.isDefault) ?? homeAddrs.value[0] ?? null,
  );
  /** 預設超商門市（結帳頁超商取貨初始帶入用）。 */
  const defaultStoreAddr = computed(
    () =>
      storeAddrs.value.find((a) => a.isDefault) ?? storeAddrs.value[0] ?? null,
  );

  return { homeAddrs, storeAddrs, defaultHomeAddr, defaultStoreAddr };
});
