import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const displayName = ref('訪客')
  const avatarLetter = ref('P')
  const rewardPoints = ref(312.00)
  const couponCount = ref(15)
  const currency = ref({ symbol: 'NT$', code: 'TWD', label: '新台幣' })

  function login(name?: string) {
    isLoggedIn.value = true
    if (name) displayName.value = name
  }
  function logout() {
    isLoggedIn.value = false
    displayName.value = '訪客'
  }

  return {
    isLoggedIn, displayName, avatarLetter,
    rewardPoints, couponCount, currency,
    login, logout,
  }
})
