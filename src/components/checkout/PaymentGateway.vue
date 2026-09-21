<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useOrdersStore } from '../../pinia/orders';
import { useCartStore } from '../../pinia/cart';
import { useUiStore } from '../../pinia/ui';
import { useMoney } from '../../composables/useMoney';

/**
 * 模擬藍新金流付款層（pay-then-clear）：由 orders store 的 activePayment 驅動。
 * - 結帳建單（待付款）後呼叫 startPayment(orderNos, amount) 開啟，此時購物車尚未清空。
 * - 付款成功 → markBatchPaid（訂單 unpaid→to_ship）+ 清掉購物車已勾選商品 → 導成功頁。
 * - 付款未成功（失敗 / 取消 / 直接離開）→ cancelOrders 整批標「已取消」，購物車不動
 *   （本次結帳商品自然留在購物車），導回購物車可重新結帳。
 * - 原型模擬 UI，不接真金流；卡號等欄位純展示、不驗證。
 */

const ordersStore = useOrdersStore();
const cartStore = useCartStore();
const ui = useUiStore();
const router = useRouter();
const { money } = useMoney();

// 模擬處理時間（藍新處理中）
const PROCESSING_MS = 1200;

type Phase = 'form' | 'processing' | 'failed';
const phase = ref<Phase>('form');

// 假卡欄位（純展示，不驗證、不留存）
const cardNo = ref('');
const cardExp = ref('');
const cardCvc = ref('');

const active = computed(() => ordersStore.activePayment);
const isLayerOpen = computed(() => active.value !== null);
const amount = computed(() => active.value?.amount ?? 0);

// 每次開啟付款層都重置回表單、清空欄位
watch(isLayerOpen, (open) => {
  if (open) {
    phase.value = 'form';
    cardNo.value = '';
    cardExp.value = '';
    cardCvc.value = '';
  }
});

const handleConfirmPay = (): void => {
  const batch = active.value;
  if (!batch) return;
  phase.value = 'processing';
  window.setTimeout(() => {
    ordersStore.markBatchPaid(batch.orderNos);
    cartStore.removeCheckedItems();
    phase.value = 'form';
    ui.toast('付款成功');
    if (ordersStore.lastPaymentSummary) {
      router.push('/payment-success');
    } else {
      router.push('/member?tab=orders');
    }
  }, PROCESSING_MS);
};

/** 付款未成功：整批訂單標已取消、購物車不動，導回購物車。 */
const cancelAndReturnToCart = (reason: string): void => {
  const batch = active.value;
  if (!batch) return;
  ordersStore.cancelOrders(batch.orderNos, reason);
  phase.value = 'form';
  ui.toast('付款未完成，商品已放回購物車');
  router.push('/cart');
};

const handleSimulateFail = (): void => {
  const batch = active.value;
  if (!batch) return;
  // 付款失敗即視為已取消（訂單標 cancelled），但先停在失敗畫面讓使用者知道結果
  ordersStore.cancelOrders(batch.orderNos, '付款失敗');
  phase.value = 'failed';
};

const handleBackToCartFromFail = (): void => {
  ordersStore.closePayment();
  phase.value = 'form';
  ui.toast('商品已放回購物車');
  router.push('/cart');
};

const handleCancelPay = (): void => cancelAndReturnToCart('取消付款');
const handleCloseLayer = (): void => cancelAndReturnToCart('付款未完成');
</script>

<template>
  <!-- 模擬藍新金流付款層 -->
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isLayerOpen"
      class="fixed inset-0 z-[10040] flex flex-col bg-slate-100"
    >
      <!-- 標題列（模擬金流服務） -->
      <div
        class="flex items-center justify-between px-4 py-3 text-white"
        style="background: var(--primary-bg)"
      >
        <span class="flex items-center gap-2 text-base font-bold">
          <i class="pi pi-shield" />
          藍新金流
          <span class="rounded bg-white/20 px-1.5 py-0.5 text-xs font-normal">
            模擬付款
          </span>
        </span>
        <button
          class="flex min-h-11 min-w-11 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/20"
          aria-label="關閉"
          :disabled="phase === 'processing'"
          @click="handleCloseLayer"
        >
          <i class="pi pi-times text-lg" />
        </button>
      </div>

      <!-- 內容 -->
      <div
        class="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4"
      >
        <div class="w-full max-w-md">
          <!-- 應付金額 -->
          <div class="mb-4 rounded-xl bg-white p-4 text-center shadow-sm">
            <p class="text-xs text-slate-500">應付金額</p>
            <p class="mt-1 text-3xl font-bold" style="color: var(--primary)">
              {{ money(amount) }}
            </p>
          </div>

          <!-- 表單 -->
          <div v-if="phase === 'form'" class="rounded-xl bg-white p-4 shadow-sm">
            <p
              class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <i class="pi pi-credit-card" style="color: var(--primary)" />
              信用卡付款
            </p>
            <div class="flex flex-col gap-3">
              <div>
                <label class="mb-1 block text-xs text-slate-500">卡號</label>
                <InputText
                  v-model="cardNo"
                  placeholder="**** **** **** ****"
                  class="min-h-11 w-full"
                  inputmode="numeric"
                />
              </div>
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="mb-1 block text-xs text-slate-500">有效期</label>
                  <InputText
                    v-model="cardExp"
                    placeholder="MM/YY"
                    class="min-h-11 w-full"
                  />
                </div>
                <div class="flex-1">
                  <label class="mb-1 block text-xs text-slate-500">安全碼</label>
                  <InputText
                    v-model="cardCvc"
                    placeholder="CVC"
                    class="min-h-11 w-full"
                  />
                </div>
              </div>
            </div>

            <p class="mt-3 text-xs leading-relaxed text-slate-400">
              此為原型模擬畫面，不會真正扣款；欄位可留空。付款未完成時，訂單會取消、商品放回購物車。
            </p>

            <div class="mt-4 flex flex-col gap-2">
              <button
                class="min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style="background: var(--primary)"
                @click="handleConfirmPay"
              >
                確認付款 {{ money(amount) }}
              </button>
              <div class="flex gap-2">
                <button
                  class="min-h-11 flex-1 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  @click="handleSimulateFail"
                >
                  模擬付款失敗
                </button>
                <button
                  class="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  @click="handleCancelPay"
                >
                  取消付款
                </button>
              </div>
            </div>
          </div>

          <!-- 處理中 -->
          <div
            v-else-if="phase === 'processing'"
            class="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-sm"
          >
            <i
              class="pi pi-spin pi-spinner text-3xl"
              style="color: var(--primary)"
            />
            <p class="text-sm font-medium text-slate-700">
              付款處理中，請勿關閉視窗…
            </p>
          </div>

          <!-- 失敗（付款失敗＝訂單已取消） -->
          <div v-else class="rounded-xl bg-white p-6 text-center shadow-sm">
            <i class="pi pi-times-circle text-4xl text-red-500" />
            <p class="mt-3 text-base font-bold text-slate-950">付款失敗</p>
            <p class="mt-1 text-sm leading-relaxed text-slate-500">
              交易未完成，這筆訂單已取消，商品已放回購物車，您可重新結帳。
            </p>
            <div class="mt-5">
              <button
                class="min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style="background: var(--primary)"
                @click="handleBackToCartFromFail"
              >
                返回購物車
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
