<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../pinia/auth';
import { useUiStore } from '../pinia/ui';
import { useThemeStore } from '../pinia/theme';
import { SOCIAL_BRAND_COLORS } from '../utils/brand-colors';

declare global {
  interface Window {
    grecaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => number;
      reset: (id?: number) => void;
      ready: (cb: () => void) => void;
    };
    __recaptchaOnLoad?: () => void;
  }
}

// Google's official test sitekey — replace with your real key in production.
const RECAPTCHA_SITEKEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const RECAPTCHA_SCRIPT_ID = 'recaptcha-v2-script';
const COUNTRY_CODES = ['+886', '+852', '+853', '+86'];

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();
const themeStore = useThemeStore();
const BASE_URL = import.meta.env.BASE_URL;

const isAuroraTheme = computed(() => themeStore.current.id === 'aurora');
/** Aurora 外觀用不同底圖（珊瑚 → 蒂芬妮綠曲線）；用 BASE_URL 才能對到 Vite 的 base '/xsmartlive-mall/' */
const authBgSrc = computed(() =>
  isAuroraTheme.value
    ? `${import.meta.env.BASE_URL}auth-bg-aurora.png`
    : `${import.meta.env.BASE_URL}auth-bg-mobile.png`,
);

const countryCode = ref('+886');
const phone = ref('');
const password = ref('');
const captchaToken = ref('');
const isAgreed = ref(false);
const isSubmitted = ref(false);

const recaptchaContainer = ref<HTMLElement | null>(null);
let widgetId: number | null = null;

const canSubmit = computed(
  () =>
    isAgreed.value && !!phone.value && !!password.value && !!captchaToken.value,
);
const redirectTo = computed(() => (route.query.redirect as string) || '/shop');

const renderWidget = () => {
  if (!window.grecaptcha || !recaptchaContainer.value || widgetId !== null)
    return;
  widgetId = window.grecaptcha.render(recaptchaContainer.value, {
    sitekey: RECAPTCHA_SITEKEY,
    callback: (token: string) => {
      captchaToken.value = token;
    },
    'expired-callback': () => {
      captchaToken.value = '';
    },
    'error-callback': () => {
      captchaToken.value = '';
    },
  });
};

const handleSocialLogin = (provider: string) => {
  // 原型：Google 模擬「已綁定過」的回頭客 → 直接登入；其餘 provider 走首次註冊流程
  if (provider.toLowerCase() === 'google') {
    auth.login();
    ui.toast(`已使用 ${provider} 登入`);
    router.push(redirectTo.value);
    return;
  }
  router.push({
    path: '/social-signup',
    query: { provider: provider.toLowerCase() },
  });
};

const handleSubmit = () => {
  isSubmitted.value = true;
  if (!canSubmit.value) return;
  auth.login();
  router.push(redirectTo.value);
};

