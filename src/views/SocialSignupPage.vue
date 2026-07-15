<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../pinia/auth';
import { useUiStore } from '../pinia/ui';
import { useCountdown } from '../composables/useCountdown';
import { SOCIAL_BRAND_COLORS } from '../utils/brand-colors';

/**
 * 社群帳號首次登入流程：
 * - step = 'review'  → 顯示由 provider 帶來的 email / phone，同意條款後進入綁定步驟
 * - step = 'verify'  → 安全驗證：填手機 + 簡訊驗證碼，綁定到帳號
 * - step = 'success' → 綁定成功提示，按鈕進入商城
 * query 參數：
 * - provider=facebook|google|line|tiktok（必填）
 * - phone=true 時 demo 預填手機的版本；預設無預填
 */

type Provider = 'facebook' | 'google' | 'line' | 'tiktok';
type Step = 'review' | 'verify' | 'success';

interface ProviderProfile {
  name: string;
  email: string;
  /** 由 provider 帶來或先前已綁定的手機；空字串代表「未提供」。 */
  phone: string;
  /** 此帳號的手機是否已綁定驗證過。原型用來模擬 Google 帳號先前已綁過、可直接登入的情境。 */
  phoneAlreadyVerified: boolean;
  badgeColor: string;
  badgeIcon: string;
  badgeLabel: string;
}

const PRESET_PHONE = '+886 912 345 567';
const COUNTRY_CODES = ['+886', '+852', '+853', '+86'];
const SMS_CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

const PROVIDER_PROFILES: Record<Provider, ProviderProfile> = {
  facebook: {
    name: '王小明',
    email: 'wang012@gmail.com',
    phone: '',
    phoneAlreadyVerified: false,
    badgeColor: SOCIAL_BRAND_COLORS.facebook,
    badgeIcon: 'fa-brands fa-facebook-f',
    badgeLabel: 'Facebook',
  },
  google: {
    name: '王小明',
    email: 'wang012@gmail.com',
    phone: PRESET_PHONE,
    phoneAlreadyVerified: true,
    badgeColor: SOCIAL_BRAND_COLORS.google,
    badgeIcon: 'fa-brands fa-google',
    badgeLabel: 'Google',
  },
  line: {
    name: '王小明',
    email: 'wang012@gmail.com',
    phone: '',
    phoneAlreadyVerified: false,
    badgeColor: SOCIAL_BRAND_COLORS.line,
    badgeIcon: 'fa-brands fa-line',
    badgeLabel: 'LINE',
  },
  tiktok: {
    name: '王小明',
    email: 'wang012@gmail.com',
    phone: '',
    phoneAlreadyVerified: false,
    badgeColor: SOCIAL_BRAND_COLORS.tiktok,
    badgeIcon: 'fa-brands fa-tiktok',
    badgeLabel: 'TikTok',
  },
};

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();

const provider = computed<Provider>(() => {
  const q = (route.query.provider as string)?.toLowerCase();
  return (q as Provider) in PROVIDER_PROFILES ? (q as Provider) : 'facebook';
});
const profile = computed<ProviderProfile>(() => {
  const base = PROVIDER_PROFILES[provider.value];
  // ?phone=true → demo 預填手機版本
  return route.query.phone === 'true' ? { ...base, phone: PRESET_PHONE } : base;
});

const step = ref<Step>('review');

// --- step: review ---
const isAgreed = ref(false);
/**
 * 按主按鈕：不強制驗證手機，直接綁定並登入。
 * 需要驗證的使用者可透過「驗證手機」連結進入 verify step（安全驗證頁）。
 */
const handleConfirmReview = () => {
  handleEnterShop();
};
const handleGoVerify = () => {
  step.value = 'verify';
};

// --- step: verify ---
const verifyCountryCode = ref('+886');
const verifyPhone = ref('');
const verifyCode = ref('');
/** 是否已按過「發送驗證碼」→ 決定要顯示發送按鈕 or 驗證碼輸入區。 */
const hasSentCode = ref(false);
const {
  remaining: resendCountdown,
  start: startResendCountdown,
  reset: resetResendCountdown,
} = useCountdown();
const canSendVerifyCode = computed(
  () => !!verifyPhone.value && resendCountdown.value === 0,
);
const canSubmitVerify = computed(
  () => !!verifyPhone.value && verifyCode.value.length === SMS_CODE_LENGTH,
);
const handleSendVerifyCode = () => {
  if (!canSendVerifyCode.value) return;
  hasSentCode.value = true;
  startResendCountdown(RESEND_COOLDOWN_SEC);
  ui.toast('驗證碼已發送（示意）');
};
const handleSubmitVerify = () => {
  if (!canSubmitVerify.value) return;
  step.value = 'success';
};
const handleBackToReview = () => {
  resetResendCountdown();
  verifyCode.value = '';
  hasSentCode.value = false;
  step.value = 'review';
};

// --- step: success ---
const handleEnterShop = () => {
  auth.login(profile.value.name);
  ui.toast(`已使用 ${profile.value.badgeLabel} 註冊並登入`);
  router.push('/shop');
};

