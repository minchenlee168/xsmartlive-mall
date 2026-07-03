<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../pinia/auth';
import { useCartStore } from '../pinia/cart';
import { useUiStore } from '../pinia/ui';
import { usePrefsStore, type Currency, type Language } from '../pinia/prefs';
import { useThemeStore } from '../pinia/theme';

const themeStore = useThemeStore();
const isAurora = computed(() => themeStore.current.id === 'aurora');
import walletIcon from '../assets/wallet.svg';
import couponIcon from '../assets/coupon.svg';

const keyword = ref('');
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const ui = useUiStore();
const prefs = usePrefsStore();

const isUserMenuOpen = ref(false);
const isLangMenuOpen = ref(false);
const isCurrencyDialogVisible = ref(false);
const isMobileSearchOpen = ref(false);
const mobileSearchInput = ref<{ $el?: HTMLElement } | null>(null);

const handleGoMember = () => {
  isUserMenuOpen.value = false;
  router.push('/member');
};

/** 從下拉選單跳到會員中心特定分頁（紅利點數 / 優惠券）。 */
const handleGoMemberTab = (
  tab: 'points' | 'coupons' | 'orders' | 'account',
) => {
  isUserMenuOpen.value = false;
  router.push({ path: '/member', query: { tab } });
};

const handleToggleLangMenu = () => {
  isLangMenuOpen.value = !isLangMenuOpen.value;
};
const handlePickLanguage = (l: Language) => {
  prefs.setLanguage(l);
  isLangMenuOpen.value = false;
  ui.toast(`語言已切換為 ${l.label}`);
};

const handleOpenCurrencyDialog = () => {
  isUserMenuOpen.value = false;
  isCurrencyDialogVisible.value = true;
};
const handlePickCurrency = (c: Currency) => {
  prefs.setCurrency(c);
  isCurrencyDialogVisible.value = false;
  ui.toast(`貨幣已切換為 ${c.label}（${c.code}）`);
};

const handleToggleMobileSearch = async () => {
  isMobileSearchOpen.value = !isMobileSearchOpen.value;
  if (isMobileSearchOpen.value) {
    await nextTick();
    mobileSearchInput.value?.$el?.focus();
  }
};

const handleToggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
};
const handleLogout = () => {
  auth.logout();
  isUserMenuOpen.value = false;
  router.push('/shop');
};
const handleDocClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('[data-user-menu]')) isUserMenuOpen.value = false;
  if (!target.closest('[data-lang-menu]')) isLangMenuOpen.value = false;
  if (!target.closest('[data-msearch]')) isMobileSearchOpen.value = false;
};
document.addEventListener('click', handleDocClick);
onBeforeUnmount(() => document.removeEventListener('click', handleDocClick));

// Hot search keywords — shown below search bar (PC) and in collapsible search (mobile/tablet)
const hotKeywords = [
  '童裝男生',
  '男生女生童裝',
  '女童外套',
  '皮衣外套女童',
  '大童童裝',
  '女童運動套裝',
  '寶寶包屁衣',
  '親子裝',
];

// Measure how many keyword buttons fit within the search bar width
const keywordRowRef = ref<HTMLElement | null>(null);
const keywordRowWidth = ref(0);
const keywordWidths = ref<number[]>([]);
const KEYWORD_GAP = 0; // no gap between buttons

const measureKeywordWidths = () => {
  const measurer = document.createElement('div');
  measurer.style.cssText =
    'position: fixed; visibility: hidden; pointer-events: none; left: -9999px; top: 0; display: flex; align-items: center;';
  document.body.appendChild(measurer);
  keywordWidths.value = hotKeywords.map((kw) => {
    const btn = document.createElement('button');
    btn.style.cssText =
      'font-family: inherit; font-size: 12px; font-weight: 400; padding: 2px 8px; white-space: nowrap;';
    btn.textContent = kw;
    measurer.appendChild(btn);
    return Math.ceil(btn.offsetWidth);
  });
  document.body.removeChild(measurer);
};

const visibleHotKeywords = computed(() => {
  if (keywordWidths.value.length === 0 || keywordRowWidth.value === 0)
    return [] as string[];
  let total = 0;
  const visible: string[] = [];
  for (let i = 0; i < hotKeywords.length; i++) {
    const w = keywordWidths.value[i] + (i > 0 ? KEYWORD_GAP : 0);
    if (total + w > keywordRowWidth.value) break;
    total += w;
    visible.push(hotKeywords[i]);
  }
  return visible;
});

