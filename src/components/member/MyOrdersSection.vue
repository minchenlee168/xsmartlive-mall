<script setup lang="ts">
import { computed, ref } from 'vue'
import { useViewportStore } from '../../stores/viewport'
import { useOrdersStore, type OrderRecord, type OrderItem, type PackageInfo, type TimelineStepKey, type DetailTab, type OrderStatus } from '../../stores/orders'
import ChangeAddressDialog from './ChangeAddressDialog.vue'

/**
 * 我的訂單 section（會員中心右側內容）。
 * 對齊 Figma 8845:44643：
 * - 上方「購物權益與售後說明」可收合面板
 * - 標題 + 7 個 tab + 日期區間 + 搜尋 + 查詢結果摘要
 * - 訂單卡（header table + 子 tab + 商品列 + timeline）
 * - 下方「配送、退款與發票說明」可收合面板
 */

const vp = computed(() => useViewportStore().current.id)
const isMobile = computed(() => vp.value === 'mobile')

// 上下兩個說明面板狀態
const topInfoOpen = ref(false)
const bottomInfoOpen = ref(false)

const ordersStore = useOrdersStore()

// 主 tab（退貨 / 退款相關 tab 已移除）
type StatusTab = 'all' | OrderStatus
const statusTabs: Array<{ key: StatusTab; label: string }> = [
  { key: 'all',          label: '所有訂單' },
  { key: 'unpaid',       label: '待付款' },
  { key: 'to_ship',      label: '待出貨' },
  { key: 'to_receive',   label: '待收貨' },
  { key: 'to_complete',  label: '待完成' },
  { key: 'cancelled',    label: '取消' },
]
const activeTab = ref<StatusTab>('all')

// 日期 / 搜尋（appliedXxx 為「按下查詢」後才更新的快照，
// 篩選邏輯只看 applied 值，輸入過程不會即時 refresh） */
const dateRange = ref<Array<Date | null>>([new Date('2026-01-06'), new Date('2026-02-04')])
const keyword = ref('')
const appliedDateRange = ref<Array<Date | null>>([dateRange.value[0], dateRange.value[1]])
const appliedKeyword = ref('')
function applyQuery(): void {
  appliedDateRange.value = [dateRange.value[0], dateRange.value[1]]
  appliedKeyword.value = keyword.value
}
/** 解析訂單 date 字串（格式："YYYY/MM/DD HH:mm"）→ Date */
function parseOrderDate(s: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(s)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

// 商品列子 tab
const detailTabs: Array<{ key: DetailTab; label: string }> = [
  { key: 'progress', label: '配送進度/明細' },
  { key: 'cancel',   label: '取消訂單' },
  { key: 'return',   label: '退貨' },
  { key: 'exchange', label: '換貨' },
  { key: 'inquiry',  label: '訂單提問' },
  { key: 'address',  label: '更換地址' },
  { key: 'payment',  label: '訂購/付款資訊' },
]

// Timeline 階段（5 階段，每階段帶 icon）
interface TimelineStep {
  key: TimelineStepKey
  label: string
  icon: string
}
const TIMELINE_STEPS: TimelineStep[] = [
  { key: 'unpaid',    label: '待付款', icon: 'pi-credit-card' },
  { key: 'to_ship',   label: '待出貨', icon: 'pi-box' },
  { key: 'shipped',   label: '已出貨', icon: 'pi-truck' },
  { key: 'delivered', label: '已送達', icon: 'pi-check-circle' },
  { key: 'completed', label: '已完成', icon: 'pi-verified' },
]

const orders = computed(() => ordersStore.orders)

const filteredOrders = computed(() => {
  let list = orders.value
  if (activeTab.value !== 'all') list = list.filter(o => o.status === activeTab.value)
  const [from, to] = appliedDateRange.value
  if (from || to) {
    const fromTs = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime() : -Infinity
    const toTs = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59).getTime() : Infinity
    list = list.filter(o => {
      const d = parseOrderDate(o.date)
      return d ? d.getTime() >= fromTs && d.getTime() <= toTs : true
    })
  }
  const k = appliedKeyword.value.trim().toLowerCase()
  if (k) {
    list = list.filter(o =>
      o.orderNo.toLowerCase().includes(k)
      || o.id.toLowerCase().includes(k)
      || o.items.some(it => it.name.toLowerCase().includes(k)),
    )
  }
  return list
})