const handleBackToLogin = () => {
  router.push('/login');
};
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden"
    style="background: var(--surface-100)"
  >
    <!-- Decorative background blob (沿用 LoginPage 紫色 blob)；success step 不顯示 -->
    <div v-if="step !== 'success'" class="login-bg" aria-hidden="true"></div>

    <!-- Top bar -->
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
          label="需要幫助"
          icon="pi pi-question-circle"
          icon-pos="right"
          severity="secondary"
          text
          @click="router.push('/help')"
        />
      </div>
    </header>

    <!-- Main content -->
    <main class="relative z-10 px-4 py-12">
      <!-- review / verify：左右排版 -->
      <div
        v-if="step !== 'success'"
        class="mx-auto flex max-w-7xl flex-col items-center justify-center gap-12 @3xl:flex-row @4xl:gap-28"
      >
        <!-- Left: welcome + illustration -->
        <div class="flex shrink-0 flex-col items-center gap-10">
          <h1
            class="text-center text-2xl leading-tight font-bold whitespace-nowrap @3xl:text-3xl @4xl:text-4xl"
            style="color: var(--surface-950)"
          >
            歡迎光臨！<br />直播好康等你來逛
          </h1>
          <img
            src="/login-illustration.png"
            alt="直播購物插圖"
            class="pointer-events-none hidden h-auto max-w-full select-none @3xl:block @3xl:w-[200px] @4xl:w-[476px]"
            draggable="false"
          />
        </div>

        <!-- ===== Step: Review ===== -->
        <div
          v-if="step === 'review'"
          class="flex w-full max-w-[440px] flex-col items-center gap-5 rounded-2xl bg-white p-6"
          style="box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15)"
        >
          <div class="flex flex-col items-center gap-1.5">
            <h2 class="text-3xl font-bold" style="color: var(--surface-950)">
              即將完成註冊
            </h2>
            <p class="text-sm" style="color: var(--text-muted)">
              您已透過以下帳號登入
            </p>
          </div>

          <!-- Profile card with provider badge -->
          <div class="flex flex-col items-center gap-2">
            <div class="relative">
              <div
                class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl font-medium text-slate-600"
              >
                {{ profile.name.charAt(0) }}
              </div>
              <span
                class="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs text-white"
                :style="{ background: profile.badgeColor }"
                :aria-label="profile.badgeLabel"
              >
                <i :class="profile.badgeIcon" />
              </span>
            </div>
            <p class="text-base font-medium text-slate-700">
              {{ profile.name }}
            </p>
          </div>

          <!-- Account info -->
          <div class="flex w-full flex-col gap-3">
            <p class="text-sm font-medium text-slate-700">
              將使用以下資訊建立您的帳號：
            </p>
            <div class="flex items-start gap-3 text-sm text-slate-700">
              <i class="pi pi-envelope mt-0.5 text-slate-400" />
              <div class="flex flex-1 flex-col">
                <span class="text-xs text-slate-500">電子郵件</span>
                <span class="text-slate-700">{{ profile.email }}</span>
              </div>
            </div>
            <div class="flex items-start gap-3 text-sm">
              <i class="pi pi-phone mt-0.5 text-slate-400" />
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="text-xs text-slate-500">電話號碼</span>
                <span v-if="profile.phone" class="text-slate-700">
                  {{ profile.phone }}
                  <!-- 已綁定過：綠字標示；尚未驗證：紅字提示 -->
                  <span
                    v-if="profile.phoneAlreadyVerified"
                    class="ml-1 text-green-600"
                    >(已驗證)</span
                  >
                  <span v-else class="ml-1 text-red-500">(未驗證)</span>
                </span>
                <span v-else class="text-red-500">未提供</span>
              </div>
              <!-- 驗證手機：靠右灰色 outline 按鈕，右緣與主按鈕齊 -->
              <Button
                v-if="!profile.phone"
                label="驗證手機"
                severity="secondary"
                outlined
                size="small"
                class="shrink-0"
                @click="handleGoVerify"
              />
            </div>
          </div>

          <!-- Terms agreement -->
          <div class="flex w-full items-start gap-2">
            <Checkbox
              v-model="isAgreed"
              binary
              input-id="social-agree"
              class="mt-0.5 shrink-0"
            />
            <div class="flex flex-1 flex-col gap-2">
              <p class="text-sm leading-snug text-slate-700">
                我同意直播管家購物小幫手
                <a
                  class="cursor-pointer underline"
                  style="color: var(--primary)"
                  @click="router.push('/terms')"
                >
                  服務政策
                </a>
                與
                <a
                  class="cursor-pointer underline"
                  style="color: var(--primary)"
                  @click="router.push('/privacy')"
                >
                  隱私權政策
                </a>
              </p>
            </div>
          </div>

          <Button
            label="確定綁定並登入"
            class="!min-h-12 w-full"
            :disabled="!isAgreed"
            @click="handleConfirmReview"
          />

          <p class="text-sm" style="color: var(--text-muted)">
            使用其他方式？
            <a
              class="ml-1 cursor-pointer underline"
              style="color: var(--primary)"
              @click="handleBackToLogin"
            >
              返回登入
            </a>
          </p>
        </div>

        <!-- ===== Step: Verify ===== -->
        <div
          v-else-if="step === 'verify'"
          class="flex w-full max-w-[440px] flex-col items-center gap-5 rounded-2xl bg-white p-6"
          style="box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15)"
        >
          <!-- Warning icon + title -->
          <div class="flex flex-col items-center gap-2">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100"
            >
              <i class="pi pi-exclamation-circle text-2xl text-amber-500" />
            </div>
            <h2 class="text-3xl font-bold" style="color: var(--surface-950)">
              安全驗證
            </h2>
            <p
              class="text-center text-sm leading-relaxed"
              style="color: var(--text-muted)"
            >
              為了保障交易安全與物流通知，<br />
              首次登入註冊需先<span
                class="font-medium"
                style="color: var(--surface-950)"
                >綁定手機號碼</span
              >。
            </p>
          </div>

          <!-- Phone row + 驗證碼輸入框（發送驗證碼按鈕放在驗證碼輸入框後方） -->
          <div class="flex w-full flex-col gap-3">
            <div class="flex items-end gap-2">
              <div class="flex w-[110px] shrink-0 flex-col gap-1.5">
                <label class="text-sm font-medium text-slate-700">國碼</label>
                <Select
                  v-model="verifyCountryCode"
                  :options="COUNTRY_CODES"
                  class="w-full"
                />
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                <label class="text-sm font-medium text-slate-700"
                  >電話號碼</label
                >
                <IconField icon-position="right" class="w-full">
                  <InputIcon
                    ><i class="pi pi-phone" style="color: var(--text-muted)"
                  /></InputIcon>
                  <InputText
                    v-model="verifyPhone"
                    type="tel"
                    placeholder="請輸入您的電話號碼"
                    class="w-full"
                  />
                </IconField>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-slate-700"
                >簡訊驗證碼</label
              >
              <!-- 尚未發送過：只顯示「發送驗證碼」按鈕 -->
              <Button
                v-if="!hasSentCode"
                :disabled="!canSendVerifyCode"
                label="發送驗證碼"
                class="!min-h-11 w-full"
                @click="handleSendVerifyCode"
              />
              <!-- 已發送過：顯示驗證碼輸入框 + 底下「重新發送驗證碼」連結 -->
              <template v-else>
                <InputText
                  v-model="verifyCode"
                  :maxlength="SMS_CODE_LENGTH"
                  placeholder="請輸入六位數驗證碼"
                  class="w-full"
                />
                <button
                  type="button"
                  class="mt-1 cursor-pointer self-start text-sm underline disabled:cursor-not-allowed disabled:no-underline"
                  :class="canSendVerifyCode ? '' : 'text-slate-400'"
                  :style="canSendVerifyCode ? { color: 'var(--primary)' } : {}"
                  :disabled="!canSendVerifyCode"
                  @click="handleSendVerifyCode"
                >
                  {{
                    resendCountdown > 0
                      ? `${resendCountdown} 秒後可重新發送`
                      : '重新發送驗證碼'
                  }}
                </button>
              </template>
            </div>
          </div>

          <!-- Info banner -->
          <div
            class="flex w-full items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-700"
          >
            <i class="pi pi-info-circle mt-0.5 shrink-0" />
            <span
              >驗證成功後，系統將自動連結您的帳號與手機，保障購物權益。</span
            >
          </div>

          <Button
            :disabled="!canSubmitVerify"
            label="確定綁定並登入"
            class="!min-h-12 w-full"
            @click="handleSubmitVerify"
          />

          <a
            class="cursor-pointer text-sm underline"
            style="color: var(--text-muted)"
            @click="handleBackToReview"
          >
            返回
          </a>
        </div>
      </div>

      <!-- ===== Step: Success ===== -->
      <div v-else class="mx-auto flex max-w-7xl items-center justify-center">
        <div
          class="flex w-full max-w-[440px] flex-col items-center gap-4 rounded-2xl bg-white p-8"
          style="box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15)"
        >
          <div
            class="flex h-14 w-14 items-center justify-center rounded-full bg-green-100"
          >
            <i class="pi pi-check-circle text-3xl text-green-600" />
          </div>
          <h2 class="text-3xl font-bold" style="color: var(--surface-950)">
            綁定成功！
          </h2>
          <p class="text-sm" style="color: var(--text-muted)">
            您的帳號與手機已成功綁定。
          </p>
          <Button
            label="立即進入商城"
            class="!min-h-12 w-full"
            @click="handleEnterShop"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* 與 LoginPage 共用的背景紫色 blob */
.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      circle at 75% 50%,
      color-mix(in srgb, var(--primary) 40%, transparent),
      transparent 45%
    ),
    radial-gradient(
      circle at 80% 30%,
      color-mix(in srgb, var(--primary) 25%, transparent),
      transparent 35%
    );
}
</style>
