<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

type Step = 'form' | 'success'
const step = ref<Step>('form')

const countryCodes = ['+886', '+852', '+86']
const countryCode = ref('+886')
const phone = ref('')
const name = ref('')
const smsCode = ref('')
const password = ref('')
const confirm = ref('')
const agreed = ref(false)
const submitted = ref(false)

/** 發送驗證碼後 60 秒倒數，期間 disabled。 */
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

const canSendSms = computed(() => !!phone.value && resendCountdown.value === 0)
function sendSmsCode(): void {
  if (!canSendSms.value) return
  startCountdown()
  ui.toast('驗證碼已發送（示意）')
}

/** 8-20 碼英數字組合，不可含特殊符號或 Emoji。 */
const passwordRule = /^[A-Za-z0-9]{8,20}$/
const passwordInvalid = computed(() => !!password.value && !passwordRule.test(password.value))
const passwordMismatch = computed(() => !!confirm.value && password.value !== confirm.value)

const canSubmit = computed(() =>
  !!name.value
  && !!phone.value
  && smsCode.value.length === 6
  && !!password.value
  && !passwordInvalid.value
  && !passwordMismatch.value
  && agreed.value,
)

function onSubmit(): void {
  submitted.value = true
  if (!canSubmit.value) return
  step.value = 'success'
}
/** 「立即登入」：完成註冊成功 → 自動登入並前往商城。 */
function goToShop(): void {
  auth.login(name.value)
  router.push('/shop')
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
        <Button label="已有帳號？登入" severity="secondary" text @click="router.push('/login')" />
      </div>
    </header>

    <main class="relative z-10 px-4 py-12 flex justify-center">
      <div class="bg-white rounded-2xl p-8 w-full max-w-[480px] flex flex-col gap-5"
           style="box-shadow: 0 2px 6px rgba(0,0,0,0.15)">

        <h2 v-if="step === 'form'" class="text-[28px] font-bold text-center" style="color: var(--surface-950)">註冊帳號</h2>

        <form v-if="step === 'form'" class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <!-- 姓名 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--surface-700)">姓名</label>
            <IconField icon-position="right" class="w-full">
              <InputIcon><i class="pi pi-user" style="color: var(--text-muted)" /></InputIcon>
              <InputText v-model="name" placeholder="請輸入您的姓名" class="w-full" />
            </IconField>
          </div>

          <!-- 國碼 + 電話號碼 -->
          <div class="flex gap-2 items-end">
            <div class="flex flex-col gap-1.5 w-[100px] shrink-0">
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

          <!-- 簡訊驗證碼 + 發送驗證碼（按鈕跟驗證碼欄位同列，意圖更清楚） -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--surface-700)">簡訊驗證碼</label>
            <div class="flex gap-2">
              <InputText
                v-model="smsCode"
                maxlength="6"
                placeholder="請輸入六位數驗證碼"
                class="flex-1 min-w-0"
              />
              <Button
                :label="resendCountdown > 0 ? `${resendCountdown}s` : '發送驗證碼'"
                :disabled="!canSendSms"
                severity="secondary"
                class="!min-h-[44px] shrink-0 whitespace-nowrap"
                @click="sendSmsCode"
              />
            </div>
          </div>

          <!-- 設定密碼 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--surface-700)">設定密碼</label>
            <Password
              v-model="password"
              :feedback="false"
              toggle-mask
              :invalid="passwordInvalid"
              placeholder="8-20位英數字組合，不可含特殊符號或 Emoji"
              fluid
              input-class="w-full"
            />
            <p v-if="passwordInvalid" class="text-xs font-medium" style="color: #ef4444">
              密碼需為 8-20 位英數字組合，不可包含特殊符號或 Emoji
            </p>
          </div>

          <!-- 確認密碼 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" style="color: var(--surface-700)">確認密碼</label>
            <Password
              v-model="confirm"
              :feedback="false"
              toggle-mask
              :invalid="passwordMismatch"
              placeholder="再次輸入設定密碼"
              fluid
              input-class="w-full"
            />
            <p v-if="passwordMismatch" class="text-xs font-medium" style="color: #ef4444">
              兩次輸入的密碼不一致
            </p>
          </div>

          <!-- 同意條款 + 提醒 -->
          <div class="flex flex-col gap-1">
            <label class="flex items-start gap-2 cursor-pointer">
              <Checkbox v-model="agreed" binary input-id="reg-agree" class="mt-0.5" />
              <span class="text-sm leading-relaxed" style="color: var(--surface-700)">
                我同意直播管家購物小幫手
                <a class="underline cursor-pointer font-medium" style="color: var(--primary)" @click.prevent="router.push('/terms')">服務政策</a>
                與
                <a class="underline cursor-pointer font-medium" style="color: var(--primary)" @click.prevent="router.push('/privacy')">隱私權政策</a>
              </span>
            </label>
            <p
              v-if="!agreed"
              class="text-xs font-medium pl-7"
              style="color: #ef4444"
            >為保障您的權益，請先同意服務條款與隱私政策</p>
          </div>

          <!-- 完成註冊並登入 — 主色漸層 button -->
          <button
            type="submit"
            :disabled="!canSubmit"
            class="w-full min-h-[52px] rounded-xl font-bold text-white text-base transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ background: canSubmit ? 'var(--primary-bg)' : '#9ca3af' }"
          >完成註冊並登入</button>

          <!-- 已經有帳號？立即登入 -->
          <div class="text-center text-sm" style="color: var(--surface-700)">
            已經有帳號了？
            <button
              type="button"
              class="font-medium underline underline-offset-4"
              style="color: var(--primary)"
              @click="router.push('/login')"
            >立即登入</button>
          </div>
        </form>

        <!-- 註冊成功畫面 -->
        <template v-else>
          <div class="text-center flex flex-col gap-2">
            <h2 class="text-[28px] font-bold" style="color: var(--surface-950)">註冊成功！</h2>
            <p class="text-base" style="color: var(--text-muted)">
              您的帳號已建立完成，現在可以使用新帳號登入直播管家。
            </p>
          </div>
          <button
            class="w-full min-h-[52px] rounded-xl font-bold text-white text-base transition-opacity"
            :style="{ background: 'var(--primary-bg)' }"
            @click="goToShop"
          >立即登入</button>
        </template>
      </div>
    </main>
  </div>
</template>
