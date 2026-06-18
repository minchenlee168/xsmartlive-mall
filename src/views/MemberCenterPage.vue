<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MemberIcon from '../components/MemberIcon.vue'
import MyOrdersSection from '../components/member/MyOrdersSection.vue'
import TransactionRecordsSection from '../components/member/TransactionRecordsSection.vue'
import NavBar from '../components/NavBar.vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useOrdersStore } from '../stores/orders'
import { useViewportStore } from '../stores/viewport'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()
const ordersStore = useOrdersStore()
const viewport = useViewportStore()

/** 收件地址新增 / 編輯彈窗寬度：手機 frame 才縮窄，避免超出 390px 容器。 */
const addrDialogWidth = computed(() => viewport.current.id === 'mobile' ? '22rem' : '28rem')

/** Profile summary bar 顯示條件：平板/PC 永遠顯示；手機只在「個人帳號」分頁顯示。 */
const showProfileBar = computed(() =>
  viewport.current.id !== 'mobile' || activeNav.value === 'account',
)

function editProfile() {
  activeNav.value = 'account'
  activeSub.value = 'profile'
}

// Verification code countdown
const codeCountdown = ref(0)
let codeTimer: ReturnType<typeof setInterval> | null = null
function sendVerifyCode() {
  if (codeCountdown.value > 0) return
  ui.toast('驗證碼已發送（示意）')
  codeCountdown.value = 60
  codeTimer = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0 && codeTimer) clearInterval(codeTimer)
  }, 1000)
}

const memberId = '422519347308064'

const navItems = [
  { key: 'orders', label: '我的訂單' },
  { key: 'points', label: '紅利點數' },
  { key: 'transactions', label: '交易記錄查詢' },
  { key: 'account', label: '個人帳號' },
]
const accountSubItems = [
  { key: 'profile', label: '會員資料' },
  { key: 'binding', label: '更改綁定帳號' },
  { key: 'address', label: '收件地址' },
  { key: 'password', label: '更改密碼' },
]
/** 允許的 activeNav 值；URL `?tab=` 命中其中之一才採用。 */
const VALID_NAVS = new Set(['orders', 'points', 'transactions', 'account', 'coupons'])
function readTabFromRoute(): string {
  const q = route.query.tab
  return typeof q === 'string' && VALID_NAVS.has(q) ? q : 'orders'
}
const activeNav = ref(readTabFromRoute())
const activeSub = ref('profile')

// 路由 query 變動時同步切換（例如從 NavBar 下拉點「紅利點數」）
watch(() => route.query.tab, () => { activeNav.value = readTabFromRoute() })

// Saved baseline — updated only after a successful save
const snapshot = reactive({
  name: '王小明',
  gender: 'male' as 'male' | 'female' | 'other',
  birthday: '1990-01-01',
  phoneCode: '+886',
  phone: '09123456789',
  email: 'abc@gmail.com',
})

// Profile form
const name = ref(snapshot.name)
const gender = ref<'male' | 'female' | 'other'>(snapshot.gender)
// 生日：以 Date 物件供 DatePicker 使用；與 snapshot 的 'YYYY-MM-DD' 字串互轉
function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const birthday = ref<Date>(parseDate(snapshot.birthday))

// Phone form
const phoneCode = ref(snapshot.phoneCode)
const phone = ref(snapshot.phone)
const verifyCode = ref('')

// Email form
const email = ref(snapshot.email)

// Per-card dirty state — save button enabled only when something changed
const profileDirty = computed(() =>
  name.value !== snapshot.name ||
  gender.value !== snapshot.gender ||
  fmtDate(birthday.value) !== snapshot.birthday
)
const phoneDirty = computed(() =>
  phoneCode.value !== snapshot.phoneCode ||
  phone.value !== snapshot.phone
)
const emailDirty = computed(() => email.value !== snapshot.email)

function saveProfile() {
  if (!profileDirty.value) return
  snapshot.name = name.value
  snapshot.gender = gender.value
  snapshot.birthday = fmtDate(birthday.value)
}
function savePhone() {
  if (!phoneDirty.value) return
  snapshot.phoneCode = phoneCode.value
  snapshot.phone = phone.value
  verifyCode.value = ''
}
function saveEmail() {
  if (!emailDirty.value) return
  snapshot.email = email.value
}

// Linked social accounts
interface SocialAccount {
  key: string
  label: string
  icon: 'fb' | 'google' | 'line' | 'ig' | 'tiktok'
  bound: boolean
  idLabel: string   // e.g. "FBID"
  accountId: string // shown only when bound
}
const socialAccounts = ref<SocialAccount[]>([
  { key: 'fb', label: 'Facebook', icon: 'fb', bound: true, idLabel: 'FBID', accountId: '422519347308064' },
  { key: 'google', label: 'Google', icon: 'google', bound: false, idLabel: 'Google ID', accountId: '' },
  { key: 'line', label: 'Line', icon: 'line', bound: false, idLabel: 'LINE ID', accountId: '' },
  { key: 'ig', label: 'Instagram', icon: 'ig', bound: false, idLabel: 'IG 帳號', accountId: '' },
  { key: 'tiktok', label: 'Tik Tok', icon: 'tiktok', bound: false, idLabel: 'TikTok ID', accountId: '' },
])
function genAccountId(acc: SocialAccount) {
  if (acc.icon === 'ig' || acc.icon === 'line') return '@wang_' + Math.random().toString(36).slice(2, 8)
  return String(Math.floor(1e14 + Math.random() * 9e14))
}
function toggleBind(acc: SocialAccount) {
  acc.bound = !acc.bound
  if (acc.bound) {
    if (!acc.accountId) acc.accountId = genAccountId(acc)
    ui.toast(`已綁定 ${acc.label}`)
  } else {
    acc.accountId = ''
    ui.toast(`已解除綁定 ${acc.label}`)
  }
}

