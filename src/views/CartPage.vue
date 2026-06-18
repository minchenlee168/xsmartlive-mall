<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import CategoryTabs from '../components/CategoryTabs.vue'
import { useViewportStore } from '../stores/viewport'
import { useCartStore, type CartGroup, type CartItem, type CartBundleItem } from '../stores/cart'
import { useUiStore } from '../stores/ui'
import { products } from '../data/products'

const router = useRouter()
const ui = useUiStore()
const vp = computed(() => useViewportStore().current.id)
const isPC = computed(() => vp.value === 'pc')

const cart = useCartStore()
const groups = computed(() => cart.groups)

// 不同配送方式 → 阻擋共同結帳並彈窗請使用者拆單
const mixedShippingDialog = ref(false)
const mixedShippingMethods = ref<string[]>([])
/** 找到該購物車對應的配送方式 tag（label 含「配送」字樣的那個）。 */
function getGroupShipping(group: CartGroup): string | null {
  const t = group.tags.find(tg => tg.label.includes('配送'))
  return t ? t.label : null
}

function isGroupAllChecked(group: CartGroup) {
  return group.items.length > 0 && group.items.every(i => i.checked)
}
function toggleGroupAll(group: CartGroup) {
  const all = isGroupAllChecked(group)
  group.items.forEach(i => { i.checked = !all })
}
const globalAllChecked = computed(() => groups.value.every(g => isGroupAllChecked(g)))
function toggleGlobalAll() {
  const all = globalAllChecked.value
  groups.value.forEach(g => g.items.forEach(i => { i.checked = !all }))
}
function groupSubtotal(group: CartGroup) {
  return group.items.filter(i => i.checked).reduce((s, i) => s + i.price * i.qty, 0)
}
const globalTotal = computed(() =>
  groups.value.reduce((s, g) => s + groupSubtotal(g), 0)
)
const checkedCount = computed(() =>
  groups.value.reduce((s, g) => s + g.items.filter(i => i.checked).length, 0)
)
const isEmpty = computed(() => groups.value.every(g => g.items.length === 0))
function removeItem(group: CartGroup, id: string) {
  cart.removeItem(group.id, id)
}
function isGroupLocked(group: CartGroup) {
  return group.tags.some(t => t.label === '禁止棄標')
}
/** 組合商品子品是否缺規格或數量；用於顯示提示與阻擋結帳。
 *  任選組合：qty=0 代表「不挑這項」，是合法狀態；只在 qty>0 但缺規格時提示。 */
function subNeedsAttention(sub: CartBundleItem, item?: CartItem): boolean {
  if (item && isPickBundleItem(item)) {
    return sub.qty > 0 && !sub.spec
  }
  return !sub.spec || sub.qty <= 0
}
function bundleNeedsAttention(item: CartItem): boolean {
  if (!item.isBundle || !item.bundleItems) return false
  const subIssue = item.bundleItems.some(s => subNeedsAttention(s, item))
  if (isPickBundleItem(item)) {
    const cat = products.find(p => p.id === item.productId)
    const need = (cat?.pickCount ?? 0) * item.qty
    return subIssue || pickedTotalOf(item) !== need
  }
  return subIssue
}
function subMissingText(sub: CartBundleItem, item?: CartItem): string {
  const pick = !!(item && isPickBundleItem(item))
  const missing: string[] = []
  if (!sub.spec && (!pick || sub.qty > 0)) missing.push('規格')
  if (!pick && sub.qty <= 0) missing.push('數量')
  return missing.length ? `請選擇${missing.join('與')}` : ''
}

/**
 * 查詢購物車組合商品子品在商品目錄中可選的規格清單：
 * - 固定組合：對應 `catalog.bundleItems[subIndex].specOptions`
 * - 任選組合：以子品名稱對應 `catalog.pickOptions[?].specOptions`
 * 找不到對應規格選項 → 回傳 null 代表不顯示下拉。
 */
function subSpecOptionsFor(item: CartItem, sub: CartBundleItem, subIndex: number): string[] | null {
  if (item.productId == null) return null
  const cat = products.find(p => p.id === item.productId)
  if (!cat) return null
  if (cat.isPickBundle) {
    const opt = cat.pickOptions?.find(o => o.name === sub.name)
    return opt?.specOptions?.length ? opt.specOptions : null
  }
  const ref = cat.bundleItems?.[subIndex]
  return ref?.specOptions?.length ? ref.specOptions : null
}
/** 直接從購物車修改子品規格 — v-model 用 setter 寫回 sub.spec。 */
function setSubSpec(sub: CartBundleItem, value: string): void {
  sub.spec = value
}