onMounted(() => {
  if (window.grecaptcha?.render) {
    window.grecaptcha.ready(renderWidget);
    return;
  }
  window.__recaptchaOnLoad = () => window.grecaptcha?.ready(renderWidget);
  if (!document.getElementById(RECAPTCHA_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src =
      'https://www.google.com/recaptcha/api.js?onload=__recaptchaOnLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
});

onBeforeUnmount(() => {
  if (widgetId !== null && window.grecaptcha) window.grecaptcha.reset(widgetId);
  delete window.__recaptchaOnLoad;
});
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden"
    style="background: var(--surface-100)"
  >
    <!-- 手機底圖（Aurora / 其他外觀各自的曲線 blob） -->
    <img
      :src="authBgSrc"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute top-0 right-0 h-full w-auto max-w-full select-none @3xl:hidden"
    />

    <!-- PC 徑向漸層 blob：Aurora 用珊瑚色調、其他外觀用原本紫藍 -->
    <div
      class="hidden @3xl:block"
      :class="isAuroraTheme ? 'login-bg-aurora' : 'login-bg'"
      aria-hidden="true"
    ></div>

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
      <div
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
            :src="`${BASE_URL}login-illustration.svg`"
            alt="直播購物插圖"
            class="pointer-events-none hidden h-auto max-w-full select-none @3xl:block @3xl:w-[200px] @4xl:w-[476px]"
            draggable="false"
          />
        </div>

        <!-- Right: login card -->
        <div
          class="flex w-full max-w-[440px] flex-col items-center gap-4 rounded-2xl bg-white p-6"
          style="box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15)"
        >
          <h2 class="text-3xl font-bold" style="color: var(--surface-950)">
            登入
          </h2>

          <!-- Form 父層統一 label / 文字基準（PrimeVue 元件內部不受繼承，會自行套用 size） -->
          <form
            class="flex w-full flex-col gap-4 text-base"
            style="color: var(--surface-700)"
            @submit.prevent="handleSubmit"
          >
            <!-- Country code + phone -->
            <div class="flex items-start gap-2">
              <div class="flex w-[118px] flex-col gap-2">
                <label>國碼</label>
                <Select
                  v-model="countryCode"
                  :options="COUNTRY_CODES"
                  class="w-full"
                />
              </div>
              <div class="flex flex-1 flex-col gap-2">
                <label>電話號碼</label>
                <InputText
                  v-model="phone"
                  type="tel"
                  placeholder="請輸入您的電話號碼"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="flex flex-col gap-2">
              <label>密碼</label>
              <Password
                v-model="password"
                :feedback="false"
                toggle-mask
                placeholder="請輸入您的密碼"
                fluid
                input-class="w-full"
              />
              <a
                class="cursor-pointer self-end underline"
                style="color: var(--primary)"
                @click="router.push('/forgot')"
              >
                忘記密碼
              </a>
            </div>

            <!-- reCaptcha -->
            <div class="flex flex-col gap-2">
              <label>驗證碼</label>
              <div ref="recaptchaContainer" class="recaptcha-host"></div>
              <p
                v-if="isSubmitted && !captchaToken"
                class="text-sm text-red-500"
              >
                請先完成人機驗證
              </p>
            </div>

            <!-- Terms agreement -->
            <div class="flex items-start gap-2">
              <Checkbox
                v-model="isAgreed"
                binary
                input-id="login-agree"
                class="mt-0.5 shrink-0"
              />
              <div class="flex flex-1 flex-col gap-2">
                <p class="leading-[1.4]">
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
                <p v-if="isSubmitted && !isAgreed" class="text-red-500">
                  為保障您的權益，請先同意服務條款與隱私政策
                </p>
              </div>
            </div>

            <!-- Submit button -->
            <Button
              type="submit"
              :disabled="!canSubmit"
              label="使用電話號碼登入"
              class="mt-1 !min-h-12 w-full"
            />
          </form>

          <!-- Divider -->
          <div class="flex w-full items-center gap-4">
            <div class="h-px flex-1 bg-[var(--border-light)]"></div>
            <span
              class="text-base whitespace-nowrap"
              style="color: var(--text-muted)"
            >
              或透過以下方式快速登入
            </span>
            <div class="h-px flex-1 bg-[var(--border-light)]"></div>
          </div>

          <!-- Social login -->
          <div class="flex w-full flex-col gap-2">
            <Button
              outlined
              severity="secondary"
              :pt="{ root: { class: 'social-btn' } }"
              @click="handleSocialLogin('Facebook')"
            >
              <i
                class="pi pi-facebook text-xl"
                :style="{ color: SOCIAL_BRAND_COLORS.facebook }"
              />
              <span>Facebook</span>
            </Button>
            <Button
              outlined
              severity="secondary"
              :pt="{ root: { class: 'social-btn' } }"
              @click="handleSocialLogin('WhatsApp')"
            >
              <i
                class="pi pi-whatsapp text-xl"
                :style="{ color: SOCIAL_BRAND_COLORS.whatsapp }"
              />
              <span>WhatsApp</span>
            </Button>
            <Button
              outlined
              severity="secondary"
              :pt="{ root: { class: 'social-btn' } }"
              @click="handleSocialLogin('Google')"
            >
              <span class="google-icon" aria-hidden="true">G</span>
              <span>Google</span>
            </Button>
            <Button
              outlined
              severity="secondary"
              :pt="{ root: { class: 'social-btn' } }"
              @click="handleSocialLogin('Line')"
            >
              <span class="line-icon" aria-hidden="true">LINE</span>
              <span>Line</span>
            </Button>
            <Button
              outlined
              severity="secondary"
              :pt="{ root: { class: 'social-btn' } }"
              @click="handleSocialLogin('Tiktok')"
            >
              <i class="pi pi-tiktok text-xl" />
              <span>Tiktok</span>
            </Button>
          </div>

          <p class="text-center text-base" style="color: var(--text-muted)">
            尚未建立帳戶，即刻
            <a
              class="ml-1 cursor-pointer underline"
              style="color: var(--primary)"
              @click="router.push('/register')"
            >
              註冊
            </a>
          </p>
        </div>
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
/* Aurora PC 版：珊瑚 → 蒂芬妮綠 徑向漸層，鋪滿背景不切邊 */
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

.recaptcha-host {
  min-height: 78px;
}
.recaptcha-host :deep(> div) {
  width: 100% !important;
}

/* PrimeVue Button 內部結構不吃 Tailwind class 繼承，這層樣式靠 pt 套到 root */
.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  border-radius: 6px;
  border: 1px solid var(--surface-700);
  background: white;
  color: var(--surface-700);
  font-weight: 700;
  font-size: 16px;
  transition: background-color 0.15s;
}
.social-btn:hover {
  background: #f8fafc;
}

/* brand-color 豁免：Google logo 重繪，四色為官方標誌色（見 utils/brand-colors GOOGLE_LOGO_COLORS）。
   CSS 無法 import TS 常數，故就地保留。 */
.google-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: conic-gradient(
    from -45deg,
    #ea4335 0deg 90deg,
    #fbbc05 90deg 180deg,
    #34a853 180deg 270deg,
    #4285f4 270deg 360deg
  );
  color: white;
  font-weight: 700;
  font-size: 12px;
  line-height: 1;
}

/* brand-color 豁免：LINE 官方綠 #06c755（見 utils/brand-colors SOCIAL_BRAND_COLORS.line）。 */
.line-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: #06c755;
  color: white;
  font-weight: 800;
  font-size: 8px;
  line-height: 1;
}
</style>
