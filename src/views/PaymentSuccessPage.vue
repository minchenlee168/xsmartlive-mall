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
 * 完成訂單後的落地路徑：
 * - 直播主未用商城 → 返回購物車頁面
 * - 一般模式 → 返回商城主頁
 */
const homePath = computed(() => (appMode.noShopMode ? '/cart' : '/shop'));
const homeLabel = computed(() =>
  appMode.noShopMode ? '返回購物車' : '返回商城主頁',
);

onMounted(() => {
  if (!summary.value) {
    router.replace(homePath.value);
  }
});

const handleGoHome = () => {
  ordersStore.setLastPaymentSummary(null);
  router.push(homePath.value);
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
        <Button :label="homeLabel" @click="handleGoHome" />
      </div>

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
              <span class="text-base text-slate-700">
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