// Shipping addresses
interface Address {
  id: string
  name: string
  phone: string
  address: string
  isDefault: boolean
  chain?: '7-11' | 'FamilyMart'
  storeName?: string
}
const addressTab = ref<'home' | 'store'>('home')
const homeAddrs = ref<Address[]>([
  { id: 'h1', name: '王小明', phone: '+886 912****56', address: '台北市信義區忠孝東路五段 100 號 10 樓', isDefault: true },
  { id: 'h2', name: '王小明', phone: '+886 912****56', address: '台中市西屯區台灣大道三段 99 號', isDefault: false },
])
const storeAddrs = ref<Address[]>([
  { id: 's1', name: '王小明', phone: '+886 912****56', chain: '7-11', storeName: '鑫工門市', address: '台北市信義區忠孝東路五段 100 號 10 樓', isDefault: true },
  { id: 's2', name: '王小明', phone: '+886 912****56', chain: '7-11', storeName: '連興門市', address: '高雄市三民區大連街 314 號', isDefault: false },
  { id: 's3', name: '王小明', phone: '+886 912****56', chain: 'FamilyMart', storeName: '平鎮上海店', address: '桃園市平鎮區上海路２０５號１樓', isDefault: false },
])
const currentAddrs = computed(() => addressTab.value === 'home' ? homeAddrs.value : storeAddrs.value)
function setDefaultAddr(id: string) {
  currentAddrs.value.forEach(a => { a.isDefault = a.id === id })
}
// 刪除地址前先確認
const deleteConfirmOpen = ref(false)
const pendingDeleteId = ref<string | null>(null)
function askDeleteAddr(id: string) {
  pendingDeleteId.value = id
  deleteConfirmOpen.value = true
}
function confirmDeleteAddr() {
  if (pendingDeleteId.value) deleteAddr(pendingDeleteId.value)
  deleteConfirmOpen.value = false
  pendingDeleteId.value = null
}
function deleteAddr(id: string) {
  const list = addressTab.value === 'home' ? homeAddrs : storeAddrs
  const wasDefault = list.value.find(a => a.id === id)?.isDefault
  list.value = list.value.filter(a => a.id !== id)
  if (wasDefault && list.value.length > 0 && !list.value.some(a => a.isDefault)) {
    list.value[0].isDefault = true
  }
  ui.toast(addressTab.value === 'home' ? '宅配地址已刪除' : '超商門市已刪除')
}

// Nav-level content（交易記錄查詢來自 orders store，付款完成會即時同步）
interface PointRecord {
  type: 'earn' | 'deduct'
  title: string
  date: string
  expiry: string
  amount: number
  status: string
}
const pointsHistory: PointRecord[] = [
  { type: 'earn',   title: '雙 11 限時活動贈送',         date: '2026.01.20 23:00', expiry: '2026.01.20 23:00', amount: 12,   status: '已入帳' },
  { type: 'deduct', title: '訂單編號10002132132 折抵',  date: '2026.01.20 23:00', expiry: '2026.01.20 23:00', amount: -200, status: '已使用' },
  { type: 'earn',   title: '會員生日',                  date: '2026.03.01 20:00', expiry: '2026.03.31 24:00', amount: 300,  status: '已入帳' },
]
const pointsTab = ref<'all' | 'earn' | 'deduct'>('all')
const pointsTabs = [
  { key: 'all', label: '全部明細' },
  { key: 'earn', label: '獲得紀錄' },
  { key: 'deduct', label: '扣抵紀錄' },
] as const
const filteredPoints = computed(() =>
  pointsTab.value === 'all'
    ? pointsHistory
    : pointsHistory.filter(p => p.type === pointsTab.value)
)
const expiringPoints = 20.00
function usePoints() {
  ui.toast('已前往購物車，可於結帳折抵紅利點數')
  router.push('/cart')
}
const transactions = computed(() => ordersStore.transactions)
const orderStatusColor: Record<string, string> = {
  已出貨: '#7008e7',
  已完成: '#16a34a',
  處理中: '#f59e0b',
}

// Coupons
interface OwnedCoupon {
  id: string
  amount: string
  title: string
  scope: string
  expiry: string
  status: 'unused' | 'used' | 'expired'
}
interface ClaimableCoupon {
  id: string
  amount: string
  title: string
  scope: string
  expiry: string
}
const couponTab = ref<'all' | 'unused' | 'used' | 'expired'>('all')
const couponTabs = [
  { key: 'all', label: '全部' },
  { key: 'unused', label: '未使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已過期' },
] as const
const ownedCoupons = ref<OwnedCoupon[]>([
  { id: 'o1', amount: '折?元/?折', title: '滿千折百優惠券（滿1000元使用）', scope: '適用範圍（直播場次）：我是直播場次-2025-12-24', expiry: '有效期限 2026.01.20 23:00', status: 'unused' },
  { id: 'o2', amount: '折50元', title: '新客優惠券（滿499元使用）', scope: '新客首單 $499 現折 $50', expiry: '有效期限 2026.01.20 23:00', status: 'unused' },
  { id: 'o3', amount: '折50元', title: '新客優惠券（全站使用）', scope: '適用範圍：全站', expiry: '有效期限 2026.01.20 23:00', status: 'unused' },
  { id: 'o4', amount: '95折', title: '註冊禮金額優惠券（不限金額使用）', scope: '適用範圍：全站', expiry: '有效期限 2026.01.20 23:00', status: 'used' },
  { id: 'o5', amount: '折1000元', title: '新客優惠券（全站使用）', scope: '適用範圍：全站', expiry: '有效期限 2026.01.20 23:00', status: 'expired' },
])
const claimableCoupons = ref<ClaimableCoupon[]>([
  { id: 'c1', amount: '折50%', title: '生日禮券', scope: '適用範圍：全站', expiry: '有效期限 2026.01.30 23:00' },
  { id: 'c2', amount: '折20元', title: '新客優惠券（全站使用）', scope: '適用範圍：全站', expiry: '有效期限 2026.01.30 23:00' },
  { id: 'c3', amount: '折50%', title: '生日禮券', scope: '適用範圍：全站', expiry: '有效期限 2026.01.30 23:00' },
  { id: 'c4', amount: '折20元', title: '新客優惠券（全站使用）', scope: '適用範圍：全站', expiry: '有效期限 2026.01.30 23:00' },
])
const filteredCoupons = computed(() =>
  couponTab.value === 'all'
    ? ownedCoupons.value
    : ownedCoupons.value.filter(c => c.status === couponTab.value)
)
const couponStatusText: Record<string, string> = { used: '已使用', expired: '已過期' }
function useCoupon() {
  ui.toast('已套用優惠券，前往購物車結帳')
  router.push('/cart')
}
function claimCoupon(c: ClaimableCoupon) {
  ownedCoupons.value.unshift({
    id: `o_${Date.now()}`,
    amount: c.amount,
    title: c.title,
    scope: c.scope,
    expiry: c.expiry,
    status: 'unused',
  })
  claimableCoupons.value = claimableCoupons.value.filter(x => x.id !== c.id)
  ui.toast('已領取優惠券')
}