function stepStatus(pkg: PackageInfo, stepKey: TimelineStep['key']): 'done' | 'current' | 'pending' {
  const order = TIMELINE_STEPS.findIndex(s => s.key === pkg.currentStep)
  const idx = TIMELINE_STEPS.findIndex(s => s.key === stepKey)
  if (idx < order) return 'done'
  if (idx === order) return 'current'
  return 'pending'
}

/** 蒐集 order 內所有包裹的 currentStep。 */
function allPackageSteps(order: OrderRecord): TimelineStep['key'][] {
  const steps: TimelineStep['key'][] = []
  order.items.forEach((it) => {
    it.packages.forEach((p) => steps.push(p.currentStep))
  })
  return steps
}

/** 訂單狀態：所有包裹同一階段 → 顯示該階段；不同階段 → 顯示「處理中」。 */
function orderDisplayStatus(order: OrderRecord): string {
  const steps = allPackageSteps(order)
  const uniq = new Set(steps)
  if (uniq.size === 0) return '—'
  if (uniq.size > 1) return '處理中'
  return TIMELINE_STEPS.find(s => s.key === steps[0])?.label ?? '—'
}

/** 商品狀態：同 item 所有包裹同階段 → 顯示該階段；不同 → 「處理中」。 */
function itemDisplayStatus(item: OrderItem): string {
  if (item.packages.length === 0) return '—'
  const uniq = new Set(item.packages.map(p => p.currentStep))
  if (uniq.size > 1) return '處理中'
  return TIMELINE_STEPS.find(s => s.key === item.packages[0].currentStep)?.label ?? '—'
}

/**
 * 動作可否：依包裹階段判斷
 * - unpaid / to_ship：僅可取消
 * - shipped：可取消、可退貨
 * - delivered：可換貨、可退貨
 * - completed / cancelled：皆不可
 */
function canCancelStep(step: TimelineStep['key']): boolean {
  return step === 'unpaid' || step === 'to_ship' || step === 'shipped'
}
function canRefundStep(step: TimelineStep['key']): boolean {
  return step === 'shipped' || step === 'delivered'
}
function canExchangeStep(step: TimelineStep['key']): boolean {
  return step === 'delivered'
}

/** 任一包裹可退貨 / 換貨 → 整筆可操作 */
function orderCanRefund(order: OrderRecord): boolean {
  return allPackageSteps(order).some(canRefundStep)
}
function orderCanExchange(order: OrderRecord): boolean {
  return allPackageSteps(order).some(canExchangeStep)
}

/** 不能退貨 / 換貨時的原因文案：`{狀態}訂單，無法退貨/換貨` */
function refundReasonText(order: OrderRecord): string {
  if (orderCanRefund(order)) return ''
  return `${orderDisplayStatus(order)}訂單，無法退貨`
}
function exchangeReasonText(order: OrderRecord): string {
  if (orderCanExchange(order)) return ''
  return `${orderDisplayStatus(order)}訂單，無法換貨`
}

/** 整筆訂單是否可取消：所有包裹都還在可取消階段（unpaid / to_ship / shipped） */
function orderCanCancel(order: OrderRecord): boolean {
  const steps = allPackageSteps(order)
  return steps.length > 0 && steps.every(canCancelStep)
}

/** 手機版狀態 chip：根據 currentStep 給對應 icon。 */
function stepIcon(key: TimelineStep['key']): string {
  return TIMELINE_STEPS.find(s => s.key === key)?.icon ?? 'pi-circle'
}

/** 進度條百分比：currentStep 在 timeline 的位置 / (總數 - 1)。 */
function stepProgressPct(key: TimelineStep['key']): number {
  const idx = TIMELINE_STEPS.findIndex(s => s.key === key)
  if (idx === -1) return 0
  return Math.round((idx / (TIMELINE_STEPS.length - 1)) * 100)
}
function stepIndex(key: TimelineStep['key']): number {
  return TIMELINE_STEPS.findIndex(s => s.key === key) + 1
}

/** 取得第一個包裹的當前狀態（給手機版緊湊卡顯示用） */
function firstPackage(item: OrderItem): PackageInfo {
  return item.packages[0] ?? { no: '', qty: 0, currentStep: 'unpaid' }
}

/** PrimeVue Timeline 用的資料：每筆 step 附帶 status / time / icon。 */
interface TimelineRow {
  key: TimelineStep['key']
  label: string
  icon: string
  time: string
  status: 'done' | 'current' | 'pending'
}
function timelineFor(pkg: PackageInfo): TimelineRow[] {
  return TIMELINE_STEPS.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
    time: pkg.stepTimes?.[s.key] ?? '—',
    status: stepStatus(pkg, s.key),
  }))
}

