<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUiStore } from '../pinia/ui';
import { useCountdown } from '../composables/useCountdown';

type Step = 'phone' | 'verify' | 'reset' | 'success';

const COUNTRY_CODES = ['+886', '+852'];
const RESEND_COOLDOWN_SEC = 60;
const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

const router = useRouter();
const ui = useUiStore();

const step = ref<Step>('phone');
const countryCode = ref('+886');
const phone = ref('');
const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const {
  remaining: resendCountdown,
  start: startResendCountdown,
  reset: resetResendCountdown,
} = useCountdown();

const canSend = computed(() => !!phone.value);
const canVerify = computed(() => code.value.length === OTP_LENGTH);
/** 強密碼：>= 8 碼且同時包含英文字母與數字；兩次輸入需一致。 */
const isStrongPassword = computed(
  () =>
    newPassword.value.length >= MIN_PASSWORD_LENGTH &&
    /[A-Za-z]/.test(newPassword.value) &&
    /\d/.test(newPassword.value),
);
const canReset = computed(
  () => isStrongPassword.value && newPassword.value === confirmPassword.value,
);
const hasPasswordMismatch = computed(
  () => !!confirmPassword.value && confirmPassword.value !== newPassword.value,
);
/** 0912345678 → 0912***678 */
const maskedPhone = computed(() => {
  const value = phone.value;
  if (value.length < 7) return value;
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
});

const handleSendCode = () => {
  if (!canSend.value) return;
  step.value = 'verify';
  code.value = '';
  startResendCountdown(RESEND_COOLDOWN_SEC);
  ui.toast('驗證碼已發送（示意）');
};

const handleResendCode = () => {
  if (resendCountdown.value > 0) return;
  code.value = '';
  startResendCountdown(RESEND_COOLDOWN_SEC);
  ui.toast('已重新發送驗證碼（示意）');
};

const handleVerifyCode = () => {
  if (!canVerify.value) return;
  step.value = 'reset';
  ui.toast('驗證成功，請設定新密碼');
};

const handleBackToPhone = () => {
  step.value = 'phone';
  code.value = '';
  resetResendCountdown();
};

const handleResetPassword = () => {
  if (!canReset.value) return;
  step.value = 'success';
};

