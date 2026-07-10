import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false);
  const displayName = ref('訪客');
  const avatarLetter = ref('P');
  const rewardPoints = ref(312.0);
  const couponCount = ref(15);
  const currency = ref({ symbol: 'NT$', code: 'TWD', label: '新台幣' });
  // 手機號碼：預設空 → 結帳流程會擋下要求綁定；由會員中心 / 綁定流程寫回
  const phoneCode = ref<string>('+886');
  const phone = ref<string>('');
  const hasPhoneBound = computed(() => phone.value.trim().length > 0);
  function setPhone(code: string, num: string) {
    phoneCode.value = code;
    phone.value = num;
  }

  function login(name?: string) {
    isLoggedIn.value = true;
    if (name) displayName.value = name;
  }
  function logout() {
    isLoggedIn.value = false;
    displayName.value = '訪客';
  }

  return {
    isLoggedIn,
    displayName,
    avatarLetter,
    rewardPoints,
    couponCount,
    currency,
    phoneCode,
    phone,
    hasPhoneBound,
    setPhone,
    login,
    logout,
  };
});