// ── 更換配送地址 dialog ──
const changeAddressOpen = ref(false)
function openChangeAddress(): void { changeAddressOpen.value = true }

function formatDateRange(): string {
  const [a, b] = dateRange.value
  const fmt = (d: Date | null) => d ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` : '—'
  return `${fmt(a)} - ${fmt(b)}`
}
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- 上方：購物權益與售後說明（內容待提供） -->
    <Panel
      toggleable
      :collapsed="!topInfoOpen"
      :pt="{
        header: { style: 'background: #ffffff; border-radius: 8px 8px 0 0; padding: 8px 16px' },
        title: { style: 'font-size: 14px; font-weight: 600; color: #334155' },
        content: { style: 'padding: 14px 16px; font-size: 12.5px; line-height: 1.7; color: #475569' },
      }"
      @update:collapsed="(v) => topInfoOpen = !v"
    >
      <template #header>
        <span class="text-sm font-semibold text-[#334155]">
          購物權益與售後說明
          <span class="ml-1 text-xs font-normal" style="color: #ef4444">（待提供）</span>
        </span>
      </template>
      <p class="mb-2">
        產品均享有 10 天猶豫期之權益（注意！猶豫期非試用期），若回退產品非全新狀態且包裝完整，將影響您的權益及需負擔回復原狀責任。
      </p>
      <p class="mb-2">
        ※ 依「通訊交易解除權合理例外情事適用準則」，部分特殊商品不適用十天猶豫期之規定。
      </p>
      <p>
        若無法線上操作，請您利用聯絡客服功能，將有專人盡速為您處理。
      </p>
    </Panel>

    <!-- 標題 -->
    <!-- 篩選卡：頁籤 + 日期/搜尋 + 結果摘要 -->
    <div class="bg-white rounded-[12px] shadow-card flex flex-col gap-4 p-4">
      <!-- Tab list -->
      <div class="border-b border-[#e2e8f0] -mx-4 -mt-4 px-4 pt-1">
        <div class="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            v-for="t in statusTabs"
            :key="t.key"
            class="px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap -mb-px border-b-2"
            :style="activeTab === t.key
              ? 'color: var(--primary); border-color: var(--primary)'
              : 'color: #64748b; border-color: transparent'"
            @click="activeTab = t.key"
          >{{ t.label }}</button>
        </div>
      </div>

      <!-- 日期 + 搜尋 -->
      <div class="flex gap-3" :class="isMobile ? 'flex-col' : 'flex-row items-center'">
        <div class="flex flex-col gap-1.5" :class="isMobile ? 'w-full' : 'w-[420px]'">
          <span class="text-sm font-medium text-[#334155]">訂單日期</span>
          <DatePicker
            v-model="dateRange"
            selection-mode="range"
            show-icon
            date-format="yy/mm/dd"
            placeholder="YYYY/MM/DD - YYYY/MM/DD"
            class="w-full"
          />
        </div>
        <div class="flex-1 flex flex-col gap-1.5">
          <span v-if="!isMobile" class="text-sm font-medium text-[#334155]">&nbsp;</span>
          <div class="flex gap-2">
            <InputText v-model="keyword" placeholder="請輸入訂單ID或商品名稱" class="flex-1 min-w-0" @keyup.enter="applyQuery" />
            <Button label="查詢" class="shrink-0" @click="applyQuery" />
          </div>
        </div>
      </div>

      <!-- 結果摘要 -->
      <p class="text-sm text-[#64748b]">
        你的查詢結果是
        <span class="font-medium text-[#334155]">{{ formatDateRange() }}</span>
        共找到
        <span class="font-bold" style="color: var(--primary)">{{ filteredOrders.length }}</span>
        筆訂單
      </p>
    </div>

    <!-- 訂單卡列表 -->
    <div class="flex flex-col gap-5">
      <article
        v-for="order in filteredOrders"
        :key="order.id"
        class="border border-[#e2e8f0] rounded-[8px] overflow-hidden bg-white"
      >
        <!-- Header table：手機卡片堆疊；其他用 table 兩列（header + data） -->
        <div
          v-if="isMobile"
          class="grid grid-cols-2 gap-y-2 p-3 text-sm"
          style="background: color-mix(in srgb, var(--primary) 8%, transparent)"
        >
          <div><p class="text-xs text-[#64748b]">訂單日期</p><p class="text-[#334155] font-medium">{{ order.date }}</p></div>
          <div><p class="text-xs text-[#64748b]">訂單編號</p><p class="text-[#334155] font-medium">{{ order.orderNo }}</p></div>
          <div><p class="text-xs text-[#64748b]">數量</p><p class="text-[#334155] font-medium">{{ order.qty }}</p></div>
          <div><p class="text-xs text-[#64748b]">訂單總額</p><p class="font-bold" style="color: #ef4444">${{ order.total }}</p></div>
          <div><p class="text-xs text-[#64748b]">付款方式</p><p class="text-[#334155] font-medium">{{ order.payment }}</p></div>
          <div><p class="text-xs text-[#64748b]">配送方式</p><p class="text-[#334155] font-medium">{{ order.delivery }}</p></div>
          <div><p class="text-xs text-[#64748b]">發票</p><Button label="線上列印" outlined size="small" class="!py-1" /></div>
          <div><p class="text-xs text-[#64748b]">狀態</p><p class="font-medium" style="color: var(--primary)">{{ orderDisplayStatus(order) }}</p></div>
        </div>

        <table v-else class="w-full text-sm table-fixed">
          <thead>
            <tr style="background: color-mix(in srgb, var(--primary) 8%, transparent)">
              <th class="pl-4 pr-3 py-2.5 text-left font-medium text-[#334155]">訂單日期</th>
              <th class="px-3 py-2.5 text-left font-medium text-[#334155]">訂單編號</th>
              <th class="px-3 py-2.5 text-left font-medium text-[#334155]" style="width: 70px">數量</th>
              <th class="px-3 py-2.5 text-left font-medium text-[#334155]" style="width: 110px">訂單總額</th>
              <th class="px-3 py-2.5 text-left font-medium text-[#334155]" style="width: 110px">付款方式</th>
              <th class="px-3 py-2.5 text-left font-medium text-[#334155]" style="width: 95px">配送方式</th>
              <th class="px-3 py-2.5 text-left font-medium text-[#334155]" style="width: 115px">發票</th>
              <th class="pl-3 pr-4 py-2.5 text-left font-medium text-[#334155]" style="width: 95px">狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="pl-4 pr-3 py-3 text-[#334155]">{{ order.date }}</td>
              <td class="px-3 py-3 text-[#334155]">{{ order.orderNo }}</td>
              <td class="px-3 py-3 text-[#334155]">{{ order.qty }}</td>
              <td class="px-3 py-3 font-bold" style="color: #ef4444">${{ order.total }}</td>
              <td class="px-3 py-3 text-[#334155]">{{ order.payment }}</td>
              <td class="px-3 py-3 text-[#334155]">{{ order.delivery }}</td>
              <td class="px-3 py-3"><Button label="線上列印" outlined size="small" class="!py-1" /></td>
              <td class="pl-3 pr-4 py-3 font-medium" style="color: var(--primary)">{{ orderDisplayStatus(order) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- 子 tab：手機改用 Select 下拉、其他用橫式 tabs -->
        <div class="border-b border-[#e2e8f0]">
          <div v-if="isMobile" class="flex items-center gap-2 px-4 py-2">
            <button
              class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f1f5f9] text-[#64748b] shrink-0"
              :aria-label="order.expanded ? '收合明細' : '展開明細'"
              @click="order.expanded = !order.expanded"
            >
              <i :class="['pi', order.expanded ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size: 14px"></i>
            </button>
            <Select
              v-model="order.detailTab"
              :options="detailTabs"
              option-label="label"
              option-value="key"
              class="flex-1 min-w-0"
            />
          </div>
          <div v-else class="flex items-center gap-2 px-4">
            <!-- 收合 / 展開 -->
            <button
              class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f1f5f9] text-[#64748b] shrink-0"
              :aria-label="order.expanded ? '收合明細' : '展開明細'"
              @click="order.expanded = !order.expanded"
            >
              <i :class="['pi', order.expanded ? 'pi-chevron-up' : 'pi-chevron-down']" style="font-size: 14px"></i>
            </button>
            <div class="flex-1 overflow-x-auto scrollbar-none">
              <div class="flex items-center gap-1">
                <button
                  v-for="dt in detailTabs"
                  :key="dt.key"
                  class="px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap -mb-px border-b-2"
                  :style="order.detailTab === dt.key
                    ? 'color: var(--primary); border-color: var(--primary)'
                    : 'color: #64748b; border-color: transparent'"
                  @click="order.detailTab = dt.key"
                >{{ dt.label }}</button>
              </div>
            </div>
            <!-- 取消訂單 tab：右側「取消訂單」按鈕（只能取消整筆） -->
            <Button
              v-if="order.detailTab === 'cancel'"
              label="取消訂單"
              outlined
              size="small"
              :disabled="!orderCanCancel(order)"
              class="shrink-0"
            />
            <!-- 更換地址 tab：右側「更換配送地址」按鈕 -->
            <Button
              v-if="order.detailTab === 'address'"
              label="更換配送地址"
              outlined
              size="small"
              class="shrink-0"
              @click="openChangeAddress"
            />
          </div>
        </div>

        <!-- 商品列 + 多包裹 timeline（對齊 Figma 9645-29876）；收合時整段隱藏 -->
        <div v-if="order.expanded" class="flex flex-col">
          <!-- 退貨 tab：不可退貨時顯示原因 -->
          <div
            v-if="order.detailTab === 'return' && refundReasonText(order)"
            class="px-4 py-4 text-sm text-[#020617]"
          >
            {{ refundReasonText(order) }}
          </div>
          <!-- 換貨 tab：不可換貨時顯示原因 -->
          <div
            v-if="order.detailTab === 'exchange' && exchangeReasonText(order)"
            class="px-4 py-4 text-sm text-[#020617]"
          >
            {{ exchangeReasonText(order) }}
          </div>

          <div
            v-for="(item, ii) in order.items"
            v-show="!((order.detailTab === 'return' && refundReasonText(order))
                  || (order.detailTab === 'exchange' && exchangeReasonText(order)))"
            :key="ii"
            class="px-4 py-4"
            :class="ii !== order.items.length - 1 ? 'border-b border-[#f1f5f9]' : ''"
          >
            <!-- 商品 row -->
            <div class="flex items-start gap-3 mb-3">
              <div class="w-[48px] h-[48px] rounded-[6px] overflow-hidden bg-[#f1f5f9] shrink-0">
                <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-[#334155] line-clamp-1 leading-snug">{{ item.name }}</p>
                <p class="text-xs text-[#64748b] mt-1">規格：{{ item.spec }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-bold text-[#020617]">${{ item.price.toLocaleString() }} / {{ item.qty }}件</p>
              </div>
            </div>

            <!-- 包裹卡（一或多個）— 僅在「配送進度/明細」tab 顯示 -->
            <div v-if="order.detailTab === 'progress'" class="flex flex-col gap-3">
              <div
                v-for="pkg in item.packages"
                :key="pkg.no"
                class="rounded-[10px] px-4 py-2"
                style="background: #f1f5f9"
              >
                <!-- Package header -->
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-center gap-1.5 text-sm text-[#334155]">
                    <i class="pi pi-box" style="font-size: 14px"></i>
                    <span class="font-medium">包裹編號：{{ pkg.no }}</span>
                  </div>
                  <span class="text-sm text-[#334155]">{{ pkg.qty }}件</span>
                </div>

                <!-- 手機版緊湊 -->
                <div v-if="isMobile" class="bg-white rounded-md p-3">
                  <div class="flex items-center justify-between gap-3 mb-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span
                        class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
                        style="background: var(--primary)"
                      >
                        <i :class="`pi ${stepIcon(pkg.currentStep)}`" style="font-size: 14px"></i>
                      </span>
                      <div class="min-w-0">
                        <p class="text-sm font-bold leading-tight" style="color: var(--primary)">
                          {{ TIMELINE_STEPS.find(s => s.key === pkg.currentStep)?.label ?? '—' }}
                        </p>
                        <p class="text-xs text-[#64748b] leading-tight mt-0.5">
                          {{ pkg.stepTimes?.[pkg.currentStep] ?? '—' }}
                        </p>
                      </div>
                    </div>
                    <span class="text-xs font-bold shrink-0" style="color: var(--primary)">
                      {{ stepIndex(pkg.currentStep) }} / {{ TIMELINE_STEPS.length }}
                    </span>
                  </div>
                  <div class="h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :style="{ width: stepProgressPct(pkg.currentStep) + '%', background: 'var(--primary)' }"
                    ></div>
                  </div>
                </div>

                <!-- 非手機橫式（PrimeVue Timeline） -->
                <div v-else>
                  <Timeline
                    :value="timelineFor(pkg)"
                    layout="horizontal"
                    align="top"
                    class="my-order-timeline"
                  >
                    <template #marker="{ item: step }">
                      <span
                        class="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
                        :style="step.status === 'pending'
                          ? 'background: #cbd5e1'
                          : 'background: var(--primary)'"
                      >
                        <i :class="`pi ${step.icon}`" style="font-size: 13px"></i>
                      </span>
                    </template>
                    <template #opposite="{ item: step }">
                      <p
                        class="text-xs whitespace-nowrap pb-1.5 pr-3"
                        :style="step.status === 'pending' ? 'color: #cbd5e1' : 'color: #64748b'"
                      >{{ step.time }}</p>
                    </template>
                    <template #content="{ item: step }">
                      <div class="flex flex-col pt-1.5 pr-3">
                        <p
                          class="text-sm font-medium whitespace-nowrap"
                          :style="step.status === 'pending' ? 'color: #94a3b8' : 'color: var(--primary)'"
                        >
                          {{ step.label }}
                          <a
                            v-if="step.key === 'shipped' && step.status !== 'pending'"
                            class="text-xs hover:underline"
                            style="color: #ef4444"
                          >(查看配送進度)</a>
                        </p>
                      </div>
                    </template>
                    <template #connector="{ index }">
                      <span
                        class="block h-0.5 w-full"
                        :style="(timelineFor(pkg)[index + 1]?.status ?? 'pending') === 'pending'
                          ? 'background: #cbd5e1'
                          : 'background: var(--primary)'"
                      ></span>
                    </template>
                  </Timeline>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

    </div>

    <!-- 下方：配送、退款與發票說明（內容待提供） -->
    <Panel
      toggleable
      :collapsed="!bottomInfoOpen"
      :pt="{
        header: { style: 'background: #ffffff; border-radius: 8px 8px 0 0; padding: 8px 16px' },
        title: { style: 'font-size: 14px; font-weight: 600; color: #334155' },
        content: { style: 'padding: 14px 16px; font-size: 12.5px; line-height: 1.7; color: #475569' },
      }"
      @update:collapsed="(v) => bottomInfoOpen = !v"
    >
      <template #header>
        <span class="text-sm font-semibold text-[#334155]">
          配送、退款與發票說明
          <span class="ml-1 text-xs font-normal" style="color: #ef4444">（待提供）</span>
        </span>
      </template>
      <p class="mb-2">
        ※ 食品因有保存期限問題，一經拆封食用後，將會影響退貨權限。
      </p>
      <p class="mb-2">
        ※ 商品請保持完整(含主商品、配件、贈品與原廠外箱)，若有缺件、毀損等個人因素，將保留接受退換貨與否之權力。
      </p>
      <p class="mb-2">
        ※ 若商品已過猶豫期限，則無法線上申請銷退。
      </p>
      <p class="font-bold text-[#334155] mt-3">相關事項說明：</p>
      <p class="mb-2">
        &lt; 配送服務 &gt; 除特殊商品外(如:材積過大等)須另行約定送貨時間外，其餘商品皆如網頁中所查詢的配送進度中顯示之日期進行配送。
      </p>
      <p class="mb-2">
        &lt; 折價券 &gt; 折價券使用後，若取消訂單或辦理退貨時，折價券仍在有效期限內，將歸還至會員帳戶；若折價券已過期，則失效無法再次使用。
      </p>
      <p class="mb-2">
        &lt; 退款方式 &gt; 付款方式為貨到付款、超商取貨付款、IBON付款及ATM付款之訂單，確認退貨後將款項以匯款方式退還訂購人。付款方式為信用卡者，確認退貨方式將款項退至原信用卡帳戶中。
      </p>
      <p class="font-bold text-[#334155] mt-3">關於發票開立與寄送：</p>
      <p class="mb-2">
        &lt; 個人發票 &gt; 本公司已全面採用電子發票，客戶購買商品並於付款完成、商品出貨後，將所開立的發票以 E-mail 方式通知客戶。
      </p>
      <p class="mb-2">
        &lt; 法人發票 &gt; 訂購時選擇「公司用發票(線上列印)」者，您可於發票開立後點選訂單查詢頁面，可直接下載列印「電子發票證明聯」作為報帳使用。
      </p>
      <p class="text-xs text-[#94a3b8] mt-3">
        ※若有任何問題，歡迎您隨時利用網站 FAQ/連絡客服留下您要詢問的問題，將有專人為您服務。
      </p>
    </Panel>

    <!-- 更換配送地址 dialog -->
    <ChangeAddressDialog v-model:visible="changeAddressOpen" />

  </div>
</template>