/** 是否為任選組合（子品數量需由 user 在購物車挑選）。 */
function isPickBundleItem(item: CartItem): boolean {
  if (item.productId == null) return false
  return !!products.find(p => p.id === item.productId)?.isPickBundle
}
/** 任選組合：當前所有子品已挑數量總和。 */
function pickedTotalOf(item: CartItem): number {
  return (item.bundleItems ?? []).reduce((s, b) => s + (b.qty || 0), 0)
}
/** 任選組合：單一子品可選的數量清單 0 ~ min(maxQty × itemQty, 已挑 + 剩餘額度)。 */
function subQtyOptionsFor(item: CartItem, sub: CartBundleItem): number[] {
  const cat = products.find(p => p.id === item.productId)
  if (!cat?.isPickBundle) return []
  const totalNeed = (cat.pickCount ?? 0) * item.qty
  const opt = cat.pickOptions?.find(o => o.name === sub.name)
  const perItemMax = (opt?.maxQty ?? 1) * item.qty
  const cur = sub.qty || 0
  const remaining = totalNeed - pickedTotalOf(item)
  const max = Math.min(perItemMax, cur + Math.max(remaining, 0))
  return Array.from({ length: max + 1 }, (_, i) => i)
}
function setSubQty(sub: CartBundleItem, value: number): void {
  sub.qty = value
}
// ── 加價購：商城分類頁沒有、僅在購物車推薦的加價商品 ──
interface AddOnProduct {
  id: number
  name: string
  price: number
  original?: number
  image: string
  spec?: string
}
const addOnProducts: AddOnProduct[] = [
  { id: 9001, name: '寶寶嬰兒紗布手帕 5 入組', price: 89, original: 150, image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop' },
  { id: 9002, name: '寶寶柔嫩濕紙巾 80 抽 / 包', price: 49, original: 80, image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&fit=crop' },
  { id: 9003, name: '不鏽鋼防滑安撫奶嘴',         price: 129, original: 200, image: 'https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=400&fit=crop' },
  { id: 9004, name: '嬰兒安全電動指甲剪',         price: 199, original: 320, image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&fit=crop' },
  { id: 9005, name: '寶寶副食品試吃綜合包',       price: 99,  original: 180, image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=400&fit=crop' },
  { id: 9006, name: '媽咪保溫水壺 500ml',         price: 290, original: 480, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&fit=crop' },
]
function addAddOn(p: AddOnProduct): void {
  cart.addItem(
    { id: p.id, name: p.name, price: p.price, original: p.original, image: p.image },
    p.spec ?? '預設',
    1,
  )
  ui.toast(`已加入「${p.name}」`)
}

function goCheckout() {
  // 已勾選的組合商品若有未選規格 / 數量 → 阻擋並提示
  const incompleteBundle = groups.value
    .flatMap(g => g.items)
    .find(i => i.checked && bundleNeedsAttention(i))
  if (incompleteBundle) {
    ui.toast(`「${incompleteBundle.name}」尚未選擇規格或數量`)
    return
  }
  // 勾選的群組若包含不同配送方式 → 不能合併結帳，跳提示請拆單
  const checkedGroups = groups.value.filter(g => g.items.some(i => i.checked))
  const methods = Array.from(new Set(
    checkedGroups.map(getGroupShipping).filter((s): s is string => !!s),
  ))
  if (methods.length > 1) {
    mixedShippingMethods.value = methods
    mixedShippingDialog.value = true
    return
  }
  router.push('/checkout')
}
function goProduct(productId?: number) {
  if (productId != null) router.push(`/product/${productId}`)
}
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <!-- Page header -->
    <div>
      <div class="max-w-[1280px] mx-auto px-4 py-[22px] flex items-center gap-3">
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded @click="router.back()" />
        <h1 class="font-bold text-[#020617]" :class="isPC ? 'text-2xl' : 'text-xl'">購物車結帳</h1>
      </div>
    </div>

    <!-- Empty state -->
    <main v-if="isEmpty" class="flex-1 max-w-[1280px] w-full mx-auto flex flex-col items-center justify-center min-h-[400px]" style="padding: var(--page-pad-y) var(--page-pad-x)">
      <div class="flex flex-col items-center gap-4">
        <div class="relative">
          <i class="pi pi-shopping-cart" style="font-size: 96px; color: #6b7280" />
          <span class="absolute left-1/2 -translate-x-1/2 font-black select-none" style="top: 8%; font-size: 44px; color: #1f2937">?</span>
        </div>
        <p class="text-base" style="color: #6b7280">購物車內無任何商品</p>
      </div>
    </main>

    <!-- Content -->
    <main v-else class="flex-1 max-w-[1280px] w-full mx-auto flex flex-col" :style="{ padding: `0 ${isPC ? '0' : 'var(--page-pad-x)'} var(--page-pad-y)`, gap: 'var(--stack-gap)' }">
      <div
        v-for="group in groups"
        :key="group.id"
        class="bg-white rounded-[12px] shadow-[0px_1px_2px_rgba(0,0,0,0.1),0px_1px_3px_rgba(0,0,0,0.1)]"
      >
        <!-- Group header -->
        <div class="cart-divider flex items-center gap-4 px-[var(--card-pad)] py-[var(--card-pad)]">
          <!-- Group select-all checkbox -->
          <div class="flex items-center gap-2 shrink-0">
            <Checkbox
              :model-value="isGroupAllChecked(group)"
              binary
              :input-id="'grp-' + group.id"
              @update:model-value="toggleGroupAll(group)"
            />
            <label :for="'grp-' + group.id" class="text-sm text-[#334155] cursor-pointer">全選</label>
          </div>
          <!-- 名稱 + tag：手機版直式（避免名稱過長與 tag 一起折行），其他維持橫式 -->
          <div
            class="flex min-w-0 flex-1"
            :class="vp === 'mobile' ? 'flex-col items-start gap-1' : 'flex-row items-center gap-2'"
          >
            <span class="font-medium text-[17.5px] text-[#334155] truncate max-w-full">{{ group.sellerName }}</span>
            <div class="flex flex-wrap items-center gap-2">
              <Tag
                v-for="tag in group.tags"
                :key="tag.label"
                :value="tag.label"
                :severity="tag.type"
              />
            </div>
          </div>
        </div>

        <!-- Items -->
        <div v-for="(item, ii) in group.items" :key="item.id" :class="ii !== group.items.length - 1 ? 'cart-divider' : ''">
          <!-- Item row -->
          <div class="flex items-center px-[var(--card-pad)] py-[var(--card-pad)]" :class="isPC ? 'gap-4' : 'gap-3'">
            <!-- Checkbox -->
            <Checkbox v-model="item.checked" binary class="shrink-0" />

            <!-- Image -->
            <div
              class="shrink-0 rounded-[4px] overflow-hidden aspect-square"
              :class="isPC ? 'w-[100px]' : vp === 'tablet' ? 'w-[80px]' : 'w-[64px]'"
            >
              <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-0.5">
                <i class="pi pi-hammer text-gray-300 text-lg" />
                <span class="text-gray-400 text-[10px]">圖片施工中</span>
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0 flex" :class="isPC ? 'items-center gap-4' : 'flex-col gap-1'">
              <div class="flex-1 min-w-0 flex flex-col gap-1">
                <p
                  class="font-semibold text-[#334155] truncate text-[16px]"
                  :class="item.productId != null ? 'cursor-pointer hover:text-[color:var(--primary)] transition-colors' : ''"
                  @click="goProduct(item.productId)"
                >
                  {{ item.name }}
                </p>
                <div v-if="item.spec && item.spec !== '預設'" class="flex gap-4 text-[#334155]" :class="isPC ? 'text-[14px]' : 'text-base'">
                  <span>規格</span>
                  <span>{{ item.spec }}</span>
                </div>
                <div class="flex items-center gap-4" :class="isPC ? 'text-[14px]' : 'text-base'">
                  <span class="text-[#334155]">數量</span>
                  <InputNumber
                    v-model="item.qty"
                    :min="1"
                    show-buttons
                    button-layout="horizontal"
                    increment-button-icon="pi pi-plus"
                    decrement-button-icon="pi pi-minus"
                    class="qty-stepper"
                  />
                </div>
              </div>

              <!-- Price + Delete -->
              <div class="flex items-center justify-between shrink-0" :class="isPC ? 'gap-8' : 'mt-1'">
                <div class="flex flex-col items-start">
                  <span v-if="item.original" class="text-sm text-[#64748b] line-through">${{ (item.original * item.qty).toLocaleString() }}</span>
                  <span class="font-medium leading-none" style="color: var(--primary)" :class="isPC ? 'text-[24px]' : 'text-base'">${{ (item.price * item.qty).toLocaleString() }}</span>
                </div>
                <Button
                  v-if="!isGroupLocked(group)"
                  label="刪除"
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  class="!min-h-[44px] !px-3"
                  @click="removeItem(group, item.id)"
                />
              </div>
            </div>
          </div>

          <!-- Bundle fieldset -->
          <div v-if="item.isBundle" class="px-[var(--card-pad)] pb-4 pl-9 pt-4">
            <div class="relative border border-[#e2e8f0] rounded-md bg-white pt-4 px-4 pb-4">
              <!-- Legend button -->
              <button
                class="absolute border-0 rounded-md px-3 py-2 flex items-center gap-2 text-[14px] font-black text-[#334155] transition-colors hover:text-[var(--primary)]"
                style="top: -18px; left: 16px; background: transparent"
                @click="item.bundleExpanded = !item.bundleExpanded"
              >
                <i class="pi text-xs" :class="item.bundleExpanded ? 'pi-minus' : 'pi-plus'" />
                組合商品內容
              </button>
              <!-- 未選規格 / 數量提示 banner -->
              <div
                v-if="item.bundleExpanded && bundleNeedsAttention(item)"
                class="flex items-center gap-2 mb-3 px-3 py-2 rounded-md text-sm"
                style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca"
              >
                <i class="pi pi-exclamation-triangle text-base" />
                <span>此組合商品尚未選擇規格或數量，請至商品頁完成選擇後再結帳</span>
              </div>
              <!-- Sub-items grid -->
              <div v-if="item.bundleExpanded" class="grid gap-4" :class="isPC ? 'grid-cols-2' : 'grid-cols-1'">
                <div
                  v-for="(sub, si) in item.bundleItems"
                  :key="si"
                  class="bg-[#f1f5f9] rounded-xl p-[var(--card-pad)] flex items-center gap-4 shadow-[0px_1px_2px_rgba(0,0,0,0.1)]"
                  :style="subNeedsAttention(sub, item) ? 'outline: 1px solid #ef4444' : ''"
                >
                  <div class="w-[80px] h-[80px] shrink-0 bg-[#d9d9d9] rounded overflow-hidden">
                    <img v-if="sub.image" :src="sub.image" :alt="sub.name" class="w-full h-full object-cover" />
                  </div>
                  <div class="flex flex-col gap-1 min-w-0 flex-1">
                    <p class="font-semibold text-[16px] text-[#334155] truncate">{{ sub.name }}</p>
                    <p v-if="subNeedsAttention(sub, item)" class="text-[13px] font-medium" style="color: #ef4444">
                      {{ subMissingText(sub, item) }}
                    </p>
                    <!-- 規格：catalog 有 specOptions → 內嵌 Select 可改；否則顯示文字
                         sub.spec 為空字串時轉 null 以觸發 placeholder 顯示「請選擇規格」 -->
                    <template v-if="subSpecOptionsFor(item, sub, si)">
                      <div class="flex items-center gap-2 text-[14px] text-[#334155]">
                        <span class="shrink-0">規格</span>
                        <Select
                          :model-value="sub.spec || null"
                          :options="subSpecOptionsFor(item, sub, si) ?? []"
                          placeholder="請選擇規格"
                          size="small"
                          class="flex-1 min-w-0"
                          @update:model-value="(v) => setSubSpec(sub, v)"
                        />
                      </div>
                    </template>
                    <div v-else-if="sub.spec && sub.spec !== '預設'" class="flex gap-4 text-[14px] text-[#334155]">
                      <span>規格</span><span>{{ sub.spec }}</span>
                    </div>
                    <!-- 任選組合：可調整子品數量；固定組合：純顯示數量 -->
                    <div v-if="isPickBundleItem(item)" class="flex items-center gap-2 text-[14px] text-[#334155]">
                      <span class="shrink-0">數量</span>
                      <Select
                        :model-value="sub.qty"
                        :options="subQtyOptionsFor(item, sub)"
                        size="small"
                        fluid
                        class="flex-1 min-w-0"
                        @update:model-value="(v) => setSubQty(sub, v)"
                      />
                    </div>
                    <div v-else class="flex gap-4 text-[14px] text-[#334155]">
                      <span>數量</span><span>{{ (sub.qty || 0) * item.qty }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Group subtotal -->
        <div class="cart-divider-top flex items-center justify-end gap-4 px-[var(--card-pad)] py-4">
          <span class="text-[#334155]" :class="vp === 'mobile' ? 'text-[14px]' : 'text-[18px]'">訂單金額小計</span>
          <span class="font-bold" style="color: var(--primary)" :class="vp === 'mobile' ? 'text-[20px]' : 'text-[30px]'">${{ groupSubtotal(group).toLocaleString() }}</span>
        </div>
      </div>

      <!-- 加價購區塊：商城分類頁沒有的小物、可一鍵加入購物車 -->
      <section class="bg-white rounded-[12px] shadow-card">
        <div
          class="flex items-center px-4 py-2 border-b-2"
          style="background: color-mix(in srgb, var(--primary) 8%, transparent); border-color: var(--primary); border-radius: 12px 12px 0 0"
        >
          <span class="text-[18px] font-semibold text-[#334155]">加價購</span>
        </div>

        <!-- 加價購卡片 — auto-fill grid，卡片不再寫死寬度與高度，
             小視窗下名稱與按鈕也能完整顯示 -->
        <div
          class="grid gap-2 p-[var(--card-pad)]"
          style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))"
        >
          <div
            v-for="p in addOnProducts"
            :key="p.id"
            class="flex flex-col gap-[7px] p-2 rounded-[8px]"
          >
            <div class="aspect-[332/320] w-full bg-[#d9d9d9] rounded-[8px] overflow-hidden shrink-0">
              <img :src="p.image" :alt="p.name" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <div class="flex flex-col gap-2 p-2 flex-1 min-h-0">
              <p
                class="text-[#020617] leading-snug line-clamp-2 overflow-hidden"
                :class="isPC ? 'text-[16px] min-h-[44px]' : 'text-sm min-h-[36px]'"
              >{{ p.name }}</p>
              <span class="font-bold" :class="isPC ? 'text-[18px]' : 'text-base'" style="color: var(--primary)">${{ p.price }}</span>
              <Button label="加入購物車" icon="pi pi-plus" size="small" class="mt-auto whitespace-nowrap" @click="addAddOn(p)" />
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Sticky footer -->
    <div v-if="!isEmpty" class="sticky bottom-0 z-40 bg-white border-t border-b border-[#e2e8f0]">
      <div
        class="max-w-[1280px] mx-auto px-4 py-3 flex items-center justify-between gap-3"
        style="padding-bottom: max(12px, env(safe-area-inset-bottom))"
      >
        <!-- Global select all -->
        <div class="flex items-center gap-2 shrink-0">
          <Checkbox
            :model-value="globalAllChecked"
            binary
            input-id="global-all"
            @update:model-value="toggleGlobalAll"
          />
          <label for="global-all" class="text-base text-[#334155] cursor-pointer whitespace-nowrap">
            {{ vp === 'mobile' ? '全選' : '選擇全部購物車' }}
          </label>
        </div>

        <!-- Total + checkout -->
        <div class="flex items-center min-w-0" :class="vp === 'mobile' ? 'gap-3' : 'gap-8'">
          <div class="flex items-baseline gap-2 min-w-0">
            <span v-if="vp !== 'mobile'" class="text-[18px] text-[#334155]">訂單總金額</span>
            <span class="font-bold truncate" :class="vp === 'mobile' ? 'text-2xl' : 'text-[30px]'" style="color: var(--primary)">${{ globalTotal.toLocaleString() }}</span>
          </div>
          <Button
            :label="checkedCount > 0 ? `去結帳 (${checkedCount})` : '去結帳'"
            class="!min-h-[48px] shrink-0"
            :class="vp === 'mobile' ? '!px-5' : 'px-16'"
            :disabled="checkedCount === 0"
            @click="goCheckout"
          />
        </div>
      </div>
    </div>

    <!-- 不同配送方式提示：阻擋共同結帳；遮罩限制在 frame 內，彈窗寬度也跟 frame 對齊 -->
    <Dialog
      v-model:visible="mixedShippingDialog"
      modal
      :draggable="false"
      :dismissable-mask="true"
      :style="{
        width: vp === 'mobile' ? 'calc(var(--frame-width, 100vw) - 32px)' : '420px',
        maxWidth: vp === 'mobile' ? 'calc(var(--frame-width, 100vw) - 32px)' : '420px',
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
        <div class="flex items-center gap-2">
          <i class="pi pi-exclamation-triangle" style="color: #ef4444; font-size: 18px" />
          <span class="font-bold text-[#020617]" style="font-size: 16px">無法合併結帳</span>
        </div>
      </template>
      <div class="flex flex-col gap-2 text-[14px] text-[#334155]">
        <p>所選購物車包含不同配送方式，無法一起結帳：</p>
        <ul class="list-disc pl-5">
          <li v-for="m in mixedShippingMethods" :key="m">{{ m }}</li>
        </ul>
        <p class="text-[#64748b]">請分別勾選同一配送方式的購物車後再進行結帳。</p>
      </div>
      <template #footer>
        <div class="flex justify-end w-full">
          <Button label="我知道了" @click="mixedShippingDialog = false" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
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

/* 加價購手機橫向卷軸：隱藏 scrollbar */
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
