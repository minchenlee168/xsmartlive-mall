<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import { useOrdersStore } from '../pinia/orders';
import { useAppModeStore } from '../pinia/appMode';

/**
 * 付款成功頁：讀 orders store 的 lastPaymentSummary。
 * - 多筆訂單編號會依序條列
 * - 「返回商城主頁」按鈕依 appMode 導向 /shop 或 /member
 * - 若使用者直接開這頁但沒有 lastPaymentSummary → 回會員中心
 */

const router = useRouter();
const ordersStore = useOrdersStore();
const appMode = useAppModeStore();

const summary = computed(() => ordersStore.lastPaymentSummary);

/**
 * 期間首購後免運提醒：剛完成的這筆訂單已讓使用者在檔期內有過訂單，
 * 檔期內下一筆即享免運 → 在此落地頁種下回購期待。
 */
const showFreeShippingUnlock = computed(
  () => ordersStore.isFirstPurchaseFreeShippingActive,
);
const freeShippingDaysLeft = computed(
  () => ordersStore.freeShippingCampaignDaysLeft,
);
const freeShippingEndLabel = ordersStore.freeShippingCampaignEndLabel;

/** 本次結帳中、剛解鎖「首購後免運」的賣場（僅限本次下單涉及的台）。 */
const unlockedCartSellers = computed(() => {
  const ids = new Set(summary.value?.sellerIds ?? []);
  return ordersStore.cartLevelUnlockedSellers.filter((s) => ids.has(s.sellerId));
});
/** 購物車級附註文案（帳號級已啟用時，購物車級降為一行）。 */
const cartSellersNote = computed(() => {
  const list = unlockedCartSellers.value;
  if (list.length === 0) return '';
  return list.length === 1
    ? `本次「${list[0].sellerName}」亦符合首購後免運`
    : `本次「${list[0].sellerName}」等 ${list.length} 個賣場亦符合首購後免運`;
});
/** 整個解鎖區是否要顯示（帳號級 或 有購物車級剛解鎖）。 */
const showUnlockSection = computed(
  () => showFreeShippingUnlock.value || unlockedCartSellers.value.length > 0,
);
/** 付款方式為 LINE Pay 時，以 logo 圖取代文字顯示。 */
const LINE_PAY_LOGO = `${import.meta.env.BASE_URL}partners/linepay.png`;
const isLinePay = computed(() => summary.value?.paymentMethod === 'LINE Pay');
/**
 * 完成訂單後的落地路徑：
 * - 直播主未用商城 → 返回購物車頁面
 * - 一般模式 → 返回商城主頁
 */
const homePath = computed(() => (appMode.noShopMode ? '/cart' : '/shop'));

onMounted(() => {
  if (!summary.value) {
    router.replace(homePath.value);
  }
});

const handleGoOrders = () => {
  ordersStore.setLastPaymentSummary(null);
  router.push({ path: '/member', query: { tab: 'orders' } });
};
</script>

