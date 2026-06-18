<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import { useViewportStore } from '../stores/viewport'
import { useUiStore } from '../stores/ui'
import { useCartStore } from '../stores/cart'
import { useOrdersStore } from '../stores/orders'

const viewportStore = useViewportStore()
const isMobile = computed(() => viewportStore.current.id === 'mobile')
const isPC = computed(() => viewportStore.current.id === 'pc')
// 抽屜（優惠券／運送方式）：平板與電腦版固定 680px，手機符合容器寬
/** 手機尺寸抽屜寬度：
 * - 模擬器選了手機 → current.width 有值（390 等） → 用該寬度
 * - PC 視窗被縮到手機寬（auto-RWD）→ current.width 為 null → 回退用 frame 寬度（= 視窗寬）
 */
const drawerWidth = computed(() => {
  if (!isMobile.value) return '680px'
  const w = viewportStore.current.width
  return w ? `${w}px` : 'var(--frame-width, 100vw)'
})

const router = useRouter()
const ui = useUiStore()
const cartStore = useCartStore()
const ordersStore = useOrdersStore()

function placeOrder() {
  // 1) 把已勾選商品 + 付款 / 配送方式 寫入「我的訂單」與交易記錄
  const method = paymentMethods.find(m => m.value === paymentMethod.value)?.label ?? '線上信用卡'
  const orderItems = allItems.value.map(i => ({
    name: i.name,
    image: i.image,
    spec: i.spec.filter(s => s && s !== '預設').join(' / ') || '預設',
    price: i.price,
    qty: i.qty,
  }))
  ordersStore.placeOrder({
    items: orderItems,
    total: finalTotal.value,
    payment: method,
    delivery: shippingMethodLabel.value,
  })
  // 2) 只結清已購買（勾選）的商品，未勾選的留在購物車
  cartStore.groups.forEach(g => { g.items = g.items.filter(i => !i.checked) })
  cartStore.groups = cartStore.groups.filter(g => g.items.length > 0)
  ui.toast('訂單已成立，感謝您的購買！')
  router.push({ path: '/member', query: { tab: 'orders' } })
}

interface SubItem { name: string; image?: string; spec: string; qty: number }
interface Item {
  id: string
  productId?: number
  name: string
  image?: string
  spec: string[]
  qty: number
  price: number
  bundleItems?: SubItem[]
}

// 結帳頁不分賣場，攤平成單一商品明細（資料來源同購物車 store；只結帳已勾選商品）
const allItems = computed<Item[]>(() =>
  cartStore.groups.flatMap(g => g.items).filter(i => i.checked).map(i => ({
    id: i.id,
    productId: i.productId,
    name: i.name,
    image: i.image,
    spec: [i.spec],
    qty: i.qty,
    price: i.price,
    bundleItems: i.bundleItems,
  }))
)
const itemsSubtotal = computed(() => allItems.value.reduce((s, i) => s + i.price * i.qty, 0))

// 沒有任何已勾選商品時（例如直接打網址進來），導回購物車
onMounted(() => {
  if (allItems.value.length === 0) router.replace('/cart')
})


// Form state
const couponCode = ref('')
const invoiceCarrierType = ref('member-email')
const invoiceEmail = ref('abc@gmail.com')

// --- Coupon drawer ---
interface Coupon {
  id: string
  amount: string          // '折300' | '90%'
  title: string
  desc: string
  scope: string
  expiry: string
  disabled?: boolean
  disabledReason?: string
  applicableItemIds?: string[]   // 不填 = 全品項適用；有填則僅限指定商品
  minSpend?: number              // 使用門檻（訂單小計需達此金額）
}
const coupons = ref<Coupon[]>([
  { id: 'cp1', amount: '折100', title: '滿千折百優惠券（滿1000元使用）', desc: '活動訂單滿 $1000 現折 $100', scope: '適用範圍（直播場次）：我是直播場次-2025-12-24', expiry: '有效期限至 2026.01.20 23:00', minSpend: 1000 },
  { id: 'cp2', amount: '50%', title: '滿千五折（滿1000元使用）', desc: '活動訂單滿 $1000 打5折', scope: '適用範圍(粉絲團貼文)：我是粉絲團貼文-2025-12-24', expiry: '有效期限至 2026.01.20 23:00', minSpend: 1000 },
  { id: 'cp4', amount: '折50', title: '指定童裝折50（限單一商品）', desc: '指定洋裝商品現折 $50', scope: '適用商品：韓版泡泡袖針織洋裝', expiry: '有效期限至 2026.01.20 23:00', applicableItemIds: ['i2'] },
  { id: 'cp5', amount: '折80', title: '組合商品專屬折80（限單一商品）', desc: '指定組合商品現折 $80', scope: '適用商品：包屁衣韓版小洋裝雙件組', expiry: '有效期限至 2026.01.20 23:00', applicableItemIds: ['i1'] },
  { id: 'cp3', amount: '折300', title: '滿三千折三百（滿3000元使用）', desc: '常客單筆滿 $3000 現折 $300', scope: '適用範圍：全站', expiry: '有效期限至 2026.01.20 23:00', minSpend: 3000 },
])
const couponDrawerOpen = ref(false)
const couponDrawerSelected = ref<string | null>(null)

