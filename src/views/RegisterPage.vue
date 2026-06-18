<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../pinia/auth';
import { useUiStore } from '../pinia/ui';
import { useCountdown } from '../composables/useCountdown';

type Step = 'form' | 'success';

const COUNTRY_CODES = ['+886', '+852', '+86'];
const RESEND_COOLDOWN_SEC = 60;
const SMS_CODE_LENGTH = 6;
/** 8-20 碼英數字組合，不可含特殊符號或 Emoji。 */
const PASSWORD_RULE = /^[A-Za-z0-9]{8,20}$/;

const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const step = ref<Step>('form');
const countryCode = ref('+886');
const phone = ref('');
const name = ref('');
const smsCode = ref('');
const password = ref('');
const confirm = ref('');
const isAgreed = ref(false);
const isSubmitted = ref(false);

const { remaining: resendCountdown, start: startResendCountdown } =
  useCountdown();

const canSendSms = computed(() => !!phone.value && resendCountdown.value === 0);
const isPasswordInvalid = computed(
  () => !!password.value && !PASSWORD_RULE.test(password.value),
);
const isPasswordMismatch = computed(
  () => !!confirm.value && password.value !== confirm.value,
);
const canSubmit = computed(
  () =>
    !!name.value &&
    !!phone.value &&
    smsCode.value.length === SMS_CODE_LENGTH &&
    !!password.value &&
    !isPasswordInvalid.value &&
    !isPasswordMismatch.value &&
    isAgreed.value,
);

const handleSendSmsCode = () => {
  if (!canSendSms.value) return;
  startResendCountdown(RESEND_COOLDOWN_SEC);
  ui.toast('驗證碼已發送（示意）');
};

const handleSubmit = () => {
  isSubmitted.value = true;
  if (!canSubmit.value) return;
  step.value = 'success';
};

/** 「立即登入」：完成註冊成功 → 自動登入並前往商城。 */
const handleGoToShop = () => {
  auth.login(name.value);
  router.push('/shop');
};
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden"
    style="background: var(--surface-100)"
  >
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
          <div
            class="flex h-10 w-10 items-center justify-center rounded-lg"
            style="background: var(--primary-bg)"
          >
            <span class="text-base font-bold text-white">X</span>
          </div>
          <span
            class="text-xl leading-tight font-bold"
            style="color: var(--primary)"
          >
            <span class="opacity-90">xSmart</span><span>Live</span>
          </span>
        </button>
        <Button
          label="已有帳號？登入"
          severity="secondary"
          text
          @click="router.push('/login')"
        />
      </div>
    </header>

    <main class="relative z-10 flex justify-center px-4 py-12">
      <div
        class="flex w-full max-w-[480px] flex-col gap-5 rounded-2xl bg-white p-8"
        style="box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15)"
      >
        <h2
          v-if="step === 'form'"
          class="text-center text-3xl font-bold"
          style="color: var(--surface-950)"
        >
          註冊帳號
        </h2>

        <!-- 父層統一 form 內 label 字級、顏色（PrimeVue 元件內部不受繼承） -->
        <form
          v-if="step === 'form'"
          class="flex flex-col gap-4 text-sm font-medium"
          style="color: var(--surface-700)"
          @submit.prevent="handleSubmit"
        >
          <!-- 姓名 -->
          <div class="flex flex-col gap-1.5">
            <label>姓名</label>
            <IconField icon-position="right" class="w-full">
              <InputIcon
                ><i class="pi pi-user" style="color: var(--text-muted)"
              /></InputIcon>
              <InputText
                v-model="name"
                placeholder="請輸入您的姓名"
                class="w-full"
              />
            </IconField>
          </div>

          <!-- 國碼 + 電話號碼 -->
          <div class="flex items-end gap-2">
            <div class="flex w-[100px] shrink-0 flex-col gap-1.5">
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

          <!-- 簡訊驗證碼 + 發送驗證碼 -->
          <div class="flex flex-col gap-1.5">
            <label>簡訊驗證碼</label>
            <div class="flex gap-2">
              <InputText
                v-model="smsCode"
                :maxlength="SMS_CODE_LENGTH"
                placeholder="請輸入六位數驗證碼"
                class="min-w-0 flex-1"
              />
              <Button
                :label="
                  resendCountdown > 0 ? `${resendCountdown}s` : '發送驗證碼'
                "
                :disabled="!canSendSms"
                severity="secondary"
                class="!min-h-11 shrink-0 whitespace-nowrap"
                @click="handleSendSmsCode"
              />
            </div>
          </div>

          <!-- 設定密碼 -->
          <div class="flex flex-col gap-1.5">
            <label>設定密碼</label>
            <Password
              v-model="password"
              :feedback="false"
              toggle-mask
              :invalid="isPasswordInvalid"
              placeholder="8-20位英數字組合，不可含特殊符號或 Emoji"
              fluid
              input-class="w-full"
            />
            <p v-if="isPasswordInvalid" class="text-xs text-red-500">
              密碼需為 8-20 位英數字組合，不可包含特殊符號或 Emoji
            </p>
          </div>

          <!-- 確認密碼 -->
          <div class="flex flex-col gap-1.5">
            <label>確認密碼</label>
            <Password
              v-model="confirm"
              :feedback="false"
              toggle-mask
              :invalid="isPasswordMismatch"
              placeholder="再次輸入設定密碼"
              fluid
              input-class="w-full"
            />
            <p v-if="isPasswordMismatch" class="text-xs text-red-500">
              兩次輸入的密碼不一致
            </p>
          </div>

          <!-- 同意條款 + 提醒 -->
          <div class="flex flex-col gap-1">
            <label class="flex cursor-pointer items-start gap-2">
              <Checkbox
                v-model="isAgreed"
                binary
                input-id="reg-agree"
                class="mt-0.5"
              />
              <span class="leading-relaxed font-normal">
                我同意直播管家購物小幫手
                <a
                  class="cursor-pointer underline"
                  style="color: var(--primary)"
                  @click.prevent="router.push('/terms')"
                >
                  服務政策
                </a>
                與
                <a
                  class="cursor-pointer underline"
                  style="color: var(--primary)"
                  @click.prevent="router.push('/privacy')"
                >
                  隱私權政策
                </a>
              </span>
            </label>
            <p v-if="!isAgreed" class="pl-7 text-xs text-red-500">
              為保障您的權益，請先同意服務條款與隱私政策
            </p>
          </div>

          <!-- 完成註冊並登入 -->
          <Button
            type="submit"
            :disabled="!canSubmit"
            label="完成註冊並登入"
            class="mt-1 !min-h-13 w-full"
          />

          <div class="text-center">
            已經有帳號了？
            <Button
              label="立即登入"
              severity="primary"
              text
              class="!font-medium underline underline-offset-4"
              @click="router.push('/login')"
            />
          </div>
        </form>

        <!-- 註冊成功畫面 -->
        <template v-else>
          <div class="flex flex-col gap-2 text-center">
            <h2 class="text-3xl font-bold" style="color: var(--surface-950)">
              註冊成功！
            </h2>
            <p class="text-base" style="color: var(--text-muted)">
              您的帳號已建立完成，現在可以使用新帳號登入直播管家。
            </p>
          </div>
          <Button
            label="立即登入"
            class="!min-h-13 w-full"
            @click="handleGoToShop"
          />
        </template>
      </div>
    </main>
  </div>
</template>