<template>
  <div class="flex min-h-screen flex-col" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <main
      v-if="summary"
      class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-[var(--page-pad-x)] py-8 @7xl:px-0"
    >
      <!-- Success header -->
      <div class="flex flex-col items-center gap-3">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-full bg-green-500"
        >
          <i class="pi pi-check text-2xl text-white" />
        </div>
        <h1 class="text-3xl font-bold text-slate-950">付款成功</h1>
        <Button
          label="查看我的訂單"
          outlined
          class="mt-1"
          @click="handleGoOrders"
        />
      </div>

      <!-- 期間首購後免運：解鎖提醒（帳號級為主，購物車級降為附註） -->
      <section
        v-if="showUnlockSection"
        class="shadow-card flex flex-col gap-3 rounded-xl p-4 @3xl:p-5"
        style="
          background: var(--primary-surface);
          border: 1px solid var(--primary);
        "
      >
        <!-- 帳號級（全站）大標 -->
        <div v-if="showFreeShippingUnlock" class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style="background: var(--primary)"
          >
            <i class="pi pi-truck text-lg text-white" />
          </div>
          <div class="flex min-w-0 flex-col gap-1">
            <p class="text-base font-bold" style="color: var(--primary)">
              已解鎖「期間首購後免運」
            </p>
            <p class="text-sm text-slate-700">
              檔期內你的下一筆訂單起，<span class="font-semibold"
                >全站所有賣場</span
              >皆享 <span class="font-semibold">免運費</span>，不限金額。檔期至
              {{ freeShippingEndLabel }}，把握機會回來逛逛！
            </p>
            <p class="text-xs text-slate-500">
              <i class="pi pi-clock mr-1" />剩 {{ freeShippingDaysLeft }} 天
            </p>
            <!-- 購物車級降為一行附註（帳號級已涵蓋全站） -->
            <p v-if="cartSellersNote" class="text-xs text-slate-500">
              <i class="pi pi-truck mr-1" style="color: var(--primary)" />{{
                cartSellersNote
              }}
            </p>
          </div>
        </div>

        <!-- 僅購物車級（無帳號級）：逐台列出賣場 + 各自到期日 -->
        <template v-else>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style="background: var(--primary)"
            >
              <i class="pi pi-truck text-lg text-white" />
            </div>
            <p class="text-base font-bold" style="color: var(--primary)">
              已解鎖「首購後免運」
            </p>
          </div>
          <ul class="flex flex-col gap-2 pl-1">
            <li
              v-for="s in unlockedCartSellers"
              :key="s.sellerId"
              class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-700"
            >
              <span class="font-semibold">{{ s.sellerName }}</span>
              <span>下一筆訂單起免運</span>
              <span class="text-xs text-slate-500"
                >檔期至 {{ s.endLabel }}（剩 {{ s.daysLeft }} 天）</span
              >
            </li>
          </ul>
        </template>
      </section>

      <!-- Order info -->
      <section class="shadow-card rounded-xl bg-white">
        <div class="cart-divider px-6 py-4">
          <span class="font-medium text-slate-700">訂單資訊</span>
        </div>
        <div class="px-6 py-5">
          <div
            class="grid grid-cols-1 gap-x-8 gap-y-5 @3xl:grid-cols-2 @7xl:grid-cols-3"
          >
            <!-- 訂單編號（可能有多筆） -->
            <div class="flex flex-col gap-1">
              <span class="text-sm text-slate-500">訂單編號</span>
              <div class="flex flex-col gap-0.5">
                <span
                  v-for="no in summary.orderNos"
                  :key="no"
                  class="text-lg font-bold"
                  style="color: var(--primary)"
                >
                  {{ no }}
                </span>
              </div>
            </div>

            <!-- 訂購人 -->
            <div class="flex flex-col gap-1">
              <span class="text-sm text-slate-500">訂購人</span>
              <span class="text-base font-medium text-slate-700">
                {{ summary.buyerName }}
              </span>
            </div>

            <!-- 聯絡電話 -->
            <div class="flex flex-col gap-1">
              <span class="text-sm text-slate-500">聯絡電話</span>
              <span class="text-base text-slate-700">
                {{ summary.buyerPhone }}
              </span>
            </div>

            <!-- 付款方式 -->
            <div class="flex flex-col gap-1">
              <span class="text-sm text-slate-500">付款方式</span>
              <img
                v-if="isLinePay"
                :src="LINE_PAY_LOGO"
                alt="LINE Pay"
                class="h-5 w-auto self-start object-contain"
              />
              <span v-else class="text-base text-slate-700">
                {{ summary.paymentMethod }}
              </span>
            </div>

            <!-- 配送地址 -->
            <div class="flex flex-col gap-1 @3xl:col-span-2">
              <span class="text-sm text-slate-500">配送地址</span>
              <span class="text-base text-slate-700">
                {{ summary.deliveryAddress }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.cart-divider {
  border-bottom: 1px solid var(--border-light);
}
</style>
