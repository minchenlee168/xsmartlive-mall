<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * 交易記錄查詢 section（會員中心右側內容）。
 * 日期區間 DatePicker，內容依年月分組，每筆顯示主題色圓底 icon、
 * 類型、訂單編號、日期、金額。
 */

/** 使用者於 DatePicker 編輯中的區間（未送出）。 */
const dateRange = ref<Array<Date | null>>([new Date('2026-05-14'), new Date('2026-06-12')])
/** 按下「查詢」才更新，作為實際過濾來源。 */
const appliedRange = ref<Array<Date | null>>([dateRange.value[0], dateRange.value[1]])

function onSearch(): void {
  appliedRange.value = [dateRange.value[0], dateRange.value[1]]
}

interface TransactionRecord {
  id: string
  type: 'pay' | 'refund'
  orderNo: string
  date: string // YYYY-MM-DD
  amount: number // 正數；type 決定正負
}

const records = ref<TransactionRecord[]>([
  { id: 't1', type: 'pay',    orderNo: '260608HWR0SNE6', date: '2026-06-08', amount: 546 },
  { id: 't2', type: 'pay',    orderNo: '260527GFCD0VW0', date: '2026-05-27', amount: 1759 },
  { id: 't3', type: 'refund', orderNo: '260520XKLZ3PQE', date: '2026-05-20', amount: 320 },
  { id: 't4', type: 'pay',    orderNo: '260514ABCD0XY1', date: '2026-05-14', amount: 880 },
])

// 依 appliedRange 篩選 + 排序（新到舊）
const filtered = computed(() => {
  let list = [...records.value]
  if (appliedRange.value[0] && appliedRange.value[1]) {
    const from = appliedRange.value[0]!.getTime()
    const to = appliedRange.value[1]!.getTime()
    list = list.filter(r => {
      const t = new Date(r.date).getTime()
      return t >= from && t <= to
    })
  }
  return list.sort((a, b) => b.date.localeCompare(a.date))
})

// 依年月分組
interface MonthGroup {
  key: string
  label: string
  items: TransactionRecord[]
}
const grouped = computed<MonthGroup[]>(() => {
  const map = new Map<string, MonthGroup>()
  filtered.value.forEach((r) => {
    const [y, m] = r.date.split('-')
    const key = `${y}-${m}`
    const label = `${y}年${parseInt(m, 10)}月`
    if (!map.has(key)) map.set(key, { key, label, items: [] })
    map.get(key)!.items.push(r)
  })
  return Array.from(map.values())
})

function typeLabel(t: TransactionRecord['type']): string {
  return t === 'pay' ? '支付' : '退款'
}
function signedAmount(r: TransactionRecord): string {
  const sign = r.type === 'pay' ? '-' : '+'
  return `${sign}$${r.amount.toLocaleString()}`
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 篩選列：日期區間 + 查詢按鈕 -->
    <div class="bg-white rounded-[12px] shadow-card card-pad flex flex-wrap items-center gap-x-6 gap-y-3">
      <div class="flex items-center gap-3">
        <span class="text-sm text-[#334155] shrink-0">日期區間</span>
        <DatePicker
          v-model="dateRange"
          selection-mode="range"
          show-icon
          icon-display="input"
          date-format="yy/mm/dd"
          placeholder="YYYY/MM/DD - YYYY/MM/DD"
          class="w-[280px]"
        />
      </div>
      <Button label="查詢" icon="pi pi-search" @click="onSearch" />
    </div>

    <!-- 分組列表 -->
    <div v-if="grouped.length === 0" class="bg-white rounded-[12px] shadow-card py-10 text-center text-sm text-[#64748b]">
      此區間目前沒有交易紀錄
    </div>

    <template v-for="group in grouped" :key="group.key">
      <!-- 年月 header -->
      <p class="text-sm font-medium text-[#334155] mt-2">{{ group.label }}</p>

      <!-- 該月所有交易 -->
      <div class="flex flex-col gap-3">
        <article
          v-for="r in group.items"
          :key="r.id"
          class="bg-white rounded-[10px] shadow-card flex items-center gap-4 px-4 py-4"
        >
          <!-- 主題色圓底 icon -->
          <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style="background: var(--primary)">
            <i class="pi pi-dollar text-white" style="font-size: 18px"></i>
          </div>

          <!-- 中間：類型 + 訂單編號 + 日期 -->
          <div class="flex-1 min-w-0">
            <p class="text-base font-bold text-[#020617] leading-tight">{{ typeLabel(r.type) }}</p>
            <p class="text-xs text-[#64748b] mt-0.5">訂單編號：{{ r.orderNo }}</p>
            <p class="text-xs text-[#94a3b8] mt-0.5">{{ r.date }}</p>
          </div>

          <!-- 金額 -->
          <span class="font-bold text-[#020617] shrink-0 text-base">{{ signedAmount(r) }}</span>
        </article>
      </div>
    </template>
  </div>
</template>
