<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'

declare global {
  interface Window {
    grecaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => number
      reset: (id?: number) => void
      ready: (cb: () => void) => void
    }
    __recaptchaOnLoad?: () => void
  }
}

// Google's official test sitekey — replace with your real key in production.
// Docs: https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha
const RECAPTCHA_SITEKEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
const RECAPTCHA_SCRIPT_ID = 'recaptcha-v2-script'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()

// 登入成功後導向的目的地（由 redirect query 指定，預設首頁）
const redirectTo = () => (route.query.redirect as string) || '/shop'

function socialLogin(provider: string) {
  auth.login()
  ui.toast(`已使用 ${provider} 登入`)
  router.push(redirectTo())
}

const countryCodes = ['+886', '+852', '+853', '+86']
const countryCode = ref('+886')
const phone = ref('')
const password = ref('')
const captchaToken = ref('')
const agreed = ref(false)
const submitted = ref(false)

const recaptchaContainer = ref<HTMLElement | null>(null)
let widgetId: number | null = null

const canSubmit = computed(() => agreed.value && !!phone.value && !!password.value && !!captchaToken.value)

function renderWidget() {
  if (!window.grecaptcha || !recaptchaContainer.value || widgetId !== null) return
  widgetId = window.grecaptcha.render(recaptchaContainer.value, {
    sitekey: RECAPTCHA_SITEKEY,
    callback: (token: string) => { captchaToken.value = token },
    'expired-callback': () => { captchaToken.value = '' },
    'error-callback': () => { captchaToken.value = '' },
  })
}

onMounted(() => {
  if (window.grecaptcha?.render) {
    window.grecaptcha.ready(renderWidget)
    return
  }
  window.__recaptchaOnLoad = () => window.grecaptcha?.ready(renderWidget)
  if (!document.getElementById(RECAPTCHA_SCRIPT_ID)) {
    const s = document.createElement('script')
    s.id = RECAPTCHA_SCRIPT_ID
    s.src = 'https://www.google.com/recaptcha/api.js?onload=__recaptchaOnLoad&render=explicit'
    s.async = true
    s.defer = true
    document.head.appendChild(s)
  }
})

onBeforeUnmount(() => {
  if (widgetId !== null && window.grecaptcha) window.grecaptcha.reset(widgetId)
  delete window.__recaptchaOnLoad
})

function onSubmit() {
  submitted.value = true
  if (!canSubmit.value) return
  auth.login()
  router.push(redirectTo())
}
</script>

