import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'
import HomePage from '../views/HomePage.vue'
import ThemeHallPage from '../views/ThemeHallPage.vue'
import CategoryPage from '../views/CategoryPage.vue'
import ProductDetailPage from '../views/ProductDetailPage.vue'
import CartPage from '../views/CartPage.vue'
import LoginPage from '../views/LoginPage.vue'
import CheckoutPage from '../views/CheckoutPage.vue'
import SearchPage from '../views/SearchPage.vue'
import MemberCenterPage from '../views/MemberCenterPage.vue'
import RegisterPage from '../views/RegisterPage.vue'
import ForgotPasswordPage from '../views/ForgotPasswordPage.vue'
import InfoPage from '../views/InfoPage.vue'
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: LandingPage },
    { path: '/shop', component: HomePage },
    { path: '/theme', component: ThemeHallPage },
    { path: '/category/:tab', component: CategoryPage },
    { path: '/product/:id', component: ProductDetailPage },
    { path: '/cart', component: CartPage },
    { path: '/checkout', component: CheckoutPage },
    { path: '/search', component: SearchPage },
    { path: '/member', component: MemberCenterPage },
    { path: '/login', component: LoginPage },
    { path: '/register', component: RegisterPage },
    { path: '/forgot', component: ForgotPasswordPage },
    { path: '/terms', component: InfoPage },
    { path: '/privacy', component: InfoPage },
    { path: '/help', component: InfoPage },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

// 需登入才能進入的頁面
const AUTH_REQUIRED = ['/cart', '/checkout']

// 換頁 loading：切換路徑時顯示載入畫面
let loadingTimer: ReturnType<typeof setTimeout> | null = null
router.beforeEach((to, from) => {
  if (AUTH_REQUIRED.includes(to.path) && !useAuthStore().isLoggedIn) {
    useUiStore().toast('請先登入會員')
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path !== from.path) {
    if (loadingTimer) clearTimeout(loadingTimer)
    useUiStore().setRouteLoading(true)
  }
  return true
})
router.afterEach(() => {
  if (loadingTimer) clearTimeout(loadingTimer)
  loadingTimer = setTimeout(() => useUiStore().setRouteLoading(false), 500)
})

export default router