// 優惠券是否可用（未達門檻或停用則不可用）
function isCouponUsable(c: Coupon) {
  return !c.disabled && itemsSubtotal.value >= (c.minSpend ?? 0)
}
function couponUnusableReason(c: Coupon) {
  if (c.disabled) return c.disabledReason ?? '不可使用'
  if (c.minSpend && itemsSubtotal.value < c.minSpend) return '金額未達門檻'
  return ''
}
// 某張券對目前購物車可折抵的金額（一次性面額，不乘數量）
function discountOf(c: Coupon): number {
  if (!isCouponUsable(c)) return 0
  if (c.applicableItemIds) {
    const target = allItems.value.find(i => c.applicableItemIds!.includes(i.id))
    if (!target) return 0
    const line = target.price * target.qty
    const fixed = c.amount.match(/折(\d+)/)
    if (fixed) return Math.min(line, Number(fixed[1]))
    const pct = c.amount.match(/(\d+)%/)
    if (pct) return Math.round(line * (100 - Number(pct[1])) / 100)
    return 0
  }
  const fixed = c.amount.match(/折(\d+)/)
  if (fixed) return Number(fixed[1])
  const pct = c.amount.match(/(\d+)%/)
  if (pct) return Math.round(itemsSubtotal.value * (100 - Number(pct[1])) / 100)
  return 0
}

// 自動挑選折抵最多的可用券；使用者手動選擇後改用手動值
const manualCouponId = ref<string | null>(null)
const bestCouponId = computed(() => {
  const usable = coupons.value.filter(isCouponUsable)
  if (!usable.length) return null
  return usable.reduce((best, c) => discountOf(c) > discountOf(best) ? c : best).id
})
const appliedCouponId = computed(() => manualCouponId.value ?? bestCouponId.value)
const appliedCoupon = computed(() => coupons.value.find(c => c.id === appliedCouponId.value) ?? null)
// 抽屜顯示排序：可用的優先，折抵多的排前面（最優惠在第一個）
const sortedCoupons = computed(() =>
  [...coupons.value].sort((a, b) => {
    const ua = isCouponUsable(a), ub = isCouponUsable(b)
    if (ua !== ub) return ua ? -1 : 1
    return discountOf(b) - discountOf(a)
  })
)
// 指定商品券：判斷某商品是否在適用範圍內（無 applicableItemIds = 全品項適用）
function couponAppliesTo(itemId: string) {
  const c = appliedCoupon.value
  if (!c || !c.applicableItemIds) return true
  return c.applicableItemIds.includes(itemId)
}
// 該商品整列金額（單價 × 數量）
function lineTotal(item: Item) {
  return item.price * item.qty
}
// 指定商品券折抵後的整列金額；非該指定商品回傳 null（券面額一次性折抵整列）
function discountedLineTotal(item: Item): number | null {
  const c = appliedCoupon.value
  if (!c || !c.applicableItemIds || !c.applicableItemIds.includes(item.id)) return null
  return Math.max(0, lineTotal(item) - discountOf(c))
}
// 商品明細小計：以折抵後的整列金額加總，與每列顯示及底下總計同步
const itemsDisplayTotal = computed(() =>
  allItems.value.reduce((s, i) => s + (discountedLineTotal(i) ?? lineTotal(i)), 0)
)

function openCouponDrawer() {
  couponDrawerSelected.value = appliedCouponId.value ?? coupons.value.find(isCouponUsable)?.id ?? null
  couponDrawerOpen.value = true
}
function confirmCouponDrawer() {
  manualCouponId.value = couponDrawerSelected.value
  couponDrawerOpen.value = false
  ui.toast('已套用選擇的優惠券')
}

function applyCouponCode() {
  if (!couponCode.value.trim()) return
  ui.toast('已套用選擇的優惠券')
}

// QR 掃描優惠券：mock 用一個小 dialog 模擬相機畫面，按「已掃描」自動填入優惠代碼
const couponScannerOpen = ref(false)
function openCouponScanner(): void { couponScannerOpen.value = true }
function fakeScanResult(): void {
  couponCode.value = `QR${Math.floor(100000 + Math.random() * 900000)}`
  couponScannerOpen.value = false
  applyCouponCode()
}

// --- Shipping drawer ---
interface HomeAddress { id: string; name: string; phone: string; address: string; isDefault: boolean; unavailable?: boolean }
interface StoreAddress { id: string; name: string; phone: string; chain: '7-11' | 'FamilyMart'; storeName: string; address: string; isDefault: boolean }

type ShipDrawerView = 'list' | 'add-home' | 'add-store'
type ShipMethod = 'home' | 'store' | null

const shipDrawerOpen = ref(false)
const shipDrawerView = ref<ShipDrawerView>('list')
const shipMethod = ref<ShipMethod>('home')
const homeAddresses = ref<HomeAddress[]>([
  { id: 'h1', name: '王小明', phone: '+886 912****56', address: '台北市信義區忠孝東路五段 100 號 10 樓', isDefault: true },
  { id: 'h2', name: '王小明', phone: '+886 912****56', address: '高雄市前鎮區中山路一段 50 號 8 樓', isDefault: false, unavailable: true },
])
const storeAddresses = ref<StoreAddress[]>([
  { id: 's1', name: '王小明', phone: '+886 912****56', chain: '7-11', storeName: '雄鎮門市', address: '806高雄市前鎮區東一街7號', isDefault: true },
  { id: 's2', name: '王小明', phone: '+886 912****56', chain: 'FamilyMart', storeName: '平鎮上海店', address: '324桃園市平鎮區上海路205號', isDefault: false },
])
const selectedHomeId = ref<string | null>('h1')
const selectedStoreId = ref<string | null>('s1')

