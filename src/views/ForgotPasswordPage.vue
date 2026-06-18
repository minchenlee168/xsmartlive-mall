<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '../stores/ui'

const router = useRouter()
const ui = useUiStore()

type Step = 'phone' | 'verify' | 'reset' | 'success'
const step = ref<Step>('phone')

const countryCodes = ['+886', '+852']
const countryCode = ref('+886')
const phone = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const canSend = computed(() => !!phone.value)
const canVerify = computed(() => code.value.length === 6)
/** 強密碼：>= 8 碼且同時包含英文字母與數字；兩次輸入需一致。 */
const isStrongPassword = computed(() =>
  newPassword.value.length >= 8
  && /[A-Za-z]/.test(newPassword.value)
  && /\d/.test(newPassword.value),
)
const canReset = computed(() =>
  isStrongPassword.value && newPassword.value === confirmPassword.value,
)

/** 重新獲取倒數秒數；> 0 時連結 disabled。 */
const resendCountdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null
function startCountdown(): void {
  resendCountdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    resendCountdown.value -= 1
    if (resendCountdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}
onBeforeUnmount(() => { if (countdownTimer) clearInterval(countdownTimer) })

/** 0912345678 → 0912***678 */
const maskedPhone = computed(() => {
  const p = phone.value
  if (p.length < 7) return p
  return `${p.slice(0, 4)}***${p.slice(-3)}`
})

function sendCode(): void {
  if (!canSend.value) return
  step.value = 'verify'
  code.value = ''
  startCountdown()
  ui.toast('驗證碼已發送（示意）')
}
function resendCode(): void {
  if (resendCountdown.value > 0) return
  code.value = ''
  startCountdown()
  ui.toast('已重新發送驗證碼（示意）')
}
function verifyCode(): void {
  if (!canVerify.value) return
  step.value = 'reset'
  ui.toast('驗證成功，請設定新密碼')
}
function backToPhone(): void {
  step.value = 'phone'
  code.value = ''
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  resendCountdown.value = 0
}
function resetPassword(): void {
  if (!canReset.value) return
  step.value = 'success'
}
/** 「立即登入」按鈕：成功畫面導回登入。 */
function goToLogin(): void {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen relative overflow-hidden" style="background: var(--surface-100)">
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
        <Button label="返回登入" severity="secondary" text @click="router.push('/login')" />
      </div>
    </header>

    <main class="relative z-10 px-4 py-12 flex justify-center">
      <div class="bg-white rounded-2xl p-8 w-full max-w-[520px] flex flex-col gap-5"
           style="box-shadow: 0 2px 6px rgba(0,0,0,0.15)">

        <!-- Step 1: 輸入手機號碼 -->
        <template v-if="step === 'phone'">
          <div class="text-center flex flex-col gap-2">
            <h2 class="text-[28px] font-bold" style="color: var(--surface-950)">忘記密碼</h2>
            <p class="text-base" style="color: var(--text-muted)">
              請輸入您註冊時使用的手機號碼，我們將為您發送驗證碼。
            </p>
          </div>

          <div class="flex gap-3">
            <div class="flex flex-col gap-1.5 w-[120px] shrink-0">
              <label class="text-sm font-medium" style="color: var(--surface-700)">國碼</label>
              <Select v-model="countryCode" :options="countryCodes" class="w-full" />
            </div>
            <div class="flex flex-col gap-1.5 flex-1 min-w-0">
              <label class="text-sm font-medium" style="color: var(--surface-700)">電話號碼</label>
              <IconField icon-position="right" class="w-full">
                <InputIcon><i class="pi pi-phone" style="color: var(--text-muted)" /></InputIcon>
                <InputText v-model="phone" type="tel" placeholder="請輸入您的電話號碼" class="w-full" />
              </IconField>
            </div>
          </div>

          <button
            :disabled="!canSend"
            class="w-full min-h-[52px] rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-50"
            :style="{ background: 'var(--primary-bg)' }"
            @click="sendCode"
          >發送驗證碼</button>

          <div class="text-center">
            <button
              class="text-base font-medium underline underline-offset-4"
              style="color: var(--primary)"
              @click="router.push('/login')"
            >返回登入</button>
          </div>
        </template>

        <!-- Step 2: 驗證身份（OTP） -->
        <template v-else-if="step === 'verify'">
          <div class="text-center flex flex-col gap-2">
            <h2 class="text-[28px] font-bold" style="color: var(--surface-950)">驗證身份</h2>
            <p class="text-base" style="color: var(--text-muted)">
              驗證碼已發送至 {{ maskedPhone }}
            </p>
          </div>

          <div class="flex justify-center">
            <InputOtp v-model="code" :length="6" :pt="{ input: { class: '!w-[48px] !h-[56px] !text-[20px] !font-bold' } }" />
          </div>

          <div class="text-center text-sm" style="color: var(--text-muted)">
            沒有收到驗證碼？
            <button
              class="font-medium underline underline-offset-4 disabled:no-underline disabled:opacity-60"
              :disabled="resendCountdown > 0"
              :style="{ color: 'var(--primary)' }"
              @click="resendCode"
            >
              重新獲取{{ resendCountdown > 0 ? ` (${resendCountdown}s)` : '' }}
            </button>
          </div>

          <button
            :disabled="!canVerify"
            class="w-full min-h-[52px] rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-50"
            :style="{ background: 'var(--primary-bg)' }"
            @click="verifyCode"
          >確認驗證</button>

          <div class="text-center">
            <button
              class="text-base font-medium underline underline-offset-4"
              style="color: var(--surface-700)"
              @click="backToPhone"
            >修改電話號碼</button>
          </div>
        </template>

        <!-- Step 3: 設定新密碼 -->
        <template v-else-if="step === 'reset'">
          <div class="text-center flex flex-col gap-2">
            <h2 class="text-[28px] font-bold" style="color: var(--surface-950)">設定新密碼</h2>
            <p class="text-base" style="color: var(--text-muted)">
              為了您的帳戶安全，請設置一個包含英文與數字的強密碼。
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--surface-700)">新密碼</label>
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
            <label class="text-sm font-medium" style="color: var(--surface-700)">確認新密碼</label>
            <Password
              v-model="confirmPassword"
              :feedback="false"
              toggle-mask
              placeholder="請再次輸入新密碼"
              fluid
              input-class="w-full"
            />
            <p
              v-if="confirmPassword && confirmPassword !== newPassword"
              class="text-xs font-medium"
              style="color: #ef4444"
            >兩次輸入的密碼不一致</p>
          </div>
          <button
            :disabled="!canReset"
            class="w-full min-h-[52px] rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-50"
            :style="{ background: 'var(--primary-bg)' }"
            @click="resetPassword"
          >確認儲存</button>
        </template>

        <!-- Step 4: 密碼重設成功 -->
        <template v-else>
          <div class="text-center flex flex-col gap-2">
            <h2 class="text-[28px] font-bold" style="color: var(--surface-950)">密碼重設成功！</h2>
            <p class="text-base" style="color: var(--text-muted)">
              您的密碼已更新，現在您可以使用新密碼登入帳戶。
            </p>
          </div>
          <button
            class="w-full min-h-[52px] rounded-xl font-bold text-white text-base transition-opacity"
            :style="{ background: 'var(--primary-bg)' }"
            @click="goToLogin"
          >立即登入</button>
        </template>
      </div>
    </main>
  </div>
</template>
