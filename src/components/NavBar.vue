<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useUiStore } from '../stores/ui'
import { usePrefsStore, type Currency, type Language } from '../stores/prefs'
import walletIcon from '../assets/wallet.svg'
import couponIcon from '../assets/coupon.svg'

const keyword = ref('')
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const ui = useUiStore()
const prefs = usePrefsStore()

function goMember() {
  userMenuOpen.value = false
  router.push('/member')
}

/** 從下拉選單跳到會員中心特定分頁（紅利點數 / 優惠券）。 */
function goMemberTab(tab: 'points' | 'coupons' | 'orders' | 'transactions' | 'account') {
  userMenuOpen.value = false
  router.push({ path: '/member', query: { tab } })
}

// Language picker
const langMenuOpen = ref(false)
function toggleLangMenu() { langMenuOpen.value = !langMenuOpen.value }
function pickLanguage(l: Language) {
  prefs.setLanguage(l)
  langMenuOpen.value = false
  ui.toast(`語言已切換為 ${l.label}`)
}

// Currency picker dialog
const currencyDialogOpen = ref(false)
function openCurrencyDialog() {
  userMenuOpen.value = false
  currencyDialogOpen.value = true
}
function pickCurrency(c: Currency) {
  prefs.setCurrency(c)
  currencyDialogOpen.value = false
  ui.toast(`貨幣已切換為 ${c.label}（${c.code}）`)
}

// Mobile/tablet collapsible search
const mobileSearchOpen = ref(false)
const mobileSearchInput = ref<{ $el?: HTMLElement } | null>(null)
async function toggleMobileSearch() {
  mobileSearchOpen.value = !mobileSearchOpen.value
  if (mobileSearchOpen.value) {
    await nextTick()
    mobileSearchInput.value?.$el?.focus()
  }
}

const userMenuOpen = ref(false)
function toggleUserMenu() { userMenuOpen.value = !userMenuOpen.value }
function onLogout() {
  auth.logout()
  userMenuOpen.value = false
  router.push('/shop')
}
function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('[data-user-menu]')) userMenuOpen.value = false
  if (!target.closest('[data-lang-menu]')) langMenuOpen.value = false
  if (!target.closest('[data-msearch]')) mobileSearchOpen.value = false
}
document.addEventListener('click', onDocClick)
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

// Hot search keywords — shown below search bar (PC) and in collapsible search (mobile/tablet)
const hotKeywords = ['童裝男生', '男生女生童裝', '女童外套', '皮衣外套女童', '大童童裝', '女童運動套裝', '寶寶包屁衣', '親子裝']

// Measure how many keyword buttons fit within the search bar width
const keywordRowRef = ref<HTMLElement | null>(null)
const keywordRowWidth = ref(0)
const keywordWidths = ref<number[]>([])
const KEYWORD_GAP = 0 // no gap between buttons

function measureKeywordWidths() {
  const measurer = document.createElement('div')
  measurer.style.cssText = 'position: fixed; visibility: hidden; pointer-events: none; left: -9999px; top: 0; display: flex; align-items: center;'
  document.body.appendChild(measurer)
  keywordWidths.value = hotKeywords.map(kw => {
    const btn = document.createElement('button')
    btn.style.cssText = 'font-family: inherit; font-size: 12px; font-weight: 400; padding: 2px 8px; white-space: nowrap;'
    btn.textContent = kw
    measurer.appendChild(btn)
    return Math.ceil(btn.offsetWidth)
  })
  document.body.removeChild(measurer)
}

const visibleHotKeywords = computed(() => {
  if (keywordWidths.value.length === 0 || keywordRowWidth.value === 0) return [] as string[]
  let total = 0
  const visible: string[] = []
  for (let i = 0; i < hotKeywords.length; i++) {
    const w = keywordWidths.value[i] + (i > 0 ? KEYWORD_GAP : 0)
    if (total + w > keywordRowWidth.value) break
    total += w
    visible.push(hotKeywords[i])
  }
  return visible
})