let keywordRowObserver: ResizeObserver | null = null;
onMounted(() => {
  measureKeywordWidths();
  if (!keywordRowRef.value) return;
  keywordRowWidth.value = keywordRowRef.value.clientWidth;
  keywordRowObserver = new ResizeObserver((entries) => {
    for (const entry of entries)
      keywordRowWidth.value = entry.contentRect.width;
  });
  keywordRowObserver.observe(keywordRowRef.value);
});
onBeforeUnmount(() => keywordRowObserver?.disconnect());

const handleRunSearch = (kw: string) => {
  const q = kw.trim();
  if (!q) return;
  keyword.value = q;
  isMobileSearchOpen.value = false;
  router.push({ path: '/search', query: { q } });
};
const handlePickKeyword = (kw: string) => {
  handleRunSearch(kw);
};
</script>

<template>
  <header
    v-if="!isAurora"
    class="sticky top-0 z-50 border-b border-slate-200 bg-white @4xl:h-[89px]"
  >
    <div
      class="mx-auto max-w-7xl px-4 py-3 @4xl:flex @4xl:h-full @4xl:flex-col @4xl:justify-center @4xl:py-[4px]"
    >
      <div class="flex items-center justify-between gap-3">
        <!-- Logo：手機顯示 X 圖示、桌機顯示完整 logo -->
        <button
          class="flex shrink-0 items-center"
          aria-label="xSmartLive"
          @click="router.push('/shop')"
        >
          <img
            src="/logo.png"
            alt="xSmartLive"
            class="block h-9 w-auto @4xl:hidden"
          />
          <img
            src="/logo-xl.png"
            alt="xSmartLive"
            class="hidden h-8 w-auto @4xl:block"
          />
        </button>

        <!-- Search bar — PC only -->
        <div
          class="relative hidden max-w-[512px] flex-1 flex-col gap-1 @4xl:flex"
        >
          <div class="flex items-stretch">
            <IconField class="flex-1">
              <InputIcon class="pi pi-search" />
              <InputText
                v-model="keyword"
                placeholder="快速搜尋您想找的商品"
                class="h-full w-full rounded-r-none"
                @keyup.enter="handleRunSearch(keyword)"
              />
            </IconField>
            <Button
              label="搜尋"
              class="!min-h-11 rounded-l-none"
              @click="handleRunSearch(keyword)"
            />
          </div>

          <!-- Hot search keywords — PC only, only those that fully fit -->
          <div class="hidden w-full min-w-0 items-center @4xl:flex">
            <span
              class="mr-1 shrink-0 text-xs font-medium whitespace-nowrap text-slate-400"
              >熱門關鍵字：</span
            >
            <div
              ref="keywordRowRef"
              class="flex min-w-0 flex-1 flex-nowrap items-center overflow-hidden"
            >
              <a
                v-for="kw in visibleHotKeywords"
                :key="kw"
                class="shrink-0 cursor-pointer px-2 py-0.5 text-xs whitespace-nowrap text-slate-500 transition-colors hover:text-[color:var(--primary)] hover:underline"
                @click="handleRunSearch(kw)"
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
            class="flex h-11 w-11 items-center justify-center rounded-lg transition-colors @4xl:hidden @4xl:h-9 @4xl:w-9"
            :class="
              isMobileSearchOpen
                ? 'bg-gray-100 text-[color:var(--primary)]'
                : 'text-slate-700 hover:bg-gray-100'
            "
            data-msearch
            @click="handleToggleMobileSearch"
          >
            <i
              :class="[
                'pi text-base',
                isMobileSearchOpen ? 'pi-times' : 'pi-search',
              ]"
            />
          </button>

          <!-- Language — 地球 icon 直接點開語系選單，不放下拉箭頭 -->
          <div class="relative" data-lang-menu>
            <button
              class="flex min-h-11 items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 @4xl:min-h-0 @4xl:px-3"
              :aria-label="`切換語系，目前：${prefs.language.label}`"
              @click="handleToggleLangMenu"
            >
              <i class="fa-light fa-globe text-xl @4xl:text-lg" />
              <span class="hidden @4xl:inline">{{ prefs.language.label }}</span>
            </button>
            <Transition name="menu-fade">
              <div
                v-if="isLangMenuOpen"
                class="absolute top-full right-0 z-50 mt-2 w-[150px] rounded-lg border border-slate-200 bg-white py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                @click.stop
              >
                <button
                  v-for="l in prefs.languages"
                  :key="l.code"
                  class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
                  :class="
                    l.code === prefs.language.code
                      ? 'font-medium'
                      : 'text-slate-700'
                  "
                  :style="
                    l.code === prefs.language.code
                      ? 'color: var(--primary)'
                      : ''
                  "
                  @click="handlePickLanguage(l)"
                >
                  {{ l.label }}
                  <i
                    v-if="l.code === prefs.language.code"
                    class="pi pi-check text-xs"
                  />
                </button>
              </div>
            </Transition>
          </div>

          <!-- Cart -->
          <button
            class="flex min-h-11 items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 @4xl:min-h-0 @4xl:px-3"
            @click="router.push('/cart')"
          >
            <OverlayBadge
              v-if="cart.totalCount > 0"
              :value="cart.totalCount > 99 ? '99+' : String(cart.totalCount)"
              class="cart-badge inline-flex"
            >
              <i class="fa-light fa-cart-circle-plus text-xl @4xl:text-lg" />
            </OverlayBadge>
            <i
              v-else
              class="fa-light fa-cart-circle-plus text-xl @4xl:text-lg"
            />
            <span class="hidden @4xl:inline">購物車</span>
          </button>

          <!-- Login / Register OR user menu — tablet+ -->
          <div v-if="!auth.isLoggedIn" class="hidden items-center @4xl:flex">
            <Button
              label="登入"
              severity="secondary"
              text
              @click="router.push('/login')"
            />
            <Button
              label="註冊"
              severity="secondary"
              text
              @click="router.push('/register')"
            />
          </div>
          <div
            v-else
            class="relative hidden items-center @4xl:flex"
            data-user-menu
          >
            <button
              class="flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-gray-100"
              @click="handleToggleUserMenu"
            >
              <span
                class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600"
              >
                {{ auth.avatarLetter }}
              </span>
              <span class="text-sm font-medium text-slate-700">{{
                auth.displayName
              }}</span>
              <i class="pi pi-chevron-down text-xs text-slate-700" />
            </button>

            <!-- Dropdown menu -->
            <Transition name="menu-fade">
              <div
                v-if="isUserMenuOpen"
                class="absolute top-full right-0 z-50 mt-2 w-[260px] rounded-md border border-slate-200 bg-white p-[3.5px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                @click.stop
              >
                <button
                  class="flex h-[50px] w-full items-center border-b border-slate-200 px-3 text-left transition-colors hover:bg-gray-50"
                  @click="
                    isUserMenuOpen = false;
                    router.push('/member');
                  "
                >
                  <span class="flex flex-1 items-center gap-2 pl-[14px]">
                    <i class="pi pi-user text-sm text-slate-700" />
                    <span class="text-base font-medium text-slate-700"
                      >會員中心</span
                    >
                  </span>
                </button>
                <button
                  class="flex w-full items-center gap-2 border-b border-slate-200 px-3 py-2 text-left transition-colors hover:bg-gray-50"
                  @click="handleOpenCurrencyDialog"
                >
                  <span class="flex flex-1 flex-col gap-1 pl-[14px]">
                    <span
                      class="text-base leading-none font-medium text-slate-700"
                      >貨幣</span
                    >
                    <span class="text-base leading-none text-slate-700"
                      >{{ prefs.currency.symbol }} -
                      <span style="color: var(--primary)">{{
                        prefs.currency.code
                      }}</span>
                      - {{ prefs.currency.label }}</span
                    >
                  </span>
                  <i class="pi pi-cog text-sm text-slate-700" />
                </button>
                <button
                  class="flex h-[50px] w-full items-center border-b border-slate-200 px-3 text-left transition-colors hover:bg-gray-50"
                  @click="handleGoMemberTab('points')"
                >
                  <span
                    class="flex flex-1 items-center justify-between pl-[14px]"
                  >
                    <span class="flex items-center gap-1">
                      <img
                        :src="walletIcon"
                        alt=""
                        class="h-[26px] w-[26px] shrink-0"
                      />
                      <span class="text-base font-medium text-slate-700"
                        >紅利點數</span
                      >
                    </span>
                    <span
                      class="text-sm font-medium"
                      style="color: var(--primary)"
                      >{{ auth.rewardPoints.toFixed(2) }}</span
                    >
                  </span>
                </button>
                <button
                  class="flex h-[50px] w-full items-center border-b border-slate-200 px-3 text-left transition-colors hover:bg-gray-50"
                  @click="handleGoMemberTab('coupons')"
                >
                  <span
                    class="flex flex-1 items-center justify-between pl-[14px]"
                  >
                    <span class="flex items-center gap-2">
                      <img
                        :src="couponIcon"
                        alt=""
                        class="h-[26px] w-[26px] shrink-0"
                      />
                      <span class="text-base font-medium text-slate-700"
                        >優惠券</span
                      >
                    </span>
                    <span class="flex items-center gap-1">
                      <span
                        class="text-sm font-medium"
                        style="color: var(--primary)"
                        >{{ auth.couponCount }}</span
                      >
                      <span class="text-base text-slate-700">/張</span>
                    </span>
                  </span>
                </button>
                <button
                  class="flex h-[50px] w-full items-center px-3 text-left transition-colors hover:bg-gray-50"
                  @click="handleLogout"
                >
                  <span class="flex flex-1 items-center gap-2 pl-[14px]">
                    <i class="pi pi-sign-out text-sm text-slate-700" />
                    <span class="text-base font-medium text-slate-700"
                      >登出</span
                    >
                  </span>
                </button>
              </div>
            </Transition>
          </div>

          <!-- User icon — mobile + tablet -->
          <div class="relative @4xl:hidden" data-user-menu>
            <button
              class="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-gray-100"
              @click="handleToggleUserMenu"
            >
              <i class="pi pi-user text-base" />
            </button>

            <Transition name="menu-fade">
              <div
                v-if="isUserMenuOpen && !auth.isLoggedIn"
                class="absolute top-full right-0 z-50 mt-2 w-[160px] rounded-lg border border-slate-200 bg-white py-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                @click.stop
              >
                <button
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                  @click="
                    isUserMenuOpen = false;
                    router.push('/login');
                  "
                >
                  <i class="pi pi-sign-in text-slate-700" />
                  <span class="text-sm text-slate-700">登入</span>
                </button>
                <div class="my-1 border-t border-slate-200" />
                <button
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                  @click="
                    isUserMenuOpen = false;
                    router.push('/register');
                  "
                >
                  <i class="pi pi-user-plus text-slate-700" />
                  <span class="text-sm text-slate-700">註冊</span>
                </button>
              </div>
            </Transition>

            <Transition name="menu-fade">
              <div
                v-if="auth.isLoggedIn && isUserMenuOpen"
                class="absolute top-full right-0 z-50 mt-2 w-[260px] rounded-md border border-slate-200 bg-white p-[3.5px] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                @click.stop
              >
                <button
                  class="flex h-[50px] w-full items-center border-b border-slate-200 px-3 text-left transition-colors hover:bg-gray-50"
                  @click="
                    isUserMenuOpen = false;
                    router.push('/member');
                  "
                >
                  <span class="flex flex-1 items-center gap-2 pl-[14px]">
                    <i class="pi pi-user text-sm text-slate-700" />
                    <span class="text-base font-medium text-slate-700"
                      >會員中心</span
                    >
                  </span>
                </button>
                <button
                  class="flex w-full items-center gap-2 border-b border-slate-200 px-3 py-2 text-left transition-colors hover:bg-gray-50"
                  @click="handleOpenCurrencyDialog"
                >
                  <span class="flex flex-1 flex-col gap-1 pl-[14px]">
                    <span
                      class="text-base leading-none font-medium text-slate-700"
                      >貨幣</span
                    >
                    <span class="text-base leading-none text-slate-700"
                      >{{ prefs.currency.symbol }} -
                      <span style="color: var(--primary)">{{
                        prefs.currency.code
                      }}</span>
                      - {{ prefs.currency.label }}</span
                    >
                  </span>
                  <i class="pi pi-cog text-sm text-slate-700" />
                </button>
                <button
                  class="flex h-[50px] w-full items-center border-b border-slate-200 px-3 text-left transition-colors hover:bg-gray-50"
                  @click="handleGoMemberTab('points')"
                >
                  <span
                    class="flex flex-1 items-center justify-between pl-[14px]"
                  >
                    <span class="flex items-center gap-1">
                      <img
                        :src="walletIcon"
                        alt=""
                        class="h-[26px] w-[26px] shrink-0"
                      />
                      <span class="text-base font-medium text-slate-700"
                        >紅利點數</span
                      >
                    </span>
                    <span
                      class="text-sm font-medium"
                      style="color: var(--primary)"
                      >{{ auth.rewardPoints.toFixed(2) }}</span
                    >
                  </span>
                </button>
                <button
                  class="flex h-[50px] w-full items-center border-b border-slate-200 px-3 text-left transition-colors hover:bg-gray-50"
                  @click="handleGoMemberTab('coupons')"
                >
                  <span
                    class="flex flex-1 items-center justify-between pl-[14px]"
                  >
                    <span class="flex items-center gap-2">
                      <img
                        :src="couponIcon"
                        alt=""
                        class="h-[26px] w-[26px] shrink-0"
                      />
                      <span class="text-base font-medium text-slate-700"
                        >優惠券</span
                      >
                    </span>
                    <span class="flex items-center gap-1">
                      <span
                        class="text-sm font-medium"
                        style="color: var(--primary)"
                        >{{ auth.couponCount }}</span
                      >
                      <span class="text-base text-slate-700">/張</span>
                    </span>
                  </span>
                </button>
                <button
                  class="flex h-[50px] w-full items-center px-3 text-left transition-colors hover:bg-gray-50"
                  @click="handleLogout"
                >
                  <span class="flex flex-1 items-center gap-2 pl-[14px]">
                    <i class="pi pi-sign-out text-sm text-slate-700" />
                    <span class="text-base font-medium text-slate-700"
                      >登出</span
                    >
                  </span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Mobile + tablet collapsible search — opens via the search icon -->
      <Transition name="msearch">
        <div
          v-if="isMobileSearchOpen"
          class="relative mt-2 @4xl:hidden"
          data-msearch
        >
          <div class="flex items-stretch">
            <IconField class="flex-1">
              <InputIcon class="pi pi-search" />
              <InputText
                ref="mobileSearchInput"
                v-model="keyword"
                placeholder="搜尋商品"
                class="h-full w-full rounded-r-none"
                @keyup.enter="handleRunSearch(keyword)"
              />
            </IconField>
            <Button
              label="搜尋"
              class="!min-h-11 rounded-l-none"
              @click="handleRunSearch(keyword)"
            />
          </div>

          <!-- Hot search — shown together with the expanded search bar -->
          <div class="mt-3 flex flex-col gap-[8px] px-1">
            <span class="text-sm font-medium text-slate-600">熱門搜尋</span>
            <div class="flex flex-wrap gap-[8px]">
              <button
                v-for="kw in hotKeywords"
                :key="kw"
                class="rounded-[28px] border border-slate-200 px-[11.5px] py-[8px] text-sm whitespace-nowrap text-slate-700 transition-colors hover:bg-gray-50"
                @click="handlePickKeyword(kw)"
              >
                {{ kw }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 選擇貨幣彈窗 -->
    <Dialog
      v-model:visible="isCurrencyDialogVisible"
      modal
      header="選擇貨幣"
      :style="{ width: '22rem' }"
      :draggable="false"
    >
      <div class="flex flex-col gap-1">
        <button
          v-for="c in prefs.currencies"
          :key="c.code"
          class="flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition-colors"
          :class="c.code === prefs.currency.code ? '' : 'hover:bg-gray-50'"
          :style="
            c.code === prefs.currency.code
              ? 'background: var(--primary-surface)'
              : ''
          "
          @click="handlePickCurrency(c)"
        >
          <span class="text-sm text-slate-700">
            {{ c.symbol }} -
            <span
              :style="
                c.code === prefs.currency.code ? 'color: var(--primary)' : ''
              "
              >{{ c.code }}</span
            >
            - {{ c.label }}
          </span>
          <i
            v-if="c.code === prefs.currency.code"
            class="pi pi-check"
            style="color: var(--primary)"
          />
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
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.msearch-enter-active,
.msearch-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.msearch-enter-from,
.msearch-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