/** 「立即登入」按鈕：成功畫面導回登入。 */
const handleGoToLogin = () => {
  router.push('/login');
};
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden"
    style="background: var(--surface-100)"
  >
    <!-- 手機底圖：左側曲線 blob -->
    <img
      src="/auth-bg-mobile.png"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute top-0 right-0 h-full w-auto max-w-full select-none @3xl:hidden"
    />

    <header
      class="relative z-10 border-b border-[var(--border-light)] bg-white"
    >
      <div
        class="mx-auto flex h-14 max-w-7xl items-center justify-between px-8 py-2"
      >
        <button
          class="flex shrink-0 items-center gap-2"
          @click="router.push('/shop')"
        >
          <img
            src="/logo.png"
            alt="xSmartLive"
            class="block h-10 w-auto @4xl:hidden"
          />
          <img
            src="/logo-xl.png"
            alt="xSmartLive"
            class="hidden h-8 w-auto @4xl:block"
          />
        </button>
        <Button
          label="返回登入"
          severity="secondary"
          text
          @click="router.push('/login')"
        />
      </div>
    </header>

    <main class="relative z-10 flex justify-center px-4 py-12">
      <div
        class="flex w-full max-w-[520px] flex-col gap-5 rounded-2xl bg-white p-8"
        style="box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15)"
      >
        <!-- Step 1: 輸入手機號碼 -->
        <template v-if="step === 'phone'">
          <div class="flex flex-col gap-2 text-center">
            <h2 class="text-3xl font-bold" style="color: var(--surface-950)">
              忘記密碼
            </h2>
            <p class="text-base" style="color: var(--text-muted)">
              請輸入您註冊時使用的手機號碼，我們將為您發送驗證碼。
            </p>
          </div>

          <div
            class="flex gap-3 text-sm font-medium"
            style="color: var(--surface-700)"
          >
            <div class="flex w-[120px] shrink-0 flex-col gap-1.5">
              <label>國碼</label>
              <Select
                v-model="countryCode"
                :options="COUNTRY_CODES"
                class="w-full"
              />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <label>電話號碼</label>
              <IconField icon-position="right" class="w-full">
                <InputIcon
                  ><i class="pi pi-phone" style="color: var(--text-muted)"
                /></InputIcon>
                <InputText
                  v-model="phone"
                  type="tel"
                  placeholder="請輸入您的電話號碼"
                  class="w-full"
                />
              </IconField>
            </div>
          </div>

          <Button
            label="發送驗證碼"
            :disabled="!canSend"
            class="!min-h-13 w-full"
            @click="handleSendCode"
          />

          <div class="text-center">
            <Button
              label="返回登入"
              severity="primary"
              text
              class="!font-medium underline underline-offset-4"
              @click="router.push('/login')"
            />
          </div>
        </template>

        <!-- Step 2: 驗證身份（OTP） -->
        <template v-else-if="step === 'verify'">
          <div class="flex flex-col gap-2 text-center">
            <h2 class="text-3xl font-bold" style="color: var(--surface-950)">
              驗證身份
            </h2>
            <p class="text-base" style="color: var(--text-muted)">
              驗證碼已發送至 {{ maskedPhone }}
            </p>
          </div>

          <div class="flex justify-center">
            <InputOtp
              v-model="code"
              :length="OTP_LENGTH"
              :pt="{ input: { class: '!w-12 !h-14 !text-xl !font-bold' } }"
            />
          </div>

          <div class="text-center text-sm" style="color: var(--text-muted)">
            沒有收到驗證碼？
            <Button
              :label="`重新獲取${resendCountdown > 0 ? ` (${resendCountdown}s)` : ''}`"
              :disabled="resendCountdown > 0"
              severity="primary"
              text
              class="!font-medium underline underline-offset-4"
              @click="handleResendCode"
            />
          </div>

          <Button
            label="確認驗證"
            :disabled="!canVerify"
            class="!min-h-13 w-full"
            @click="handleVerifyCode"
          />

          <div class="text-center">
            <Button
              label="修改電話號碼"
              severity="secondary"
              text
              class="!font-medium underline underline-offset-4"
              @click="handleBackToPhone"
            />
          </div>
        </template>

        <!-- Step 3: 設定新密碼 -->
        <template v-else-if="step === 'reset'">
          <div class="flex flex-col gap-2 text-center">
            <h2 class="text-3xl font-bold" style="color: var(--surface-950)">
              設定新密碼
            </h2>
            <p class="text-base" style="color: var(--text-muted)">
              為了您的帳戶安全，請設置一個包含英文與數字的強密碼。
            </p>
          </div>

          <div
            class="flex flex-col gap-4 text-sm font-medium"
            style="color: var(--surface-700)"
          >
            <div class="flex flex-col gap-1.5">
              <label>新密碼</label>
              <Password
                v-model="newPassword"
                :feedback="false"
                toggle-mask
                placeholder="請輸入新密碼"
                fluid
                input-class="w-full"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label>確認新密碼</label>
              <Password
                v-model="confirmPassword"
                :feedback="false"
                toggle-mask
                placeholder="請再次輸入新密碼"
                fluid
                input-class="w-full"
              />
              <p v-if="hasPasswordMismatch" class="text-xs text-red-500">
                兩次輸入的密碼不一致
              </p>
            </div>
          </div>

          <Button
            label="確認儲存"
            :disabled="!canReset"
            class="!min-h-13 w-full"
            @click="handleResetPassword"
          />
        </template>

        <!-- Step 4: 密碼重設成功 -->
        <template v-else>
          <div class="flex flex-col gap-2 text-center">
            <h2 class="text-3xl font-bold" style="color: var(--surface-950)">
              密碼重設成功！
            </h2>
            <p class="text-base" style="color: var(--text-muted)">
              您的密碼已更新，現在您可以使用新密碼登入帳戶。
            </p>
          </div>
          <Button
            label="立即登入"
            class="!min-h-13 w-full"
            @click="handleGoToLogin"
          />
        </template>
      </div>
    </main>
  </div>
</template>
