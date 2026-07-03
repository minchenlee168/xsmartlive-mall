<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { usePrefsStore, type Currency, type Language } from '../pinia/prefs';
import { useUiStore } from '../pinia/ui';

/**
 * 極光珊瑚（Aurora）全站 shell：
 * - 頂部珊瑚漸層 header（品牌 + 搜尋 + 語系 / 貨幣 / 分類選單）
 * - 底部固定 5 tab bottom nav（首頁 / 紅利點數 / 優惠券 / 購物車 / 我的）
 * - 內容以 <slot /> 傳入
 */
const router = useRouter();
const route = useRoute();
const prefs = usePrefsStore();
const ui = useUiStore();

const keyword = ref('');
const isLangDialogOpen = ref(false);
const isCurrencyDialogOpen = ref(false);
const isCategoryDialogOpen = ref(false);

const categories = [
  '大童童裝',
  '小童童裝',
  '寶寶包屁',
  '親子裝',
  '生鮮',
  '廠商出清',
];

/** header 中央區塊模式：搜尋 / 會員快捷 / 隱藏 */
const headerMode = computed<'search' | 'member' | 'hidden'>(() => {
  if (route.path === '/cart') return 'hidden';
  if (route.path.startsWith('/member')) {
    const tab = route.query.tab;
    if (tab === 'points' || tab === 'coupons') return 'hidden';
    return 'member';
  }
  return 'search';
});

/** 「我的」頁面 header 快捷 tab 列 */
const memberQuickLinks = [
  { label: '我的訂單', to: '/member?tab=orders', matchTab: 'orders', matchSub: null as string | null },
  { label: '會員資料', to: '/member?tab=account&sub=profile', matchTab: 'account', matchSub: 'profile' },
  { label: '更改綁定帳號', to: '/member?tab=account&sub=binding', matchTab: 'account', matchSub: 'binding' },
  { label: '收件地址', to: '/member?tab=account&sub=address', matchTab: 'account', matchSub: 'address' },
  { label: '更改密碼', to: '/member?tab=account&sub=password', matchTab: 'account', matchSub: 'password' },
];
const activeMemberLink = computed(() => {
  const tab = (route.query.tab as string) || 'orders';
  const sub = (route.query.sub as string) || null;
  return memberQuickLinks.find(
    (l) => l.matchTab === tab && (l.matchSub === null || l.matchSub === sub),
  );
});

const handleSearch = () => {
  const q = keyword.value.trim();
  if (!q) return;
  router.push({ path: '/search', query: { q } });
};

const handlePickLanguage = (l: Language) => {
  prefs.setLanguage(l);
  isLangDialogOpen.value = false;
  ui.toast(`語言已切換為 ${l.label}`);
};
const handlePickCurrency = (c: Currency) => {
  prefs.setCurrency(c);
  isCurrencyDialogOpen.value = false;
  ui.toast(`貨幣已切換為 ${c.label}（${c.code}）`);
};
const handlePickCategory = (tab: string) => {
  isCategoryDialogOpen.value = false;
  router.push(`/category/${encodeURIComponent(tab)}`);
};

interface BottomNavItem {
  label: string;
  icon: string;
  match: (path: string) => boolean;
  to: string;
  badge?: number;
}
const items: BottomNavItem[] = [
  {
    label: '首頁',
    icon: 'pi-home',
    match: (p) => p === '/' || p === '/shop',
    to: '/shop',
  },
  {
    label: '紅利點數',
    icon: 'pi-wallet',
    match: (p) => p.startsWith('/member') && route.query.tab === 'points',
    to: '/member?tab=points',
  },
  {
    label: '優惠券',
    icon: 'pi-ticket',
    match: (p) => p.startsWith('/member') && route.query.tab === 'coupons',
    to: '/member?tab=coupons',
  },
  {
    label: '購物車',
    icon: 'pi-shopping-cart',
    match: (p) => p === '/cart',
    to: '/cart',
    badge: 6,
  },
  {
    label: '我的',
    icon: 'pi-user',
    match: (p) => {
      if (!p.startsWith('/member')) return false;
      const tab = route.query.tab;
      return tab !== 'points' && tab !== 'coupons';
    },
    to: '/member',
  },
];

const activeItem = computed(() => items.find((i) => i.match(route.path)));
const handleNav = (item: BottomNavItem) => router.push(item.to);
</script>