let keywordRowObserver: ResizeObserver | null = null
onMounted(() => {
  measureKeywordWidths()
  if (!keywordRowRef.value) return
  keywordRowWidth.value = keywordRowRef.value.clientWidth
  keywordRowObserver = new ResizeObserver(entries => {
    for (const entry of entries) keywordRowWidth.value = entry.contentRect.width
  })
  keywordRowObserver.observe(keywordRowRef.value)
})
onBeforeUnmount(() => keywordRowObserver?.disconnect())

function runSearch(kw: string) {
  const q = kw.trim()
  if (!q) return
  keyword.value = q
  mobileSearchOpen.value = false
  router.push({ path: '/search', query: { q } })
}
function pickKeyword(kw: string) {
  runSearch(kw)
}
</script>

<template>
  <header class="bg-white border-b border-[#e5e5e5] sticky top-0 z-50 @4xl:h-[89px]">
    <div class="max-w-[1280px] mx-auto px-4 py-3 @4xl:py-[4px] @4xl:h-full @4xl:flex @4xl:flex-col @4xl:justify-center">
      <div class="flex items-center justify-between gap-3">

        <!-- Logo -->
        <button class="flex items-center gap-2 shrink-0" @click="router.push('/shop')">
          <div class="w-9 h-9 @4xl:w-10 @4xl:h-10 rounded-lg flex items-center justify-center" style="background: var(--primary-bg)">
            <span class="text-white font-bold text-sm">X</span>
          </div>
          <span class="font-bold text-base @4xl:text-lg leading-tight hidden @sm:block" style="color: var(--primary)">xSmartLive</span>
        </button>

        <!-- Search bar — PC only -->
        <div class="hidden @4xl:flex flex-col gap-1 flex-1 max-w-[512px] relative">
          <div class="flex h-[42px]">
            <IconField class="flex-1">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="keyword"
                placeholder="快速搜尋您想找的商品"
                class="w-full h-full rounded-r-none"
                @keyup.enter="runSearch(keyword)"
              />
            </IconField>
            <Button label="搜尋" class="rounded-l-none" @click="runSearch(keyword)" />
          </div>

          <!-- Hot search keywords — PC only, only those that fully fit -->
          <div class="hidden @4xl:flex items-center min-w-0 w-full">
            <span class="shrink-0 mr-1 text-xs font-medium text-[#94a3b8] whitespace-nowrap">熱門關鍵字：</span>
            <div
              ref="keywordRowRef"
              class="flex items-center flex-nowrap min-w-0 flex-1 overflow-hidden"
            >
              <a
                v-for="kw in visibleHotKeywords"
                :key="kw"
                class="text-xs text-[#64748b] px-2 py-0.5 hover:text-[color:var(--primary)] hover:underline transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                @click="runSearch(kw)"
              >
                {{ kw }}
              </a>
            </div>
          </div>

        </div>

        <!-- Right icons -->
        <div class="flex items-center gap-1 @4xl:gap-3">
          <!-- Search icon on mobile/tablet — toggles collapsible search -->
          <button
            class="@4xl:hidden flex items-center justify-center w-11 h-11 @4xl:w-9 @4xl:h-9 rounded-lg transition-colors"
            :class="mobileSearchOpen ? 'bg-gray-100 text-[color:var(--primary)]' : 'hover:bg-gray-100 text-[#334155]'"
            data-msearch
            @click="toggleMobileSearch"
          >
            <i :class="['pi text-base', mobileSearchOpen ? 'pi-times' : 'pi-search']" />
          </button>

          <!-- Cart -->
          <button
            class="flex items-center gap-1.5 px-2 @4xl:px-3 min-h-11 @4xl:min-h-0 py-2 rounded-md hover:bg-gray-100 text-[#334155] text-sm font-medium"
            @click="router.push('/cart')"
          >
            <OverlayBadge
              v-if="cart.totalCount > 0"
              :value="cart.totalCount > 99 ? '99+' : String(cart.totalCount)"
              class="cart-badge inline-flex"
            >
              <i class="pi pi-shopping-cart text-base @4xl:text-sm" />
            </OverlayBadge>
            <i v-else class="pi pi-shopping-cart text-base @4xl:text-sm" />
            <span class="hidden @4xl:inline">購物車</span>
          </button>

          <!-- Language — PC only -->
          <div class="hidden @4xl:block relative" data-lang-menu>
            <button
              class="flex items-center gap-1.5 px-3 py-2 rounded-[6px] hover:bg-gray-100 text-[#334155] text-sm font-medium"
              @click="toggleLangMenu"
            >
              <i class="pi pi-globe text-sm" />
              {{ prefs.language.label }}
              <i class="pi pi-chevron-down text-xs" />
            </button>
            <Transition name="menu-fade">
              <div
                v-if="langMenuOpen"
                class="absolute right-0 top-full mt-2 w-[150px] bg-white rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#e2e8f0] py-2 z-50"
                @click.stop
              >
                <button
                  v-for="l in prefs.languages"
                  :key="l.code"
                  class="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left text-sm"
                  :style="l.code === prefs.language.code ? 'color: var(--primary); font-weight: 500' : 'color: #334155'"
                  @click="pickLanguage(l)"
                >
                  {{ l.label }}
                  <i v-if="l.code === prefs.language.code" class="pi pi-check text-xs" />
                </button>
              </div>
            </Transition>
          </div>

          <!-- Login / Register OR user menu — tablet+ -->
          <div v-if="!auth.isLoggedIn" class="hidden @4xl:flex items-center">
            <Button label="登入" severity="secondary" text @click="router.push('/login')" />
            <Button label="註冊" severity="secondary" text @click="router.push('/register')" />
          </div>
          <div v-else class="hidden @4xl:flex items-center relative" data-user-menu>
            <button
              class="flex items-center gap-2 px-3 py-2 rounded-[6px] hover:bg-gray-100 transition-colors"
              @click="toggleUserMenu"
            >
              <span class="w-7 h-7 rounded-full bg-[#e2e8f0] text-[#475569] flex items-center justify-center text-sm font-medium">
                {{ auth.avatarLetter }}
              </span>
              <span class="text-sm font-medium text-[#334155]">{{ auth.displayName }}</span>
              <i class="pi pi-chevron-down text-[10px] text-[#334155]" />
            </button>

            <!-- Dropdown menu -->
            <Transition name="menu-fade">
              <div
                v-if="userMenuOpen"
                class="absolute right-0 top-full mt-2 w-[260px] bg-white rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#e2e8f0] p-[3.5px] z-50"
                @click.stop
              >
                <button
                  class="w-full flex items-center h-[50px] px-3 border-b border-[#e2e8f0] hover:bg-gray-50 transition-colors text-left"
                  @click="userMenuOpen = false; router.push('/member')"
                >
                  <span class="flex-1 flex items-center gap-2 pl-[14px]">
                    <i class="pi pi-user text-sm text-[#334155]" />
                    <span class="font-medium text-[16px] text-[#334155]">會員中心</span>
                  </span>
                </button>
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 border-b border-[#e2e8f0] hover:bg-gray-50 transition-colors text-left"
                  @click="openCurrencyDialog"
                >
                  <span class="flex-1 flex flex-col gap-1 pl-[14px]">
                    <span class="font-medium text-[16px] leading-none text-[#334155]">貨幣</span>
                    <span class="text-[16px] leading-none text-[#334155]">{{ prefs.currency.symbol }} - <span style="color: var(--primary)">{{ prefs.currency.code }}</span> - {{ prefs.currency.label }}</span>
                  </span>
                  <i class="pi pi-cog text-sm text-[#334155]" />
                </button>
                <button
                  class="w-full flex items-center h-[50px] px-3 border-b border-[#e2e8f0] hover:bg-gray-50 transition-colors text-left"
                  @click="goMemberTab('points')"
                >
                  <span class="flex-1 flex items-center justify-between pl-[14px]">
                    <span class="flex items-center gap-1">
                      <img :src="walletIcon" alt="" class="w-[26px] h-[26px] shrink-0" />
                      <span class="font-medium text-[16px] text-[#334155]">紅利點數</span>
                    </span>
                    <span class="font-medium text-[14px]" style="color: var(--primary)">{{ auth.rewardPoints.toFixed(2) }}</span>
                  </span>
                </button>
                <button
                  class="w-full flex items-center h-[50px] px-3 border-b border-[#e2e8f0] hover:bg-gray-50 transition-colors text-left"
                  @click="goMemberTab('coupons')"
                >
                  <span class="flex-1 flex items-center justify-between pl-[14px]">
                    <span class="flex items-center gap-2">
                      <img :src="couponIcon" alt="" class="w-[26px] h-[26px] shrink-0" />
                      <span class="font-medium text-[16px] text-[#334155]">優惠券</span>
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="font-medium text-[14px]" style="color: var(--primary)">{{ auth.couponCount }}</span>
                      <span class="text-[16px] text-[#334155]">/張</span>
                    </span>
                  </span>
                </button>
                <button
                  class="w-full flex items-center h-[50px] px-3 hover:bg-gray-50 transition-colors text-left"
                  @click="onLogout"
                >
                  <span class="flex-1 flex items-center gap-2 pl-[14px]">
                    <i class="pi pi-sign-out text-sm text-[#334155]" />
                    <span class="font-medium text-[16px] text-[#334155]">登出</span>
                  </span>
                </button>
              </div>
            </Transition>
          </div>

          <!-- User icon — mobile + tablet -->
          <div class="@4xl:hidden relative" data-user-menu>
            <button
              class="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-gray-100 text-[#334155]"
              @click="toggleUserMenu"
            >
              <i class="pi pi-user text-base" />
            </button>

            <Transition name="menu-fade">
              <div
                v-if="userMenuOpen && !auth.isLoggedIn"
                class="absolute right-0 top-full mt-2 w-[160px] bg-white rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#e2e8f0] py-2 z-50"
                @click.stop
              >
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  @click="userMenuOpen = false; router.push('/login')"
                >
                  <i class="pi pi-sign-in text-[#334155]" />
                  <span class="text-sm text-[#334155]">登入</span>
                </button>
                <div class="border-t border-[#e2e8f0] my-1" />
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  @click="userMenuOpen = false; router.push('/register')"
                >
                  <i class="pi pi-user-plus text-[#334155]" />
                  <span class="text-sm text-[#334155]">註冊</span>
                </button>
              </div>
            </Transition>

            <Transition name="menu-fade">
              <div
                v-if="auth.isLoggedIn && userMenuOpen"
                class="absolute right-0 top-full mt-2 w-[260px] bg-white rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#e2e8f0] p-[3.5px] z-50"
                @click.stop
              >
                <button
                  class="w-full flex items-center h-[50px] px-3 border-b border-[#e2e8f0] hover:bg-gray-50 transition-colors text-left"
                  @click="userMenuOpen = false; router.push('/member')"
                >
                  <span class="flex-1 flex items-center gap-2 pl-[14px]">
                    <i class="pi pi-user text-sm text-[#334155]" />
                    <span class="font-medium text-[16px] text-[#334155]">會員中心</span>
                  </span>
                </button>
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 border-b border-[#e2e8f0] hover:bg-gray-50 transition-colors text-left"
                  @click="openCurrencyDialog"
                >
                  <span class="flex-1 flex flex-col gap-1 pl-[14px]">
                    <span class="font-medium text-[16px] leading-none text-[#334155]">貨幣</span>
                    <span class="text-[16px] leading-none text-[#334155]">{{ prefs.currency.symbol }} - <span style="color: var(--primary)">{{ prefs.currency.code }}</span> - {{ prefs.currency.label }}</span>
                  </span>
                  <i class="pi pi-cog text-sm text-[#334155]" />
                </button>
                <button
                  class="w-full flex items-center h-[50px] px-3 border-b border-[#e2e8f0] hover:bg-gray-50 transition-colors text-left"
                  @click="goMemberTab('points')"
                >
                  <span class="flex-1 flex items-center justify-between pl-[14px]">
                    <span class="flex items-center gap-1">
                      <img :src="walletIcon" alt="" class="w-[26px] h-[26px] shrink-0" />
                      <span class="font-medium text-[16px] text-[#334155]">紅利點數</span>
                    </span>
                    <span class="font-medium text-[14px]" style="color: var(--primary)">{{ auth.rewardPoints.toFixed(2) }}</span>
                  </span>
                </button>
                <button
                  class="w-full flex items-center h-[50px] px-3 border-b border-[#e2e8f0] hover:bg-gray-50 transition-colors text-left"
                  @click="goMemberTab('coupons')"
                >
                  <span class="flex-1 flex items-center justify-between pl-[14px]">
                    <span class="flex items-center gap-2">
                      <img :src="couponIcon" alt="" class="w-[26px] h-[26px] shrink-0" />
                      <span class="font-medium text-[16px] text-[#334155]">優惠券</span>
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="font-medium text-[14px]" style="color: var(--primary)">{{ auth.couponCount }}</span>
                      <span class="text-[16px] text-[#334155]">/張</span>
                    </span>
                  </span>
                </button>
                <button
                  class="w-full flex items-center h-[50px] px-3 hover:bg-gray-50 transition-colors text-left"
                  @click="onLogout"
                >
                  <span class="flex-1 flex items-center gap-2 pl-[14px]">
                    <i class="pi pi-sign-out text-sm text-[#334155]" />
                    <span class="font-medium text-[16px] text-[#334155]">登出</span>
                  </span>
                </button>
              </div>
            </Transition>
          </div>
        </div>

      </div>

      <!-- Mobile + tablet collapsible search — opens via the search icon -->
      <Transition name="msearch">
        <div v-if="mobileSearchOpen" class="@4xl:hidden mt-2 relative" data-msearch>
          <div class="flex h-[38px]">
            <IconField class="flex-1">
              <InputIcon class="pi pi-search" />
              <InputText
                ref="mobileSearchInput"
                v-model="keyword"
                placeholder="搜尋商品"
                class="w-full h-full rounded-r-none"
                @keyup.enter="runSearch(keyword)"
              />
            </IconField>
            <Button label="搜尋" class="rounded-l-none" @click="runSearch(keyword)" />
          </div>

          <!-- Hot search — shown together with the expanded search bar -->
          <div class="mt-3 px-1 flex flex-col gap-[8px]">
            <span class="text-[14px] font-medium text-[#475569]">熱門搜尋</span>
            <div class="flex flex-wrap gap-[8px]">
              <button
                v-for="kw in hotKeywords"
                :key="kw"
                class="border border-[#e2e8f0] rounded-[28px] px-[11.5px] py-[8px] text-[14px] text-[#334155] hover:bg-gray-50 transition-colors whitespace-nowrap"
                @click="pickKeyword(kw)"
              >{{ kw }}</button>
            </div>
          </div>
        </div>
      </Transition>

    </div>

    <!-- 選擇貨幣彈窗 -->
    <Dialog v-model:visible="currencyDialogOpen" modal header="選擇貨幣" :style="{ width: '22rem' }" :draggable="false">
      <div class="flex flex-col gap-1">
        <button
          v-for="c in prefs.currencies"
          :key="c.code"
          class="w-full flex items-center justify-between px-3 py-3 rounded-[6px] transition-colors text-left"
          :class="c.code === prefs.currency.code ? '' : 'hover:bg-gray-50'"
          :style="c.code === prefs.currency.code ? 'background: var(--primary-surface)' : ''"
          @click="pickCurrency(c)"
        >
          <span class="text-sm text-[#334155]">
            {{ c.symbol }} - <span :style="c.code === prefs.currency.code ? 'color: var(--primary)' : ''">{{ c.code }}</span> - {{ c.label }}
          </span>
          <i v-if="c.code === prefs.currency.code" class="pi pi-check" style="color: var(--primary)" />
        </button>
      </div>
    </Dialog>
  </header>
</template>

<style scoped>
/* 購物車數量 badge 縮小 */
.cart-badge :deep(.p-badge) {
  font-size: 0.625rem;
  min-width: 1rem;
  height: 1rem;
  line-height: 1rem;
  padding: 0 0.25rem;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.msearch-enter-active,
.msearch-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.msearch-enter-from,
.msearch-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