// Change password
const pwCurrent = ref('')
const pwNew = ref('')
const pwConfirm = ref('')
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/
const pwNewValid = computed(() => PW_RE.test(pwNew.value))
const pwMismatch = computed(() => !!pwConfirm.value && pwNew.value !== pwConfirm.value)
const canChangePw = computed(() =>
  !!pwCurrent.value && pwNewValid.value && !pwMismatch.value && !!pwConfirm.value
)
function changePassword() {
  if (!canChangePw.value) return
  pwCurrent.value = ''
  pwNew.value = ''
  pwConfirm.value = ''
  ui.toast('密碼已更新')
}

// 超商門市小圖（存放於 public/member-icons/，以 BASE_URL 引入）
const sevenIcon = `${import.meta.env.BASE_URL}member-icons/seven.png`
const familyIcon = `${import.meta.env.BASE_URL}member-icons/family.png`

// 綁定帳號社群小圖（public/member-icons/ 的 svg，以 BASE_URL 引入）
function socialIconSrc(icon: SocialAccount['icon']) {
  const name = icon === 'fb' ? 'facebook' : icon === 'ig' ? 'instagram' : icon
  return `${import.meta.env.BASE_URL}member-icons/${name}.svg`
}

// --- Add / Edit address drawer ---
const addrDrawerOpen = ref(false)
const addrDrawerMode = ref<'add' | 'edit'>('add')
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  countryCode: '+886',
  phone: '',
  city: '台北市',
  district: '信義區',
  detail: '',
  chain: '7-11' as '7-11' | 'FamilyMart',
  storeName: '',
})
const phoneCodes = ['+886', '+852']
const cities = ['台北市', '新北市', '桃園市', '台中市', '高雄市']
const districtMap: Record<string, string[]> = {
  台北市: ['信義區', '大安區', '中山區', '內湖區'],
  新北市: ['板橋區', '新莊區', '三重區', '中和區'],
  桃園市: ['桃園區', '中壢區', '平鎮區', '龜山區'],
  台中市: ['西屯區', '北屯區', '南屯區', '大里區'],
  高雄市: ['三民區', '前鎮區', '左營區', '鳳山區'],
}
const districts = computed(() => districtMap[form.city] ?? [])