function openShipDrawer() {
  shipDrawerView.value = 'list'
  shipDrawerOpen.value = true
}
function setDefaultHome(id: string) {
  homeAddresses.value.forEach(a => { a.isDefault = a.id === id })
}
function setDefaultStore(id: string) {
  storeAddresses.value.forEach(a => { a.isDefault = a.id === id })
}
function deleteHome(id: string) {
  const wasDefault = homeAddresses.value.find(a => a.id === id)?.isDefault
  homeAddresses.value = homeAddresses.value.filter(a => a.id !== id)
  if (wasDefault && homeAddresses.value.length > 0 && !homeAddresses.value.some(a => a.isDefault)) {
    homeAddresses.value[0].isDefault = true
  }
  if (selectedHomeId.value === id) selectedHomeId.value = homeAddresses.value[0]?.id ?? null
}
function deleteStore(id: string) {
  const wasDefault = storeAddresses.value.find(a => a.id === id)?.isDefault
  storeAddresses.value = storeAddresses.value.filter(a => a.id !== id)
  if (wasDefault && storeAddresses.value.length > 0 && !storeAddresses.value.some(a => a.isDefault)) {
    storeAddresses.value[0].isDefault = true
  }
  if (selectedStoreId.value === id) selectedStoreId.value = storeAddresses.value[0]?.id ?? null
}

// Add-home form
const newHomeName = ref('')
const newHomeCountryCode = ref('+886')
const newHomePhone = ref('')
const newHomeCountry = ref('台灣')
const newHomeCity = ref('高雄市')
const newHomeDistrict = ref('前鎮區')
const newHomeAddress = ref('')
function resetAddHomeForm() {
  newHomeName.value = ''
  newHomePhone.value = ''
  newHomeAddress.value = ''
}
function submitAddHome() {
  if (!newHomeName.value.trim()) return
  const isTW = newHomeCountry.value === '台灣'
  const address = isTW
    ? `${newHomeCity.value}${newHomeDistrict.value} ${newHomeAddress.value}`
    : `${newHomeCountry.value} ${newHomeAddress.value}`
  homeAddresses.value.push({
    id: 'h' + (homeAddresses.value.length + 1),
    name: newHomeName.value,
    phone: `${newHomeCountryCode.value} ${newHomePhone.value || '000****00'}`,
    address,
    isDefault: false,
  })
  resetAddHomeForm()
  shipDrawerView.value = 'list'
}

// Add-store form
const newStoreChain = ref<'7-11' | 'FamilyMart' | null>(null)
const newStoreName = ref('王小明')
const newStorePhone = ref('09123456')
const pickedStoreName = ref('')
const pickedStoreAddr = ref('')
function pickChain(c: '7-11' | 'FamilyMart') {
  newStoreChain.value = c
  // mock: simulate map picker
  if (c === '7-11') { pickedStoreName.value = '7-11 鑫工門市'; pickedStoreAddr.value = '台北市信義區忠孝東路五段 100 號 10 樓' }
  else { pickedStoreName.value = '全家 上海店'; pickedStoreAddr.value = '324桃園市平鎮區上海路205號' }
}
function resetAddStoreForm() {
  newStoreChain.value = null
  pickedStoreName.value = ''
  pickedStoreAddr.value = ''
}
function submitAddStore() {
  if (!newStoreChain.value || !pickedStoreName.value) return
  storeAddresses.value.push({
    id: 's' + (storeAddresses.value.length + 1),
    name: newStoreName.value,
    phone: `+886 ${newStorePhone.value.replace(/(\d{3})\d+(\d{2})/, '$1****$2')}`,
    chain: newStoreChain.value,
    storeName: pickedStoreName.value,
    address: pickedStoreAddr.value,
    isDefault: false,
  })
  resetAddStoreForm()
  shipDrawerView.value = 'list'
}

const shippingFee = computed(() => {
  if (shipMethod.value === 'home') return 150
  if (shipMethod.value === 'store') return 60
  return 0
})
const shippingMethodLabel = computed(() => {
  if (shipMethod.value === 'home') return '宅配'
  if (shipMethod.value === 'store') return '超商配送'
  return '請選擇'
})
const selectedHome = computed(() => homeAddresses.value.find(a => a.id === selectedHomeId.value))
const selectedStore = computed(() => storeAddresses.value.find(a => a.id === selectedStoreId.value))

const rewardPoints = ref<number | null>(null)
const paymentMethod = ref('credit')

const invoiceCarriers = [
  { label: '會員載具（電子信箱）', value: 'member-email' },
  { label: '手機條碼', value: 'mobile' },
  { label: '自然人憑證', value: 'natural' },
]
const paymentMethods = [
  { label: '線上信用卡', value: 'credit' },
  { label: 'ATM 轉帳', value: 'atm' },
  { label: '貨到付款', value: 'cod' },
]
const drawerCountryCodes = ['+886', '+852']
const drawerCountries = ['台灣', '香港']
const drawerCities = ['高雄市', '台北市', '桃園市']
const drawerDistricts = ['前鎮區', '三民區', '信義區']

