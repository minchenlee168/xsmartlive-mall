<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../pinia/auth';
import { useUiStore } from '../pinia/ui';
import { useThemeStore } from '../pinia/theme';
import { useCountdown } from '../composables/useCountdown';

type Step = 'form' | 'password' | 'success';

const COUNTRY_CODES = ['+886', '+852', '+86'];
const RESEND_COOLDOWN_SEC = 60;
const SMS_CODE_LENGTH = 6;
/** 8-20 碼英數字組合，不可含特殊符號或 Emoji。 */
const PASSWORD_RULE = /^[A-Za-z0-9]{8,20}$/;

const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();
const themeStore = useThemeStore();

const isAuroraTheme = computed(() => themeStore.current.id === 'aurora');
/** Aurora 外觀用不同底圖；用 BASE_URL 才能對到 Vite base */
const authBgSrc = computed(() =>
  isAuroraTheme.value
    ? `${import.meta.env.BASE_URL}auth-bg-aurora.png`
    : `${import.meta.env.BASE_URL}auth-bg-mobile.png`,
);

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
const canProceedToPassword = computed(
  () =>
    !!name.value &&
    !!phone.value &&
    smsCode.value.length === SMS_CODE_LENGTH &&
    isAgreed.value,
);
const canSubmit = computed(
  () =>
    !!password.value &&
    !isPasswordInvalid.value &&
    !!confirm.value &&
    !isPasswordMismatch.value,
);

const handleSendSmsCode = () => {
  if (!canSendSms.value) return;
  startResendCountdown(RESEND_COOLDOWN_SEC);
  ui.toast('驗證碼已發送（示意）');
};

const handleNext = () => {
  if (!canProceedToPassword.value) return;
  step.value = 'password';
  isSubmitted.value = false;
};

const handleBack = () => {
  step.value = 'form';
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
    <!-- 手機底圖：Aurora / 其他外觀各自的曲線 blob -->
    <img
      :src="authBgSrc"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute top-0 right-0 h-full w-auto max-w-full select-none @3xl:hidden"
    />

    <!-- PC 徑向漸層 blob：Aurora 珊瑚色調、其他紫藍 -->
    <div
      class="hidden @3xl:block"
      :class="isAuroraTheme ? 'login-bg-aurora' : 'login-bg'"
      aria-hidden="true"
    ></div>

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
        <h2
          v-else-if="step === 'password'"
          class="text-center text-3xl font-bold"
          style="color: var(--surface-950)"
        >
          設定密碼
        </h2>

        <!-- 父層統一 form 內 label 字級、顏色（PrimeVue 元件內部不受繼承） -->
        <form
          v-if="step === 'form'"
          class="flex flex-col gap-4 text-sm font-medium"
          style="color: var(--surface-700)"
          @submit.prevent="handleNext"
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
            <div class="flex w-[120px] shrink-0 flex-col gap-1.5">
              <label>國碼</label>
              <Select
                v-model="countryCode"
                :options="COUNTRY_CODES"
                class="w-full"
                :pt="{ overlay: { style: 'min-width: 140px' } }"
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

          <!-- 簡訊驗證碼 + 獲得驗證碼 -->
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
                  resendCountdown > 0 ? `${resendCountdown}s` : '獲得驗證碼'
                "
                :disabled="!canSendSms"
                :severity="canSendSms ? 'primary' : 'secondary'"
                class="!min-h-11 shrink-0 whitespace-nowrap"
                @click="handleSendSmsCode"
              />
            </div>
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

          <!-- 下一步 -->
          <Button
            type="submit"
            :disabled="!canProceedToPassword"
            label="下一步"
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

        <!-- 第二步：設定密碼 -->
        <form
          v-else-if="step === 'password'"
          class="flex flex-col gap-4 text-sm font-medium"
          style="color: var(--surface-700)"
          @submit.prevent="handleSubmit"
        >
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

          <!-- 完成註冊並登入 -->
          <div class="mt-1 flex gap-2">
            <Button
              type="button"
              label="上一步"
              severity="secondary"
              outlined
              class="!min-h-13 shrink-0"
              @click="handleBack"
            />
            <Button
              type="submit"
              :disabled="!canSubmit"
              label="完成註冊並登入"
              class="!min-h-13 flex-1"
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

<style scoped>
.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      circle at 30% 35%,
      rgba(112, 8, 231, 0.55) 0%,
      rgba(112, 8, 231, 0) 38%
    ),
    radial-gradient(
      circle at 65% 70%,
      rgba(96, 165, 250, 0.45) 0%,
      rgba(96, 165, 250, 0) 40%
    );
  filter: blur(10px);
}
.login-bg-aurora {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      circle at 30% 35%,
      rgba(224, 120, 86, 0.5) 0%,
      rgba(224, 120, 86, 0) 40%
    ),
    radial-gradient(
      circle at 70% 65%,
      rgba(108, 212, 208, 0.45) 0%,
      rgba(108, 212, 208, 0) 42%
    );
  filter: blur(10px);
}
</style>