function resetForm() {
  form.name = ''
  form.countryCode = '+886'
  form.phone = ''
  form.city = '台北市'
  form.district = '信義區'
  form.detail = ''
  form.chain = '7-11'
  form.storeName = ''
}
function openAddAddr() {
  addrDrawerMode.value = 'add'
  editingId.value = null
  resetForm()
  addrDrawerOpen.value = true
}
function openEditAddr(addr: Address) {
  addrDrawerMode.value = 'edit'
  editingId.value = addr.id
  resetForm()
  form.name = addr.name
  form.phone = addr.phone.replace(/^\+\d+\s*/, '')
  form.detail = addr.address
  if (addr.chain) form.chain = addr.chain
  if (addr.storeName) form.storeName = addr.storeName
  addrDrawerOpen.value = true
}
const formValid = computed(() => {
  if (!form.name.trim() || !form.phone.trim()) return false
  if (addressTab.value === 'home') return !!form.detail.trim()
  return !!form.storeName.trim() && !!form.detail.trim()
})
function saveAddr() {
  if (!formValid.value) return
  const list = addressTab.value === 'home' ? homeAddrs : storeAddrs
  const phoneFull = `${form.countryCode} ${form.phone}`
  if (addrDrawerMode.value === 'edit' && editingId.value) {
    const target = list.value.find(a => a.id === editingId.value)
    if (target) {
      target.name = form.name
      target.phone = phoneFull
      target.address = form.detail
      if (addressTab.value === 'store') {
        target.chain = form.chain
        target.storeName = form.storeName
      }
    }
  } else {
    const base: Address = {
      id: `${addressTab.value === 'home' ? 'h' : 's'}_${Date.now()}`,
      name: form.name,
      phone: phoneFull,
      address: addressTab.value === 'home' ? `${form.city}${form.district} ${form.detail}` : form.detail,
      isDefault: list.value.length === 0,
    }
    if (addressTab.value === 'store') {
      base.chain = form.chain
      base.storeName = form.storeName
    }
    list.value.push(base)
  }
  addrDrawerOpen.value = false
  ui.toast(addrDrawerMode.value === 'edit' ? '地址已更新' : '地址已新增')
}
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <!-- Profile summary bar：手機只在「個人帳號」分頁顯示；平板/PC 永遠顯示 -->
    <div v-if="showProfileBar" class="bg-white border-b border-[#e2e8f0]">
      <!-- 手機版：上半身份（垂直置中：頭像 / 姓名 / 會員編號），下方紅利點數 vs 優惠券 左右一列 -->
      <!-- padding 跟 main 用同一組 CSS var，紅利/優惠券列才能跟下方 card 外緣對齊 -->
      <div class="@4xl:hidden flex flex-col items-center gap-2" style="padding: var(--page-pad-y) var(--page-pad-x)">
        <div class="w-16 h-16 rounded-full bg-[#e2e8f0] text-[#475569] flex items-center justify-center text-2xl font-medium">
          {{ auth.avatarLetter }}
        </div>
        <p class="text-base font-bold text-[#020617]">{{ name }}</p>
        <p class="text-xs text-[#64748b]">{{ memberId }}</p>

        <!-- 紅利點數 / 優惠券一列：寬度縮到跟下方 card 的內容區同寬（兩側各扣 card-pad） -->
        <div
          class="flex items-center justify-between mt-3 pt-3 border-t border-[#e2e8f0]"
          :style="{ width: 'calc(100% - 2 * var(--card-pad))' }"
        >
          <button
            class="flex items-center gap-1.5 px-2 py-1.5 -mx-2 rounded-md hover:bg-[#f1f5f9] active:bg-[#e2e8f0] transition-colors min-h-[40px]"
            aria-label="前往紅利點數"
            @click="activeNav = 'points'"
          >
            <MemberIcon name="points" :size="18" />
            <span class="text-base text-[#334155]">紅利點數</span>
            <span class="font-medium text-base" style="color: #f59e0b">{{ auth.rewardPoints.toFixed(2) }}</span>
            <i class="pi pi-chevron-right text-xs text-[#94a3b8] ml-0.5" />
          </button>
          <button
            class="flex items-center gap-1.5 px-2 py-1.5 -mx-2 rounded-md hover:bg-[#f1f5f9] active:bg-[#e2e8f0] transition-colors min-h-[40px]"
            aria-label="前往優惠券"
            @click="activeNav = 'coupons'"
          >
            <MemberIcon name="coupon" :size="18" />
            <span class="text-base text-[#334155]">優惠券</span>
            <span class="font-medium text-base" style="color: var(--primary)">{{ auth.couponCount }} 張</span>
            <i class="pi pi-chevron-right text-xs text-[#94a3b8] ml-0.5" />
          </button>
        </div>
      </div>

      <!-- 平板 / PC 版：維持原本完整排版 -->
      <div class="hidden @4xl:block max-w-[1280px] mx-auto px-4 py-5 @4xl:flex @4xl:items-center @4xl:gap-12">
        <!-- Identity -->
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <div class="w-14 h-14 @3xl:w-16 @3xl:h-16 rounded-full bg-[#e2e8f0] text-[#475569] flex items-center justify-center text-2xl font-medium shrink-0 overflow-hidden">
            {{ auth.avatarLetter }}
          </div>
          <div class="min-w-0">
            <p class="text-lg font-bold text-[#020617]">{{ name }}</p>
            <p class="text-xs text-[#64748b]">{{ memberId }}</p>
            <Button label="編輯個人檔案" icon="pi pi-pencil" icon-pos="right" link size="small" class="mt-1 !p-0" @click="editProfile" />
          </div>
        </div>

        <!-- Points + Coupons group：平板並排 card row、PC 與身份同列 -->
        <div class="flex flex-col @3xl:flex-row @4xl:contents gap-3 mt-5 @4xl:mt-0 @3xl:gap-0 @3xl:rounded-[12px] @3xl:bg-[#f8fafc] @3xl:border @3xl:border-[#e2e8f0] @4xl:bg-transparent @4xl:border-0 @4xl:rounded-none">
          <div class="flex flex-col gap-1.5 shrink-0 @3xl:flex-1 @3xl:p-4 @4xl:p-0">
            <div class="flex items-center gap-2">
              <MemberIcon name="points" :size="20" class="shrink-0" />
              <span class="font-medium text-[#334155]">紅利點數</span>
              <Button icon="pi pi-chevron-right" severity="secondary" outlined size="small" class="ml-auto @4xl:ml-1" @click="activeNav = 'points'" />
            </div>
            <p class="text-sm text-[#334155]">目前剩餘點數：<span style="color: #f59e0b" class="font-medium">{{ auth.rewardPoints.toFixed(2) }}</span></p>
          </div>

          <div class="hidden @4xl:block @4xl:hidden w-px bg-[#e2e8f0] self-stretch my-3" />

          <div class="flex flex-col gap-1.5 shrink-0 @3xl:flex-1 @3xl:p-4 @4xl:p-0">
            <div class="flex items-center gap-2">
              <MemberIcon name="coupon" :size="20" class="shrink-0" />
              <span class="font-medium text-[#334155]">優惠券</span>
              <Button icon="pi pi-chevron-right" severity="secondary" outlined size="small" class="ml-auto @4xl:ml-1" @click="activeNav = 'coupons'" />
            </div>
            <p class="text-sm text-[#334155]">總張數：<span style="color: var(--primary)" class="font-medium">{{ auth.couponCount }}張</span></p>
          </div>
        </div>
      </div>
    </div>

    <!-- 個人帳號子分頁下拉（手機 only；放在 profile summary bar 下方）-->
    <div v-if="activeNav === 'account'" class="@4xl:hidden px-4 pt-3">
      <Select
        v-model="activeSub"
        :options="accountSubItems"
        option-label="label"
        option-value="key"
        class="w-full"
      />
    </div>

    <!-- Content -->
    <main class="flex-1 max-w-[1280px] w-full mx-auto flex flex-col @4xl:flex-row" style="padding: var(--page-pad-y) var(--page-pad-x); gap: var(--stack-gap)">
      <!-- Sidebar — 手機隱藏（改走下方 fixed bar）；平板以上仍是上方/側邊 card -->
      <aside v-if="activeNav !== 'coupons'" class="hidden @4xl:block shrink-0 w-full @4xl:w-[220px]">
        <div class="bg-white rounded-[12px] shadow-card card-pad">
          <template v-for="item in navItems" :key="item.key">
            <button
              class="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] text-left transition-colors"
              :class="activeNav === item.key ? '' : 'hover:bg-gray-50'"
              :style="activeNav === item.key
                ? 'background: var(--primary-surface); color: var(--primary)'
                : 'color: #334155'"
              @click="activeNav = item.key"
            >
              <MemberIcon :name="(item.key as 'orders' | 'points' | 'transactions' | 'account')" :size="20" class="shrink-0" />
              <span class="text-sm font-medium">{{ item.label }}</span>
            </button>
            <div v-if="item.key === 'account' && activeNav === 'account'" class="flex flex-col">
              <button
                v-for="sub in accountSubItems"
                :key="sub.key"
                class="w-full text-left pl-12 pr-4 py-2.5 text-sm transition-colors rounded-[8px]"
                :style="activeSub === sub.key ? 'color: var(--primary); font-weight: 500' : 'color: #64748b'"
                @click="activeNav = 'account'; activeSub = sub.key"
              >
                {{ sub.label }}
              </button>
            </div>
          </template>
        </div>
      </aside>

      <!-- Right column -->
      <div class="flex-1 min-w-0 flex flex-col gap-4">

      <!-- 我的訂單（對齊 Figma 設計） -->
      <MyOrdersSection v-if="activeNav === 'orders'" />

      <!-- 紅利點數 -->
      <template v-else-if="activeNav === 'points'">
        <!-- Top cards -->
        <div class="flex flex-col @3xl:flex-row gap-4">
          <div class="flex-1 bg-white rounded-[12px] shadow-card card-pad flex items-center justify-between gap-4">
            <div>
              <p class="text-sm text-[#475569]">目前可使用紅利點數</p>
              <p class="text-[32px] font-bold mt-1" style="color: var(--primary)">{{ auth.rewardPoints.toFixed(2) }}</p>
            </div>
            <Button label="立即使用" class="shrink-0" @click="usePoints" />
          </div>
          <div class="@3xl:w-[260px] bg-white rounded-[12px] shadow-card card-pad">
            <p class="text-sm text-[#475569]">即將到期 (30天內)</p>
            <p class="text-[28px] font-bold mt-1 text-[#334155]">{{ expiringPoints.toFixed(2) }}</p>
          </div>
        </div>

        <!-- Usage records -->
        <section class="bg-white rounded-[12px] shadow-card card-pad">
          <h2 class="text-lg font-bold text-[#020617]">紅利點數使用紀錄</h2>

          <div class="flex items-center gap-6 mt-3 border-b border-[#e2e8f0]">
            <button
              v-for="t in pointsTabs"
              :key="t.key"
              class="pb-2 text-sm font-medium transition-colors -mb-px border-b-2"
              :style="pointsTab === t.key
                ? 'color: var(--primary); border-color: var(--primary)'
                : 'color: #64748b; border-color: transparent'"
              @click="pointsTab = t.key"
            >{{ t.label }}</button>
          </div>

          <div class="flex flex-col">
            <div
              v-for="(h, hi) in filteredPoints"
              :key="hi"
              class="flex items-center gap-4 py-4"
              :class="hi !== filteredPoints.length - 1 ? 'border-b border-[#e2e8f0]' : ''"
            >
              <span
                class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                :style="h.type === 'earn' ? 'background:#dcfce7' : 'background:#f1f5f9'"
              >
                <i
                  :class="['pi text-sm', h.type === 'earn' ? 'pi-arrow-down-left' : 'pi-arrow-up-right']"
                  :style="h.type === 'earn' ? 'color:#16a34a' : 'color:#64748b'"
                />
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-[#334155]">{{ h.title }}</p>
                <div class="flex items-center gap-4 text-xs text-[#64748b] mt-1 flex-wrap">
                  <span class="flex items-center gap-1"><i class="pi pi-calendar text-[10px]" />{{ h.date }}</span>
                  <span>有效期限至 {{ h.expiry }}</span>
                </div>
              </div>
              <div class="text-right shrink-0">
                <p class="text-base font-bold" :style="{ color: h.amount >= 0 ? '#16a34a' : '#334155' }">
                  {{ h.amount >= 0 ? '+ ' : '- ' }}{{ Math.abs(h.amount).toFixed(2) }}
                </p>
                <p class="text-xs text-[#64748b] mt-0.5">{{ h.status }}</p>
              </div>
            </div>
            <div v-if="filteredPoints.length === 0" class="text-sm text-[#64748b] py-10 text-center">
              此分類目前沒有紀錄
            </div>
          </div>
        </section>
      </template>

      <!-- 交易記錄查詢（對齊附圖排版） -->
      <TransactionRecordsSection v-else-if="activeNav === 'transactions'" />

      <!-- 優惠券 — full width, no card wrapper -->
      <section v-else-if="activeNav === 'coupons'">
        <h2 class="text-lg font-bold text-[#020617]">優惠券</h2>

        <!-- Tabs -->
        <div class="flex items-center gap-6 mt-3 border-b border-[#e2e8f0]">
          <button
            v-for="t in couponTabs"
            :key="t.key"
            class="pb-2 text-sm font-medium transition-colors -mb-px border-b-2"
            :style="couponTab === t.key
              ? 'color: var(--primary); border-color: var(--primary)'
              : 'color: #64748b; border-color: transparent'"
            @click="couponTab = t.key"
          >{{ t.label }}</button>
        </div>

        <!-- Owned coupons grid -->
        <div class="grid grid-cols-1 @4xl:grid-cols-2 gap-3 mt-4">
          <div
            v-for="c in filteredCoupons"
            :key="c.id"
            class="flex bg-white border border-[#e2e8f0] rounded-[10px] overflow-hidden min-h-[120px]"
          >
            <div
              class="w-[150px] shrink-0 flex flex-col items-center justify-center gap-2 px-3"
              :style="c.status === 'unused' ? 'background: var(--primary-surface)' : 'background:#f1f5f9'"
            >
              <MemberIcon v-if="c.status === 'unused'" name="coupon" :size="26" />
              <i v-else class="pi pi-ticket text-[22px]" style="color:#94a3b8" />
              <span class="font-bold text-[22px] text-center leading-tight" :style="c.status === 'unused' ? 'color: var(--primary)' : 'color:#94a3b8'">{{ c.amount }}</span>
            </div>
            <div class="flex-1 px-4 py-3 flex flex-col gap-1.5 min-w-0">
              <p class="text-sm font-medium text-[#334155] line-clamp-2">{{ c.title }}</p>
              <span
                class="self-start px-2 py-0.5 rounded text-[12px]"
                :style="c.scope.includes('直播場次')
                  ? 'background:#fce4e4; color:#dc2626'
                  : 'background: var(--primary-surface); color: var(--primary)'"
              >{{ c.scope }}</span>
              <p class="text-[12px] text-[#64748b]">有效期限 {{ c.expiry }}</p>
              <div class="mt-auto flex justify-end pt-1">
                <Button v-if="c.status === 'unused'" label="去使用" outlined size="small" @click="useCoupon" />
                <span v-else class="text-[12px] text-[#94a3b8]">{{ couponStatusText[c.status] }}</span>
              </div>
            </div>
          </div>
          <div v-if="filteredCoupons.length === 0" class="col-span-full text-sm text-[#64748b] py-10 text-center">
            此分類目前沒有優惠券
          </div>
        </div>

        <!-- Claimable -->
        <div class="flex items-center gap-3 my-5">
          <div class="flex-1 h-px bg-[#e2e8f0]" />
          <span class="text-sm font-medium text-[#475569]">領取更多優惠</span>
          <div class="flex-1 h-px bg-[#e2e8f0]" />
        </div>
        <div class="grid grid-cols-1 @4xl:grid-cols-2 gap-3">
          <div
            v-for="c in claimableCoupons"
            :key="c.id"
            class="flex bg-white rounded-[10px] overflow-hidden min-h-[120px]"
          >
            <div
              class="w-[150px] shrink-0 flex flex-col items-center justify-center gap-2 px-3 text-white"
              style="background: var(--primary-bg)"
            >
              <i class="pi pi-ticket text-[24px]" />
              <span class="font-bold text-[24px] text-center leading-tight">{{ c.amount }}</span>
            </div>
            <div class="flex-1 px-4 py-3 flex flex-col gap-1.5 min-w-0">
              <p class="text-sm font-bold text-[#020617] line-clamp-2">{{ c.title }}</p>
              <span
                class="self-start px-2 py-0.5 rounded text-[12px]"
                :style="c.scope.includes('直播場次')
                  ? 'background:#fce4e4; color:#dc2626'
                  : 'background: var(--primary-surface); color: var(--primary)'"
              >{{ c.scope }}</span>
              <p class="text-[12px] text-[#64748b]">有效期限至 {{ c.expiry }}</p>
              <div class="mt-auto flex justify-end pt-1">
                <Button label="領取" size="small" @click="claimCoupon(c)" />
              </div>
            </div>
          </div>
          <div v-if="claimableCoupons.length === 0" class="col-span-full text-sm text-[#64748b] py-6 text-center">
            目前沒有可領取的優惠券
          </div>
        </div>
      </section>

      <template v-else-if="activeSub === 'profile'">
        <!-- 會員資料 -->
        <section class="bg-white rounded-[12px] shadow-card card-pad">
          <h2 class="text-lg font-bold text-[#020617]">會員資料</h2>
          <p class="text-sm text-[#64748b] mt-1 pb-4 border-b border-[#e2e8f0]">管理您的檔案以保護您的帳號</p>

          <div class="flex flex-col gap-4 pt-4 max-w-[440px]">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm text-[#334155]">姓名</label>
              <InputText v-model="name" class="w-full" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm text-[#334155]">性別</label>
              <div class="flex items-center gap-6">
                <div class="flex items-center gap-2 text-sm text-[#334155]">
                  <RadioButton v-model="gender" value="male" input-id="gender-male" />
                  <label for="gender-male" class="cursor-pointer">男性</label>
                </div>
                <div class="flex items-center gap-2 text-sm text-[#334155]">
                  <RadioButton v-model="gender" value="female" input-id="gender-female" />
                  <label for="gender-female" class="cursor-pointer">女性</label>
                </div>
                <div class="flex items-center gap-2 text-sm text-[#334155]">
                  <RadioButton v-model="gender" value="other" input-id="gender-other" />
                  <label for="gender-other" class="cursor-pointer">其他</label>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm text-[#334155]">生日</label>
              <DatePicker
                v-model="birthday"
                date-format="yy-mm-dd"
                show-icon
                icon-display="input"
                :max-date="new Date()"
                class="w-[200px]"
              />
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <Button :disabled="!profileDirty" label="儲存修改" @click="saveProfile" />
          </div>
        </section>

        <!-- 手機號碼 -->
        <section class="bg-white rounded-[12px] shadow-card card-pad">
          <div class="flex flex-col gap-4 max-w-[440px]">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm text-[#334155]">手機號碼</label>
              <div class="flex gap-2">
                <Select v-model="phoneCode" :options="phoneCodes" class="w-[110px]" />
                <InputText v-model="phone" type="tel" class="flex-1" />
              </div>
            </div>
            <div class="flex gap-2">
              <InputText
                v-model="verifyCode"
                placeholder="請輸入六位數驗證碼"
                maxlength="6"
                class="flex-1"
              />
              <Button
                :disabled="codeCountdown > 0"
                :label="codeCountdown > 0 ? `${codeCountdown}s 後重新發送` : '發送驗證碼'"
                severity="secondary"
                outlined
                class="whitespace-nowrap"
                @click="sendVerifyCode"
              />
            </div>
          </div>
          <div class="flex justify-end mt-6">
            <Button :disabled="!phoneDirty" label="儲存修改" @click="savePhone" />
          </div>
        </section>

        <!-- Email -->
        <section class="bg-white rounded-[12px] shadow-card card-pad">
          <div class="flex flex-col gap-1.5 max-w-[440px]">
            <label class="text-sm text-[#334155]">Email</label>
            <InputText v-model="email" type="email" class="w-full" />
          </div>
          <div class="flex justify-end mt-6">
            <Button :disabled="!emailDirty" label="儲存修改" @click="saveEmail" />
          </div>
        </section>
      </template>

      <!-- 更改綁定帳號 -->
      <section v-else-if="activeSub === 'binding'" class="bg-white rounded-[12px] shadow-card card-pad">
        <h2 class="text-lg font-bold text-[#020617]">更改綁定帳號</h2>
        <p class="text-sm mt-1" style="color: #ef4444">請確保此帳號為您本人使用，避免造成資料安全風險。</p>

        <div class="mt-4 flex items-start gap-2 px-4 py-3 rounded-[6px] text-sm" style="background: #fffbeb; border: 1px solid #fde68a; color: #92400e">
          <i class="pi pi-exclamation-triangle mt-0.5 shrink-0" />
          <span>您的檔案尚未綁定電話號碼驗證，為保護帳戶安全請先驗證電話號碼，完成安全設置。</span>
        </div>

        <div class="mt-4 flex flex-col">
          <div
            v-for="(acc, ai) in socialAccounts"
            :key="acc.key"
            class="flex items-center justify-between gap-4 py-4"
            :class="ai !== socialAccounts.length - 1 ? 'border-b border-[#e2e8f0]' : ''"
          >
            <div class="flex items-center gap-3 min-w-0">
              <img
                :src="socialIconSrc(acc.icon)"
                :alt="acc.label"
                class="w-8 h-8 object-contain shrink-0"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-[#334155]">{{ acc.label }}</p>
                <p v-if="acc.bound && acc.accountId" class="text-xs text-[#64748b]">{{ acc.idLabel }}: {{ acc.accountId }}</p>
                <p v-else class="text-xs text-[#94a3b8]">尚未綁定</p>
              </div>
            </div>
            <Button
              :label="acc.bound ? '已綁定' : '未綁定'"
              :icon="acc.bound ? 'pi pi-link' : 'pi pi-times-circle'"
              :severity="acc.bound ? 'primary' : 'secondary'"
              outlined
              size="small"
              class="shrink-0"
              @click="toggleBind(acc)"
            />
          </div>
        </div>
      </section>

      <!-- 收件地址 -->
      <section v-else-if="activeSub === 'address'" class="bg-white rounded-[12px] shadow-card card-pad">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-[#020617]">收件地址</h2>
            <p class="text-sm text-[#64748b] mt-1">請確保此帳號為您本人使用，避免造成資料安全風險。</p>
          </div>
          <Button
            :label="addressTab === 'home' ? '新增地址' : '新增門市'"
            icon="pi pi-plus"
            class="shrink-0"
            @click="openAddAddr"
          />
        </div>

        <!-- Tabs -->
        <div class="flex items-center gap-6 mt-4 border-b border-[#e2e8f0]">
          <button
            class="flex items-center gap-2 pb-2 text-sm font-medium transition-colors -mb-px border-b-2"
            :style="addressTab === 'home'
              ? 'color: var(--primary); border-color: var(--primary)'
              : 'color: #64748b; border-color: transparent'"
            @click="addressTab = 'home'"
          >
            <i class="pi pi-truck text-sm" />
            宅配地址
          </button>
          <button
            class="flex items-center gap-2 pb-2 text-sm font-medium transition-colors -mb-px border-b-2"
            :style="addressTab === 'store'
              ? 'color: var(--primary); border-color: var(--primary)'
              : 'color: #64748b; border-color: transparent'"
            @click="addressTab = 'store'"
          >
            <i class="pi pi-shopping-bag text-sm" />
            超商門市
          </button>
        </div>

        <!-- Address list -->
        <div class="flex flex-col gap-3 mt-4">
          <div
            v-for="addr in currentAddrs"
            :key="addr.id"
            class="rounded-[10px] p-4 flex items-start justify-between gap-4"
            :style="addr.isDefault ? 'background: var(--primary-surface)' : 'background: white; border: 1px solid #e2e8f0'"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="font-bold text-[#334155]">{{ addr.name }}</span>
                <span class="text-sm text-[#334155]">{{ addr.phone }}</span>
                <span v-if="addr.isDefault" class="px-2 py-0.5 rounded text-[12px] font-medium" style="background: var(--primary); color: white">預設</span>
              </div>

              <!-- Store: chain logo + store name -->
              <div v-if="addr.chain" class="flex items-center gap-2 mt-2">
                <i class="pi pi-map-marker text-xs shrink-0 text-[#64748b]" />
                <img
                  :src="addr.chain === '7-11' ? sevenIcon : familyIcon"
                  :alt="addr.chain"
                  class="w-7 h-7 object-contain shrink-0"
                />
                <span class="text-sm font-medium text-[#334155]">{{ addr.storeName }}</span>
              </div>
              <div v-if="addr.chain" class="text-sm text-[#334155] mt-1 ml-[26px]">{{ addr.address }}</div>

              <!-- Home: plain address -->
              <div v-else class="flex items-center gap-1 text-sm text-[#334155] mt-2">
                <i class="pi pi-map-marker text-xs shrink-0" />
                {{ addr.address }}
              </div>
            </div>
            <!-- 手機：編輯 / 刪除一排、設為預設在下方；@3xl 以上同一列 -->
            <div class="flex flex-col @3xl:flex-row items-end @3xl:items-center gap-2 shrink-0">
              <div class="flex items-center gap-2">
                <Button icon="pi pi-pencil" severity="secondary" outlined size="small" @click="openEditAddr(addr)" />
                <Button icon="pi pi-trash" severity="danger" outlined size="small" @click="askDeleteAddr(addr.id)" />
              </div>
              <Button v-if="!addr.isDefault" label="設為預設" outlined size="small" class="whitespace-nowrap" @click="setDefaultAddr(addr.id)" />
            </div>
          </div>

          <div v-if="currentAddrs.length === 0" class="text-sm text-[#64748b] py-8 text-center">
            尚無{{ addressTab === 'home' ? '宅配' : '超商' }}地址
          </div>
        </div>
      </section>

      <!-- 更改密碼 -->
      <section v-else-if="activeSub === 'password'" class="bg-white rounded-[12px] shadow-card card-pad">
        <h2 class="text-lg font-bold text-[#020617]">更改密碼</h2>
        <p class="text-sm text-[#64748b] mt-1">為了保障您的帳號安全，建議定期更換強度較高的密碼。</p>

        <div class="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-[6px] text-sm" style="background:#eff6ff; border:1px solid #bfdbfe; color:#1d4ed8">
          <i class="pi pi-exclamation-triangle shrink-0" />
          密碼安全性要求：8-20 位英數字組合
        </div>

        <div class="mt-5 flex flex-col gap-4 max-w-[440px]">
          <!-- Current password -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-[#334155]">目前密碼</label>
            <Password v-model="pwCurrent" :feedback="false" toggle-mask placeholder="請輸入目前密碼" fluid input-class="w-full" />
          </div>

          <!-- New password -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-[#334155]">新密碼</label>
            <Password v-model="pwNew" :feedback="false" toggle-mask :invalid="!!pwNew && !pwNewValid" placeholder="請輸入新密碼" fluid input-class="w-full" />
            <p v-if="pwNew && !pwNewValid" class="text-sm" style="color:#ef4444">需 8-20 位、且含英文與數字</p>
          </div>

          <!-- Confirm password -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-[#334155]">確認新密碼</label>
            <Password v-model="pwConfirm" :feedback="false" toggle-mask :invalid="pwMismatch" placeholder="請再次輸入新密碼" fluid input-class="w-full" />
            <p v-if="pwMismatch" class="text-sm" style="color:#ef4444">兩次密碼輸入不一致</p>
          </div>
        </div>

        <div class="flex justify-end mt-6">
          <Button :disabled="!canChangePw" label="儲存修改" @click="changePassword" />
        </div>
      </section>

      <!-- Placeholder for other sub-pages -->
      <section v-else class="bg-white rounded-[12px] shadow-card card-pad">
        <p class="text-sm text-[#64748b]">此功能尚未開放</p>
      </section>

      </div>
    </main>

    <!-- 手機底部固定 bar：4 個主分頁（我的訂單 / 紅利點數 / 交易記錄查詢 / 個人帳號） -->
    <nav class="@4xl:hidden sticky bottom-0 z-30 bg-white border-t border-[#e2e8f0] flex">
      <button
        v-for="item in navItems"
        :key="item.key"
        class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
        :style="activeNav === item.key ? 'color: var(--primary)' : 'color: #64748b'"
        @click="activeNav = item.key; if (item.key === 'account' && !activeSub) activeSub = 'profile'"
      >
        <MemberIcon :name="(item.key as 'orders' | 'points' | 'transactions' | 'account')" :size="22" />
        <span class="text-[11px] font-medium">{{ item.label }}</span>
      </button>
    </nav>

    <!-- Add / Edit address dialog -->
    <Dialog
      v-model:visible="addrDrawerOpen"
      modal
      :draggable="false"
      :header="(addrDrawerMode === 'edit' ? '編輯' : '新增') + (addressTab === 'home' ? '宅配地址' : '超商門市')"
      :style="{ width: addrDialogWidth }"
    >
      <div class="flex flex-col gap-4">
        <!-- Store: chain picker -->
        <div v-if="addressTab === 'store'" class="flex flex-col gap-2">
          <label class="text-sm text-[#334155]">選擇超商</label>
          <div class="flex gap-3">
            <button
              class="w-16 h-12 rounded-md border-2 flex items-center justify-center bg-white transition-all"
              :style="form.chain === '7-11' ? 'border-color: var(--primary)' : 'border-color:#e2e8f0'"
              @click="form.chain = '7-11'"
            >
              <img :src="sevenIcon" alt="7-11" class="w-7 h-7 object-contain" />
            </button>
            <button
              class="w-16 h-12 rounded-md border-2 flex items-center justify-center bg-white transition-all"
              :style="form.chain === 'FamilyMart' ? 'border-color: var(--primary)' : 'border-color:#e2e8f0'"
              @click="form.chain = 'FamilyMart'"
            >
              <img :src="familyIcon" alt="FamilyMart" class="w-7 h-7 object-contain" />
            </button>
          </div>
        </div>

        <div v-if="addressTab === 'store'" class="flex flex-col gap-1.5">
          <label class="text-sm text-[#334155]">門市名稱<span style="color:#ef4444"> *</span></label>
          <InputText v-model="form.storeName" placeholder="例：鑫工門市" class="w-full" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-[#334155]">收件人姓名<span style="color:#ef4444"> *</span></label>
          <InputText v-model="form.name" placeholder="請輸入收件人姓名" class="w-full" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-[#334155]">收件人電話<span style="color:#ef4444"> *</span></label>
          <div class="flex gap-2">
            <Select v-model="form.countryCode" :options="phoneCodes" class="w-[120px]" />
            <InputText v-model="form.phone" type="tel" placeholder="請輸入電話號碼" class="flex-1" />
          </div>
        </div>

        <!-- Home: city/district -->
        <div v-if="addressTab === 'home'" class="flex flex-col gap-1.5">
          <label class="text-sm text-[#334155]">城市 / 區</label>
          <div class="flex gap-2">
            <Select v-model="form.city" :options="cities" class="flex-1" />
            <Select v-model="form.district" :options="districts" class="flex-1" />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-[#334155]">
            {{ addressTab === 'home' ? '詳細收件地址' : '門市地址' }}<span style="color:#ef4444"> *</span>
          </label>
          <InputText
            v-model="form.detail"
            :placeholder="addressTab === 'home' ? '街道、門牌、樓層' : '門市完整地址'"
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button label="取消" severity="secondary" outlined @click="addrDrawerOpen = false" />
        <Button :disabled="!formValid" :label="addrDrawerMode === 'edit' ? '儲存' : '確認新增'" @click="saveAddr" />
      </template>
    </Dialog>

    <!-- 刪除地址確認彈窗 -->
    <Dialog
      v-model:visible="deleteConfirmOpen"
      modal
      :draggable="false"
      :header="addressTab === 'home' ? '刪除宅配地址' : '刪除超商門市'"
      :style="{ width: '20rem' }"
    >
      <p class="text-sm text-[#334155] leading-relaxed">確定要刪除這筆{{ addressTab === 'home' ? '宅配地址' : '超商門市' }}嗎？此操作無法復原。</p>
      <template #footer>
        <Button label="取消" severity="secondary" outlined @click="deleteConfirmOpen = false" />
        <Button label="刪除" severity="danger" @click="confirmDeleteAddr" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.shadow-card {
  box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1);
}
</style>