<template>
  <div class="aurora-shell relative mx-auto flex min-h-screen max-w-[520px] flex-col pb-24 @3xl:max-w-4xl @5xl:max-w-6xl">
    <!-- 珊瑚色 Header + Search -->
    <section
      class="shrink-0 rounded-b-[36px] px-5 pt-6 pb-8"
      style="background: linear-gradient(180deg, #f5c9b8 0%, #f0b299 60%, #e79a7a 100%)"
    >
      <div class="mb-4 flex items-center justify-between">
        <button class="shrink-0" @click="router.push('/shop')" aria-label="回首頁">
          <img src="/logo-aurora.png" alt="直播管家" class="h-12 w-auto" />
        </button>
        <div class="flex gap-2">
          <button
            class="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 backdrop-blur transition-transform hover:scale-105"
            :aria-label="`切換語系（目前：${prefs.language.label}）`"
            :title="`切換語系（目前 ${prefs.language.label}）`"
            @click="isLangDialogOpen = true"
          >
            <i class="pi pi-globe text-base" style="color: #6b2d18" />
          </button>
          <button
            class="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 backdrop-blur transition-transform hover:scale-105"
            :aria-label="`切換貨幣（目前：${prefs.currency.code}）`"
            :title="`切換貨幣（目前 ${prefs.currency.code}）`"
            @click="isCurrencyDialogOpen = true"
          >
            <i class="pi pi-dollar text-base" style="color: #6b2d18" />
          </button>
          <button
            class="flex h-11 w-11 items-center justify-center rounded-full bg-white/70 backdrop-blur transition-transform hover:scale-105"
            aria-label="分類選單"
            title="分類選單"
            @click="isCategoryDialogOpen = true"
          >
            <i class="pi pi-bars text-base" style="color: #6b2d18" />
          </button>
        </div>
      </div>

      <!-- 搜尋膠囊：一般頁面顯示 -->
      <form
        v-if="headerMode === 'search'"
        class="flex items-center gap-2 rounded-full bg-white/95 py-1.5 pr-1.5 pl-5 shadow-sm"
        @submit.prevent="handleSearch"
      >
        <i class="pi pi-search" style="color: #b98570" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜尋 商品"
          class="min-w-0 flex-1 border-0 bg-transparent py-2 text-base text-slate-700 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          class="rounded-full px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105"
          style="background: var(--primary)"
        >
          GO
        </button>
      </form>

      <!-- 會員快捷 tab 列：在「我的」頁面顯示 -->
      <div
        v-else-if="headerMode === 'member'"
        class="flex gap-2 overflow-x-auto pb-1"
        style="scrollbar-width: none"
      >
        <button
          v-for="link in memberQuickLinks"
          :key="link.to"
          class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
          :style="
            activeMemberLink === link
              ? {
                  background: 'var(--primary)',
                  color: '#fff',
                }
              : {
                  background: 'rgba(255,255,255,0.7)',
                  color: '#6b2d18',
                }
          "
          @click="router.push(link.to)"
        >
          {{ link.label }}
        </button>
      </div>
    </section>

    <!-- 頁面內容 -->
    <div class="flex-1">
      <slot />
    </div>

    <!-- 底部 Bottom Nav -->
    <nav
      class="sticky bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white px-2 py-2"
      style="padding-bottom: max(8px, env(safe-area-inset-bottom))"
    >
      <button
        v-for="item in items"
        :key="item.label"
        class="relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1"
        :class="activeItem === item ? 'font-bold' : ''"
        :style="
          activeItem === item ? { color: 'var(--primary)' } : { color: '#64748b' }
        "
        @click="handleNav(item)"
      >
        <span class="relative">
          <i :class="`pi ${item.icon} text-lg`" />
          <span
            v-if="item.badge"
            class="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style="background: var(--primary)"
          >
            {{ item.badge }}
          </span>
        </span>
        <span class="text-xs">{{ item.label }}</span>
      </button>
    </nav>

    <!-- 語言切換 Dialog -->
    <Dialog
      v-model:visible="isLangDialogOpen"
      modal
      :draggable="false"
      header="切換語系"
      :style="{ width: '360px' }"
      :breakpoints="{ '768px': '90vw' }"
    >
      <div class="flex flex-col">
        <button
          v-for="l in prefs.languages"
          :key="l.code"
          class="flex min-h-12 items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50"
          @click="handlePickLanguage(l)"
        >
          <span
            class="text-base"
            :style="
              l.code === prefs.language.code
                ? 'color: var(--primary); font-weight: 700'
                : 'color: #334155'
            "
          >
            {{ l.label }}
          </span>
          <i
            v-if="l.code === prefs.language.code"
            class="pi pi-check"
            style="color: var(--primary)"
          />
        </button>
      </div>
    </Dialog>

    <!-- 貨幣切換 Dialog -->
    <Dialog
      v-model:visible="isCurrencyDialogOpen"
      modal
      :draggable="false"
      header="切換貨幣"
      :style="{ width: '360px' }"
      :breakpoints="{ '768px': '90vw' }"
    >
      <div class="flex flex-col">
        <button
          v-for="c in prefs.currencies"
          :key="c.code"
          class="flex min-h-12 items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50"
          @click="handlePickCurrency(c)"
        >
          <span
            class="text-base"
            :style="
              c.code === prefs.currency.code
                ? 'color: var(--primary); font-weight: 700'
                : 'color: #334155'
            "
          >
            {{ c.symbol }} · {{ c.code }} · {{ c.label }}
          </span>
          <i
            v-if="c.code === prefs.currency.code"
            class="pi pi-check"
            style="color: var(--primary)"
          />
        </button>
      </div>
    </Dialog>

    <!-- 分類選單 Dialog -->
    <Dialog
      v-model:visible="isCategoryDialogOpen"
      modal
      :draggable="false"
      header="分類選單"
      :style="{ width: '360px' }"
      :breakpoints="{ '768px': '90vw' }"
    >
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="cat in categories"
          :key="cat"
          class="flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-base font-medium text-slate-700 transition-colors hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
          @click="handlePickCategory(cat)"
        >
          {{ cat }}
        </button>
      </div>
    </Dialog>
  </div>
</template>