// Money breakdown（商品總金額同明細小計，其餘折抵為 mock）
const productTotal = computed(() => itemsSubtotal.value)
const shippingTotal = computed(() => shippingFee.value + 100) // 100 = other group fee
const multiItemDiscount = -100
const shippingDiscount = -200
// 優惠券折扣：一張券只折一筆（指定商品券折該品、整單券折全單）
const couponDiscount = computed(() => appliedCoupon.value ? -discountOf(appliedCoupon.value) : 0)
const rewardPointsNum = computed(() => Math.max(0, Number(rewardPoints.value) || 0))
const finalTotal = computed(() =>
  productTotal.value + shippingTotal.value + multiItemDiscount + shippingDiscount + couponDiscount.value
  - rewardPointsNum.value
)
const totalSaved = computed(() =>
  Math.abs(multiItemDiscount + shippingDiscount + couponDiscount.value) + rewardPointsNum.value
)
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <!-- Page header -->
    <div>
      <div class="max-w-[1280px] mx-auto px-4 py-[22px] flex items-center gap-3">
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded @click="router.back()" />
        <h1 class="font-bold text-[#020617] text-2xl">結帳</h1>
      </div>
    </div>

    <main class="flex-1 max-w-[1280px] w-full mx-auto flex flex-col" :style="{ padding: `0 ${isPC ? '0' : 'var(--page-pad-x)'} 120px`, gap: 'var(--stack-gap)' }">
      <!-- 商品明細（不分賣場，單一列表） -->
      <section class="bg-white rounded-[12px] shadow-card">
        <div class="px-4 py-3 cart-divider">
          <span class="font-medium text-[#334155]">商品明細</span>
        </div>
        <div
          v-for="(item, ii) in allItems"
          :key="item.id"
          :class="ii !== allItems.length - 1 ? 'cart-divider' : ''"
        >
          <div class="flex items-start gap-4 px-4 py-3">
            <div class="shrink-0 w-[56px] h-[56px] rounded-[4px] overflow-hidden">
              <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-0.5">
                <i class="pi pi-hammer text-gray-300 text-lg" />
                <span class="text-gray-400 text-[10px]">圖片施工中</span>
              </div>
            </div>
            <div class="flex-1 min-w-0 flex flex-col gap-1">
              <p class="font-semibold text-[16px] text-[#334155] truncate">{{ item.name }}</p>
              <!-- 規格列：組合商品的規格寫在底下子品，這裡不重複顯示 -->
              <template v-if="!item.bundleItems">
                <template v-for="(s, si) in item.spec" :key="si">
                  <div v-if="s && s !== '預設'" class="flex gap-4 text-[14px] text-[#334155]">
                    <span class="shrink-0">規格</span>
                    <span class="truncate">{{ s }}</span>
                  </div>
                </template>
              </template>
              <div class="flex gap-4 text-[14px] text-[#334155]">
                <span>數量</span><span>{{ item.qty }}</span>
              </div>
            </div>
            <div class="shrink-0 text-right flex flex-col items-end gap-0.5">
              <template v-if="discountedLineTotal(item) !== null">
                <Tag
                  :value="'已套用 ' + appliedCoupon?.amount"
                  severity="success"
                  class="!text-[11px] !py-0.5"
                />
                <span class="text-[13px] text-[#94a3b8] line-through">${{ lineTotal(item).toLocaleString() }}</span>
                <span class="font-bold text-[16px]" style="color: var(--primary)">${{ discountedLineTotal(item)?.toLocaleString() }}</span>
              </template>
              <template v-else>
                <Tag
                  v-if="appliedCoupon && !couponAppliesTo(item.id)"
                  value="本券不適用"
                  severity="secondary"
                  class="!text-[11px] !py-0.5 !bg-[#f1f5f9] !text-[#94a3b8]"
                />
                <span class="text-[#334155] font-medium">${{ lineTotal(item).toLocaleString() }}</span>
              </template>
            </div>
          </div>

          <!-- Bundle（不可收合，直接列出；左緣對齊「數量」label） -->
          <div v-if="item.bundleItems" class="pl-[88px] pr-4 pb-4">
            <p class="text-[14px] text-[#334155] leading-relaxed">
              <span class="font-medium">組合商品內容：</span>{{ item.bundleItems.map(s => `${s.name}${s.spec && s.spec !== '預設' ? ` - ${s.spec}` : ''} ×${s.qty * item.qty}`).join('、') }}
            </p>
          </div>
        </div>

        <div class="cart-divider-top flex items-center justify-end gap-4 px-4 py-4">
          <span class="text-[14px] text-[#334155]">訂單金額小計 ({{ allItems.length }}個商品)</span>
          <span class="text-[24px] font-bold" style="color: var(--primary)">${{ itemsDisplayTotal.toLocaleString() }}</span>
        </div>
      </section>

      <!-- Coupon -->
      <section
        class="bg-white rounded-[12px] shadow-card card-pad gap-4"
        :class="isMobile ? 'flex flex-col' : 'flex items-center justify-between flex-wrap'"
      >
        <span class="font-medium text-[#334155]">優惠券</span>
        <div
          class="gap-3"
          :class="isMobile ? 'flex flex-col w-full' : 'flex items-center flex-wrap'"
        >
          <span v-if="appliedCoupon" class="flex items-center gap-1.5 text-sm" style="color: #16a34a">
            <i class="pi pi-check-circle" />
            已套用『{{ appliedCoupon.title }}』
            <span v-if="!manualCouponId" class="text-[12px] text-[#94a3b8]">（已自動套用最優惠）</span>
          </span>
          <!-- 第一行：選擇可使用優惠券（手機獨佔一列） -->
          <Button label="選擇可使用優惠券" :class="isMobile ? '!w-full' : ''" @click="openCouponDrawer" />
          <!-- 第二行（手機版）：輸入 + 掃描 QR 同列 -->
          <div :class="isMobile ? 'flex items-center gap-2 w-full' : 'flex items-center gap-3 flex-wrap'">
            <InputGroup :class="isMobile ? 'flex-1 min-w-0' : 'w-[260px]'">
              <InputText
                v-model="couponCode"
                placeholder="輸入優惠券優惠代碼"
                @keyup.enter="applyCouponCode"
              />
              <Button label="使用" severity="secondary" outlined @click="applyCouponCode" />
            </InputGroup>
            <Button
              v-if="isMobile"
              label="掃描"
              icon="pi pi-qrcode"
              severity="secondary"
              outlined
              class="shrink-0"
              @click="openCouponScanner"
            />
          </div>
        </div>
      </section>

      <!-- 配送資訊 -->
      <section class="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div class="px-4 py-3 cart-divider">
          <span class="font-medium text-[#334155]">配送資訊</span>
        </div>
        <div class="card-pad flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <span class="text-sm text-[#334155]">配送方式</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-[#334155]">{{ shippingMethodLabel }}</span>
            <Button
              label="選擇運送方式"
              icon="pi pi-chevron-right"
              icon-pos="right"
              link
              size="small"
              @click="openShipDrawer"
            />
          </div>
          <div class="text-sm text-[#334155] mt-1">配送地址</div>
          <div class="text-sm text-[#334155]" v-if="shipMethod === 'home' && selectedHome">
            {{ selectedHome.name }} {{ selectedHome.phone }} 　 {{ selectedHome.address }}
          </div>
          <div class="text-sm text-[#334155]" v-else-if="shipMethod === 'store' && selectedStore">
            {{ selectedStore.name }} {{ selectedStore.phone }} 　 {{ selectedStore.chain }} {{ selectedStore.storeName }}（{{ selectedStore.address }}）
          </div>
          <div class="text-sm text-[#64748b]" v-else>尚未選擇配送地址</div>
        </div>
      </section>

      <!-- 發票資訊 -->
      <section class="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div class="px-4 py-3 cart-divider">
          <span class="font-medium text-[#334155]">發票資訊</span>
        </div>
        <div class="card-pad flex flex-col gap-3 max-w-[440px]">
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[#334155]">發票載具</label>
            <Select v-model="invoiceCarrierType" :options="invoiceCarriers" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm text-[#334155]">Email</label>
            <InputText v-model="invoiceEmail" type="email" class="w-full" />
          </div>
        </div>
      </section>

      <!-- 金額折抵 -->
      <section class="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div class="px-4 py-3 cart-divider">
          <span class="font-medium text-[#334155]">金額折抵</span>
        </div>
        <div class="card-pad flex flex-col gap-4">
          <div class="flex flex-wrap items-center gap-2 text-sm text-[#334155]">
            <span class="font-medium w-[60px]">紅利點數</span>
            <span>使用</span>
            <InputNumber v-model="rewardPoints" :min="0" class="w-[160px]" />
            <span>點</span>
            <span class="text-[#64748b]">/ 尚有紅利點數 <span style="color: var(--primary)">100</span> 點可使用</span>
          </div>
        </div>
      </section>

      <!-- 付款方式 -->
      <section class="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div class="px-4 py-3 cart-divider">
          <span class="font-medium text-[#334155]">付款方式</span>
        </div>
        <div class="card-pad max-w-[440px]">
          <label class="text-sm text-[#334155] block mb-1">選擇付款方式</label>
          <Select v-model="paymentMethod" :options="paymentMethods" option-label="label" option-value="value" class="w-full" />
        </div>
      </section>

      <!-- 金額明細 -->
      <section class="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div class="card-pad grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
          <!-- 商品總金額 -->
          <div></div>
          <span class="text-[#334155]">商品總金額</span>
          <span class="text-[#334155] text-right min-w-[80px]">$ {{ productTotal.toLocaleString() }}</span>

          <!-- 運費總金額 -->
          <div></div>
          <span class="text-[#334155]">運費總金額</span>
          <span class="text-[#334155] text-right">$ {{ shippingTotal.toLocaleString() }}</span>

          <!-- 多件優惠折抵 -->
          <div></div>
          <span class="text-[#334155]">多件優惠折抵</span>
          <span class="text-right" style="color: #ef4444">- $ {{ Math.abs(multiItemDiscount).toLocaleString() }}</span>

          <!-- 符合『滿千免運』提示：手機獨佔一列在運費折抵上方；其他與運費折抵同一列 -->
          <template v-if="isMobile">
            <div class="col-span-3 flex justify-end items-center gap-1 text-[13px]" style="color: var(--primary)">
              <i class="pi pi-truck text-[12px]" />
              符合『滿千免運』
            </div>
            <div></div>
            <span class="text-[#334155]">運費折抵</span>
            <span class="text-right" style="color: #ef4444">- $ {{ Math.abs(shippingDiscount).toLocaleString() }}</span>
          </template>
          <template v-else>
            <span class="justify-self-end flex items-center gap-1 text-[13px]" style="color: var(--primary)">
              <i class="pi pi-truck text-[12px]" />
              符合『滿千免運』
            </span>
            <span class="text-[#334155]">運費折抵</span>
            <span class="text-right" style="color: #ef4444">- $ {{ Math.abs(shippingDiscount).toLocaleString() }}</span>
          </template>

          <!-- 已套用優惠券提示：手機獨佔一列在優惠券折扣上方；其他與折扣同一列 -->
          <template v-if="appliedCoupon">
            <template v-if="isMobile">
              <div class="col-span-3 flex justify-end items-center gap-1 text-[13px]" style="color: var(--primary)">
                <i class="pi pi-ticket text-[12px]" />
                已套用『{{ appliedCoupon.title }}』
              </div>
              <div></div>
              <span class="text-[#334155]">優惠券折扣</span>
              <span class="text-right" style="color: #ef4444">- $ {{ Math.abs(couponDiscount).toLocaleString() }}</span>
            </template>
            <template v-else>
              <span class="justify-self-end flex items-center gap-1 text-[13px]" style="color: var(--primary)">
                <i class="pi pi-ticket text-[12px]" />
                已套用『{{ appliedCoupon.title }}』
              </span>
              <span class="text-[#334155]">優惠券折扣</span>
              <span class="text-right" style="color: #ef4444">- $ {{ Math.abs(couponDiscount).toLocaleString() }}</span>
            </template>
          </template>

          <!-- 紅利點數 -->
          <template v-if="rewardPointsNum > 0">
            <div></div>
            <span class="text-[#334155]">紅利點數折抵</span>
            <span class="text-right" style="color: #ef4444">- $ {{ rewardPointsNum.toLocaleString() }}</span>
          </template>

          <!-- 總付款金額 -->
          <div></div>
          <span class="text-[#334155]">總付款金額</span>
          <span class="text-right font-medium" style="color: var(--primary)">$ {{ finalTotal.toLocaleString() }}</span>
        </div>
      </section>
    </main>

    <!-- Sticky footer -->
    <div class="sticky bottom-0 z-40 bg-white border-t border-b border-[#e2e8f0]">
      <div
        class="max-w-[1280px] mx-auto px-4 py-3 flex items-center justify-end gap-4"
        style="padding-bottom: max(12px, env(safe-area-inset-bottom))"
      >
        <div class="flex flex-col items-end leading-tight min-w-0">
          <div class="flex items-baseline gap-2 min-w-0">
            <span class="text-[#334155]" :class="isMobile ? 'text-sm' : 'text-[18px]'">總付款金額</span>
            <span class="font-bold truncate" :class="isMobile ? 'text-2xl' : 'text-[30px]'" style="color: var(--primary)">${{ finalTotal.toLocaleString() }}</span>
          </div>
          <span class="text-sm" style="color: #ef4444">共省下 -${{ totalSaved.toLocaleString() }}</span>
        </div>
        <Button label="去付款" class="!min-h-[48px] shrink-0" :class="isMobile ? '!px-6' : 'px-16'" @click="placeOrder" />
      </div>
    </div>

    <!-- ============== Coupon QR Scanner ============== -->
    <Dialog
      v-model:visible="couponScannerOpen"
      modal
      :draggable="false"
      :style="{
        width: isMobile ? 'calc(var(--frame-width, 100vw) - 32px)' : '360px',
        maxWidth: isMobile ? 'calc(var(--frame-width, 100vw) - 32px)' : '360px',
      }"
      :pt="{
        mask: {
          style: 'left: var(--frame-left, 0); width: var(--frame-width, 100vw); height: calc(100vh - var(--frame-bottom, 0px))',
        },
        header: { style: 'padding: 16px 20px' },
        content: { style: 'padding: 0 20px 16px' },
        footer: { style: 'padding: 12px 20px' },
      }"
    >
      <template #header>
        <span class="font-bold text-[#020617]" style="font-size: 16px">掃描優惠券 QR</span>
      </template>
      <div class="flex flex-col gap-3 items-center">
        <!-- 模擬相機畫面 -->
        <div class="relative w-full aspect-square rounded-[12px] bg-[#0f172a] overflow-hidden flex items-center justify-center">
          <!-- 角落 frame -->
          <span class="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl"></span>
          <span class="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr"></span>
          <span class="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl"></span>
          <span class="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br"></span>
          <!-- 掃描中間線 -->
          <span class="absolute left-6 right-6 h-px bg-[var(--primary)] shadow-[0_0_12px_2px_var(--primary)]"></span>
          <i class="pi pi-qrcode text-white/40" style="font-size: 64px"></i>
        </div>
        <p class="text-[13px] text-[#64748b] text-center">將 QR 對準畫面中央，自動辨識後即填入優惠代碼。</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <Button label="取消" severity="secondary" outlined @click="couponScannerOpen = false" />
          <Button label="模擬掃描成功" icon="pi pi-check" @click="fakeScanResult" />
        </div>
      </template>
    </Dialog>

    <!-- ============== Coupon Drawer ============== -->
    <Transition name="drawer-fade">
      <div v-if="couponDrawerOpen" class="drawer-backdrop" @click="couponDrawerOpen = false" />
    </Transition>
    <Transition name="drawer-slide">
      <div v-if="couponDrawerOpen" class="drawer-panel" :style="{ width: drawerWidth, maxWidth: '100vw' }">
        <div class="max-w-[680px] mx-auto px-4 pt-5 pb-5">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-[18px] text-[#020617]">可使用優惠券</h3>
            <Button icon="pi pi-times" severity="secondary" text rounded @click="couponDrawerOpen = false" />
          </div>

          <!-- Coupon list -->
          <div class="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
            <label
              v-for="c in sortedCoupons"
              :key="c.id"
              class="flex border border-[#e2e8f0] rounded-[10px]"
              :class="!isCouponUsable(c) ? 'cursor-not-allowed' : 'cursor-pointer hover:border-[var(--primary)]'"
            >
              <!-- Amount block -->
              <div
                class="shrink-0 flex items-center justify-center rounded-l-[10px]"
                :class="isMobile ? 'w-[76px] gap-1 px-2 py-3' : 'w-[140px] gap-2 px-3 py-4'"
                :style="!isCouponUsable(c) ? 'background: #f1f5f9' : 'background: #ede9fe'"
              >
                <i v-if="!isMobile" class="pi pi-gift text-[22px]" :style="!isCouponUsable(c) ? 'color: #94a3b8' : 'color: var(--primary)'" />
                <span class="font-bold" :class="isMobile ? 'text-[18px]' : 'text-[24px]'" :style="!isCouponUsable(c) ? 'color: #94a3b8' : 'color: var(--primary)'">{{ c.amount }}</span>
              </div>
              <!-- Detail block -->
              <div class="flex-1 min-w-0 flex flex-col gap-1" :class="isMobile ? 'px-3 py-3' : 'px-4 py-4'">
                <span v-if="isMobile && !isCouponUsable(c)" class="text-[12px] font-medium" style="color: #ef4444">{{ couponUnusableReason(c) }}</span>
                <p class="font-medium text-[15px] text-[#334155]">{{ c.title }}</p>
                <p class="text-[13px] text-[#475569]">{{ c.desc }}</p>
                <span class="self-start px-2 py-0.5 rounded text-[12px] break-words" style="background: #fce7f3; color: #be185d">{{ c.scope }}</span>
                <p class="text-[12px] text-[#64748b] mt-1">{{ c.expiry }}</p>
              </div>
              <!-- Right side: radio / disabled note（手機版未達門檻改顯示於名稱上方，這欄隱藏） -->
              <div
                v-if="!(isMobile && !isCouponUsable(c))"
                class="shrink-0 flex items-center justify-center text-center py-2"
                :class="isMobile ? 'w-[60px]' : 'w-[96px]'"
              >
                <span v-if="!isCouponUsable(c)" class="text-[13px]" style="color: #ef4444">{{ couponUnusableReason(c) }}</span>
                <RadioButton v-else v-model="couponDrawerSelected" :value="c.id" />
              </div>
            </label>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-2 mt-4">
            <Button label="取消" severity="secondary" outlined @click="couponDrawerOpen = false" />
            <Button label="確認" @click="confirmCouponDrawer" />
          </div>
        </div>
      </div>
    </Transition>

    <!-- ============== Shipping Drawer ============== -->
    <Transition name="drawer-fade">
      <div v-if="shipDrawerOpen" class="drawer-backdrop" @click="shipDrawerOpen = false" />
    </Transition>
    <Transition name="drawer-slide">
      <div v-if="shipDrawerOpen" class="drawer-panel" :style="{ width: drawerWidth, maxWidth: '100vw' }">
        <div class="max-w-[680px] mx-auto px-4 pt-5 pb-5">

          <!-- ===== View: list ===== -->
          <template v-if="shipDrawerView === 'list'">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-[18px] text-[#020617]">選擇運送方式</h3>
              <Button icon="pi pi-times" severity="secondary" text rounded @click="shipDrawerOpen = false" />
            </div>

            <div class="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              <!-- Home -->
              <div>
                <button
                  class="w-full flex items-center justify-between px-4 py-3 rounded-[6px]"
                  style="background: #f1f5f9"
                  @click="shipMethod = 'home'"
                >
                  <span class="text-[#334155] font-medium">宅配</span>
                  <span class="flex items-center gap-2 text-[#334155]">
                    $150
                    <i v-if="shipMethod === 'home'" class="pi pi-check" style="color: #16a34a" />
                  </span>
                </button>

                <div v-if="shipMethod === 'home'" class="mt-3 flex flex-col gap-2">
                  <div
                    v-for="addr in homeAddresses"
                    :key="addr.id"
                    class="flex items-start gap-3 px-2 py-2"
                  >
                    <RadioButton
                      :value="addr.id"
                      v-model="selectedHomeId"
                      :disabled="addr.unavailable"
                      class="mt-1"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 text-sm text-[#334155]">
                        <span class="font-medium">{{ addr.name }}</span>
                        <span>{{ addr.phone }}</span>
                        <span v-if="addr.isDefault" class="px-1.5 py-0.5 rounded text-[11px] font-medium" style="background: var(--primary); color: white">預設</span>
                      </div>
                      <div class="text-sm text-[#334155] mt-1 flex items-center gap-1">
                        <i class="pi pi-map-marker text-xs" />
                        {{ addr.address }}
                        <span v-if="addr.unavailable" class="ml-1" style="color: #ef4444">(目前不提供配送至此地區)</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <Button v-if="!addr.isDefault" label="設為預設" outlined size="small" @click="setDefaultHome(addr.id)" />
                      <Button label="刪除" severity="danger" outlined size="small" @click="deleteHome(addr.id)" />
                    </div>
                  </div>
                  <Button label="新增宅配地址" icon="pi pi-plus" severity="secondary" outlined class="w-full" @click="shipDrawerView = 'add-home'" />
                </div>
              </div>

              <!-- Store -->
              <div>
                <button
                  class="w-full flex items-center justify-between px-4 py-3 rounded-[6px]"
                  style="background: #f1f5f9"
                  @click="shipMethod = 'store'"
                >
                  <span class="text-[#334155] font-medium">超商配送</span>
                  <span class="flex items-center gap-2 text-[#334155]">
                    $60
                    <i v-if="shipMethod === 'store'" class="pi pi-check" style="color: #16a34a" />
                  </span>
                </button>

                <div v-if="shipMethod === 'store'" class="mt-3 flex flex-col gap-2">
                  <div
                    v-for="addr in storeAddresses"
                    :key="addr.id"
                    class="flex items-start gap-3 px-2 py-2"
                  >
                    <RadioButton
                      :value="addr.id"
                      v-model="selectedStoreId"
                      class="mt-1"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 text-sm text-[#334155]">
                        <span class="font-medium">{{ addr.name }}</span>
                        <span>{{ addr.phone }}</span>
                        <span v-if="addr.isDefault" class="px-1.5 py-0.5 rounded text-[11px] font-medium" style="background: var(--primary); color: white">預設</span>
                      </div>
                      <div class="text-sm text-[#334155] mt-1 flex items-center gap-2">
                        <span
                          class="inline-flex items-center justify-center w-9 h-6 rounded text-white text-[10px] font-bold"
                          :style="addr.chain === '7-11' ? 'background: #ee1c25' : 'background: #00a040'"
                        >{{ addr.chain === '7-11' ? '7-11' : 'FAMI' }}</span>
                        <span class="font-medium">{{ addr.storeName }}</span>
                      </div>
                      <div class="text-sm text-[#334155] mt-1 flex items-center gap-1 ml-11">
                        <i class="pi pi-map-marker text-xs" />
                        {{ addr.address }}
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <Button v-if="!addr.isDefault" label="設為預設" outlined size="small" @click="setDefaultStore(addr.id)" />
                      <Button label="刪除" severity="danger" outlined size="small" @click="deleteStore(addr.id)" />
                    </div>
                  </div>
                  <Button label="新增超商地址" icon="pi pi-plus" severity="secondary" outlined class="w-full" @click="shipDrawerView = 'add-store'" />
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-2 mt-4">
              <Button label="取消" severity="secondary" outlined @click="shipDrawerOpen = false" />
              <Button label="確認" @click="shipDrawerOpen = false" />
            </div>
          </template>

          <!-- ===== View: add-home ===== -->
          <template v-else-if="shipDrawerView === 'add-home'">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-[18px] text-[#020617]">新增宅配地址</h3>
              <Button icon="pi pi-times" severity="secondary" text rounded @click="shipDrawerView = 'list'" />
            </div>

            <div class="flex flex-col gap-3 max-w-[440px] mx-auto">
              <div class="flex flex-col gap-1">
                <label class="text-sm text-[#334155]">收件人姓名</label>
                <InputText v-model="newHomeName" class="w-full" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-[#334155]">收件人電話</label>
                <div class="flex gap-2">
                  <Select v-model="newHomeCountryCode" :options="drawerCountryCodes" class="w-[120px]" />
                  <InputText v-model="newHomePhone" type="tel" class="flex-1" />
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-[#334155]">國別</label>
                <Select v-model="newHomeCountry" :options="drawerCountries" class="w-full" />
              </div>
              <div v-if="newHomeCountry === '台灣'" class="flex flex-col gap-1">
                <label class="text-sm text-[#334155]">城市/區</label>
                <div class="flex gap-2">
                  <Select v-model="newHomeCity" :options="drawerCities" class="flex-1" />
                  <Select v-model="newHomeDistrict" :options="drawerDistricts" class="flex-1" />
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-[#334155]">詳細收件地址</label>
                <InputText v-model="newHomeAddress" class="w-full" />
              </div>
            </div>

            <div class="flex justify-end gap-2 mt-4">
              <Button label="取消" severity="secondary" outlined @click="shipDrawerView = 'list'" />
              <Button label="確認新增" @click="submitAddHome" />
            </div>
          </template>

          <!-- ===== View: add-store ===== -->
          <template v-else-if="shipDrawerView === 'add-store'">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-[18px] text-[#020617]">新增超商門市</h3>
              <Button icon="pi pi-times" severity="secondary" text rounded @click="shipDrawerView = 'list'" />
            </div>

            <div class="flex flex-col gap-4 max-w-[440px] mx-auto">
              <div class="flex flex-col gap-2">
                <label class="text-sm text-[#334155]">選擇超商</label>
                <div class="flex gap-3">
                  <button
                    class="w-16 h-12 rounded-md border-2 flex items-center justify-center text-white text-xs font-bold transition-all"
                    :style="newStoreChain === '7-11' ? 'border-color: var(--primary); background: #ee1c25' : 'border-color: transparent; background: #ee1c25'"
                    @click="pickChain('7-11')"
                  >7-ELEVEN</button>
                  <button
                    class="w-16 h-12 rounded-md border-2 flex items-center justify-center text-white text-xs font-bold transition-all"
                    :style="newStoreChain === 'FamilyMart' ? 'border-color: var(--primary); background: #00a040' : 'border-color: transparent; background: #00a040'"
                    @click="pickChain('FamilyMart')"
                  >Family</button>
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-[#334155]">選擇取件門市</label>
                <div v-if="!newStoreChain" class="font-bold text-[#334155]">請先選擇超商</div>
                <div v-else>
                  <p class="font-bold text-[#334155]">{{ pickedStoreName }}</p>
                  <p class="text-sm text-[#475569]">{{ pickedStoreAddr }}</p>
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-[#334155]">收件人姓名</label>
                <InputText v-model="newStoreName" class="w-full" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm text-[#334155]">收件人電話</label>
                <div class="flex gap-2">
                  <Select v-model="newHomeCountryCode" :options="drawerCountryCodes" class="w-[120px]" />
                  <InputText v-model="newStorePhone" type="tel" class="flex-1" />
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-2 mt-4">
              <Button label="取消" severity="secondary" outlined @click="shipDrawerView = 'list'" />
              <Button label="確認新增" @click="submitAddStore" />
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.shadow-card {
  box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.1);
}

.cart-divider,
.cart-divider-top {
  position: relative;
}
.cart-divider::after,
.cart-divider-top::before {
  content: '';
  position: absolute;
  left: var(--card-pad);
  right: var(--card-pad);
  height: 1px;
  background: #e2e8f0;
}
.cart-divider::after { bottom: 0; }
.cart-divider-top::before { top: 0; }

/* ===== Drawer ===== */
/*
 * 抽屜以 frame 的視覺座標定位：
 * - --frame-bottom：frame 底部到 viewport 底部的距離（由 App.vue JS 算）
 * - --frame-left / --frame-width：frame 在 viewport 的水平位置與寬度
 * 沒設定變數時 fallback 到視窗座標。
 */
.drawer-backdrop {
  position: fixed;
  top: 0;
  left: var(--frame-left, 0);
  width: var(--frame-width, 100vw);
  height: calc(100vh - var(--frame-bottom, 0px));
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
}

/* 視窗縮到手機寬時，不論模擬器是否選了固定寬度，遮罩都鋪滿整個視窗。
   抽屜本體已用 50vw 加 translateX(-50%) 置中，遮罩鋪滿不影響定位。 */
@media (max-width: 768px) {
  .drawer-backdrop {
    left: 0 !important;
    width: 100vw !important;
  }
  .drawer-panel {
    left: 50vw !important;
  }
}
.drawer-panel {
  position: fixed;
  left: calc(var(--frame-left, 0px) + var(--frame-width, 100vw) / 2);
  bottom: var(--frame-bottom, 0px);
  transform: translateX(-50%);
  z-index: 110;
  background: white;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translate(-50%, 100%);
}
</style>