<template>
  <div class="min-h-screen relative overflow-hidden" style="background: var(--surface-100)">
    <!-- Decorative background blob -->
    <div class="login-bg" aria-hidden="true"></div>

    <!-- Top bar -->
    <header class="relative z-10 bg-white border-b border-[var(--border-light)]">
      <div class="max-w-[1280px] mx-auto flex items-center justify-between px-8 py-2 h-14">
        <button class="flex items-center gap-2 shrink-0" @click="router.push('/shop')">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: var(--primary-bg)">
            <span class="text-white font-bold text-base">X</span>
          </div>
          <span class="font-bold text-xl leading-tight" style="color: var(--primary)">
            <span class="opacity-90">xSmart</span><span>Live</span>
          </span>
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
      <div class="max-w-[1280px] mx-auto flex flex-col @lg:flex-row items-center justify-center gap-12 @4xl:gap-28">
        <!-- Left: welcome + illustration -->
        <div class="flex flex-col items-center gap-10 shrink-0">
          <h1 class="text-[24px] @3xl:text-[26px] @4xl:text-[36px] font-bold text-center leading-tight whitespace-nowrap" style="color: var(--surface-950)">
            歡迎光臨！<br>直播好康等你來逛
          </h1>
          <img
            src="/login-illustration.png"
            alt="直播購物插圖"
            class="hidden @3xl:block @3xl:w-[200px] @4xl:w-[476px] max-w-full h-auto select-none pointer-events-none"
            draggable="false"
          />
        </div>

        <!-- Right: login card -->
        <div class="bg-white rounded-2xl p-6 w-full max-w-[440px] flex flex-col gap-4 items-center"
             style="box-shadow: 0 2px 6px rgba(0,0,0,0.15)">
          <h2 class="text-[28px] font-bold text-center" style="color: var(--surface-950)">登入</h2>

          <form class="w-full flex flex-col gap-4" @submit.prevent="onSubmit">
            <!-- Country code + phone -->
            <div class="flex gap-2 items-start">
              <div class="flex flex-col gap-2 w-[118px]">
                <label class="text-base" style="color: var(--surface-700)">國碼</label>
                <Select v-model="countryCode" :options="countryCodes" class="w-full" />
              </div>
              <div class="flex-1 flex flex-col gap-2">
                <label class="text-base" style="color: var(--surface-700)">電話號碼</label>
                <InputText v-model="phone" type="tel" placeholder="請輸入您的電話號碼" class="w-full" />
              </div>
            </div>

            <!-- Password -->
            <div class="flex flex-col gap-2">
              <label class="text-base" style="color: var(--surface-700)">密碼</label>
              <Password
                v-model="password"
                :feedback="false"
                toggle-mask
                placeholder="請輸入您的密碼"
                fluid
                input-class="w-full"
              />
              <a class="self-end text-base underline cursor-pointer" style="color: var(--primary)" @click="router.push('/forgot')">忘記密碼</a>
            </div>

            <!-- reCaptcha -->
            <div class="flex flex-col gap-2">
              <label class="text-base" style="color: var(--surface-700)">驗證碼</label>
              <div ref="recaptchaContainer" class="recaptcha-host"></div>
              <p v-if="submitted && !captchaToken" class="text-sm" style="color: #ef4444">
                請先完成人機驗證
              </p>
            </div>

            <!-- Terms agreement -->
            <div class="flex gap-2 items-start">
              <Checkbox v-model="agreed" binary input-id="login-agree" class="mt-[2px] shrink-0" />
              <div class="flex flex-col gap-2 flex-1">
                <p class="text-base leading-[1.4]" style="color: var(--surface-700)">
                  我同意直播管家購物小幫手
                  <a class="underline cursor-pointer" style="color: var(--primary)" @click="router.push('/terms')">服務政策</a>
                  與
                  <a class="underline cursor-pointer" style="color: var(--primary)" @click="router.push('/privacy')">隱私權政策</a>
                </p>
                <p v-if="submitted && !agreed" class="text-base" style="color: #ef4444">
                  為保障您的權益，請先同意服務條款與隱私政策
                </p>
              </div>
            </div>

            <!-- Submit button -->
            <Button
              type="submit"
              :disabled="!canSubmit"
              label="使用電話號碼登入"
              class="w-full mt-1 !min-h-[48px]"
            />
          </form>

          <!-- Divider -->
          <div class="flex items-center gap-4 w-full">
            <div class="flex-1 h-px bg-[var(--border-light)]"></div>
            <span class="text-base whitespace-nowrap" style="color: var(--text-muted)">或透過以下方式快速登入</span>
            <div class="flex-1 h-px bg-[var(--border-light)]"></div>
          </div>

          <!-- Social login -->
          <div class="w-full flex flex-col gap-2">
            <button class="social-btn" @click="socialLogin('Facebook')">
              <i class="pi pi-facebook text-[22px]" style="color: #1877f2" />
              <span>Facebook</span>
            </button>
            <button class="social-btn" @click="socialLogin('Google')">
              <span class="google-icon" aria-hidden="true">G</span>
              <span>Google</span>
            </button>
            <button class="social-btn" @click="socialLogin('Line')">
              <span class="line-icon" aria-hidden="true">LINE</span>
              <span>Line</span>
            </button>
            <button class="social-btn" @click="socialLogin('Tiktok')">
              <i class="pi pi-tiktok text-[22px]" />
              <span>Tiktok</span>
            </button>
          </div>

          <p class="text-base text-center" style="color: var(--text-muted)">
            尚未建立帳戶，即刻
            <a class="underline cursor-pointer ml-1" style="color: var(--primary)" @click="router.push('/register')">註冊</a>
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
    radial-gradient(circle at 30% 35%, rgba(112, 8, 231, 0.55) 0%, rgba(112, 8, 231, 0) 38%),
    radial-gradient(circle at 65% 70%, rgba(96, 165, 250, 0.45) 0%, rgba(96, 165, 250, 0) 40%);
  filter: blur(10px);
}

.recaptcha-host {
  min-height: 78px;
}
.recaptcha-host :deep(> div) {
  width: 100% !important;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 8px 24px;
  min-height: 48px;
  border-radius: 6px;
  border: 1px solid var(--surface-700);
  background: white;
  color: var(--surface-700);
  font-weight: 700;
  font-size: 16px;
  transition: background-color 0.15s;
  cursor: pointer;
}
.social-btn:hover {
  background: #f8fafc;
}

.google-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: conic-gradient(from -45deg, #ea4335 0deg 90deg, #fbbc05 90deg 180deg, #34a853 180deg 270deg, #4285f4 270deg 360deg);
  color: white;
  font-weight: 700;
  font-size: 12px;
  line-height: 1;
}

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
