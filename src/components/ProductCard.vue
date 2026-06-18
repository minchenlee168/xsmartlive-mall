<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useViewportStore } from '../stores/viewport'
import { useCartStore } from '../stores/cart'
import { useUiStore } from '../stores/ui'
import { products } from '../data/products'

const props = defineProps<{
  id: number
  name: string
  price: number
  original: number
  hasVariant?: boolean
  stock?: number
  image?: string
  hideActions?: boolean
  /** 簡易版：不顯示數量選擇器與「還剩X件」，仍保留 CTA 按鈕 */
  simple?: boolean
  /** 來源標記（如 'theme'）— 帶進商品頁 query，供麵包屑顯示「返回」 */
  from?: string
}>()

const router = useRouter()
const cart = useCartStore()
const ui = useUiStore()

const qty = ref(1)
const vp = computed(() => useViewportStore().current.id)
const isPC = computed(() => vp.value === 'pc')

const product = computed(() => products.find(p => p.id === props.id))

// 規格選項取自商品目錄
const sizes = computed(() => product.value?.sizes ?? [])

// 選擇規格彈窗狀態
const specDialogOpen = ref(false)
const dialogSize = ref('')

/** 是否為需挑選的組合商品（任選，或固定組合內含可選規格）。 */
const needsBundlePicker = computed(() => {
  const p = product.value
  if (!p) return false
  if (p.isPickBundle) return true
  if (p.isBundle && p.bundleItems?.some(i => i.specOptions?.length)) return true
  return false
})

// 組合商品挑選彈窗狀態
const bundleDialogOpen = ref(false)
const pickedQty = ref<Record<number, number>>({})
const pickedSpecs = ref<Record<number, string>>({})
const bundleSelections = ref<string[]>([])
const pickedTotal = computed(() =>
  Object.values(pickedQty.value).reduce((s, n) => s + (n || 0), 0),
)
const totalPickCount = computed(() => (product.value?.pickCount ?? 0) * qty.value)
function optMaxQtyCard(opt: { maxQty?: number }): number {
  return (opt.maxQty ?? 1) * qty.value
}
function qtyOptionsForCard(opt: { id: number; maxQty?: number }): number[] {
  const remaining = totalPickCount.value - pickedTotal.value
  const cur = pickedQty.value[opt.id] ?? 0
  const max = Math.min(optMaxQtyCard(opt), cur + Math.max(remaining, 0))
  return Array.from({ length: max + 1 }, (_, i) => i)
}
function setPickQtyCard(opt: { id: number; spec: string }, n: number): void {
  pickedQty.value = { ...pickedQty.value, [opt.id]: n }
  if (n === 0) delete pickedSpecs.value[opt.id]
  else if (!pickedSpecs.value[opt.id]) pickedSpecs.value[opt.id] = opt.spec
}

function goDetail() {
  router.push({ path: `/product/${props.id}`, query: props.from ? { from: props.from } : {} })
}

function addToCart(spec: string, n: number) {
  cart.addItem({ id: props.id, name: props.name, price: props.price, original: props.original, image: props.image }, spec, n)
  ui.toast('已加入購物車')
}

function onPrimaryAction(e: MouseEvent) {
  e.stopPropagation()
  if (needsBundlePicker.value) {
    pickedQty.value = {}
    pickedSpecs.value = {}
    bundleSelections.value = product.value?.bundleItems?.map(i => i.spec) ?? []
    bundleDialogOpen.value = true
    return
  }
  if (props.hasVariant) {
    // 有規格 → 跳彈窗選規格；數量沿用卡片上選的數量
    dialogSize.value = sizes.value[0] ?? ''
    specDialogOpen.value = true
  } else {
    addToCart('預設', qty.value)
  }
}

function confirmSpecAdd() {
  if (sizes.value.length && !dialogSize.value) return
  addToCart(dialogSize.value || '預設', qty.value)
  specDialogOpen.value = false
}

/** 先加入待選擇：不要求挑滿規格，把組合商品先放進購物車，
 *  之後在購物車頁的內嵌挑選器補齊組合內容。 */
function pendingBundleAdd() {
  const p = product.value
  if (!p) return
  if (p.isPickBundle) {
    // 任選：把所有 pickOptions 帶入做為待挑清單（qty=0、spec=''），購物車展開後可補選
    const placeholderItems = (p.pickOptions ?? []).map(opt => ({
      name: opt.name,
      image: opt.image,
      spec: '',
      qty: 0,
    }))
    cart.addItem(
      { id: props.id, name: props.name, price: props.price, original: props.original, image: props.image },
      '待選擇',
      qty.value,
      placeholderItems,
    )
  } else {
    // 固定組合：以目錄子品為基礎、規格清空，由購物車頁面補挑
    const placeholderItems = (p.bundleItems ?? []).map(b => ({
      name: b.name,
      image: b.image,
      spec: b.specOptions?.length ? '' : b.spec,
      qty: b.qty,
    }))
    cart.addItem(
      { id: props.id, name: props.name, price: props.price, original: props.original, image: props.image },
      '待選擇',
      qty.value,
      placeholderItems,
    )
  }
  ui.toast('已加入購物車，記得至購物車補選規格')
  bundleDialogOpen.value = false
}

function confirmBundleAdd() {
  const p = product.value
  if (!p) return
  if (p.isPickBundle) {
    if (pickedTotal.value !== totalPickCount.value) {
      ui.toast(`請選擇 ${totalPickCount.value} 件商品`)
      return
    }
    const picked = Object.entries(pickedQty.value)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, n]) => {
        const opt = p.pickOptions?.find(o => o.id === Number(id))
        const spec = pickedSpecs.value[Number(id)] ?? opt?.spec ?? '預設'
        return { name: opt?.name ?? '', image: opt?.image, spec, qty: n as number }
      })
    const specLabel = picked.map(p2 => `${p2.name}（${p2.spec}）× ${p2.qty}`).join(' / ')
    cart.addItem(
      { id: props.id, name: props.name, price: props.price, original: props.original, image: props.image },
      specLabel,
      qty.value,
      picked,
    )
  } else {
    const specLabel = bundleSelections.value.length ? bundleSelections.value.join(' / ') : '預設'
    cart.addItem(
      { id: props.id, name: props.name, price: props.price, original: props.original, image: props.image },
      specLabel,
      qty.value,
    )
  }
  ui.toast('已加入購物車')
  bundleDialogOpen.value = false
}
</script>

<template>
  <div
    class="bg-white rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.06)] flex flex-col gap-2 p-2 w-full h-full cursor-pointer hover:shadow-md transition-shadow"
    @click="goDetail"
  >
    <!-- Product image -->
    <div class="aspect-[332/320] w-full bg-gray-100 overflow-hidden" :class="isPC ? 'rounded-[8px]' : 'rounded-[6px]'">
      <img v-if="image" :src="image" :alt="name" class="w-full h-full object-cover" />
      <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1.5">
        <i class="pi pi-hammer text-gray-300" :class="isPC ? 'text-4xl' : 'text-3xl'" />
        <span class="text-gray-400" :class="isPC ? 'text-sm' : 'text-[10px]'">圖片施工中</span>
      </div>
    </div>

    <!-- Product info -->
    <div class="flex flex-col flex-1 px-1 pt-1" :class="isPC ? 'gap-2 px-2 pt-2' : 'gap-1'">
      <!-- Title -->
      <p class="text-[#020617] font-medium leading-normal line-clamp-2 text-[1rem]">
        {{ name }}
      </p>

      <!-- Price -->
      <div class="flex flex-col gap-1">
        <span class="text-[#64748b] line-through" :class="isPC ? 'text-base' : 'text-xs'">NTD ${{ original }}</span>
        <span class="text-[#f43f5e] font-semibold" :class="isPC ? 'text-2xl' : 'text-base'">
          <span class="text-xs font-normal">NTD</span> ${{ price }}
        </span>
      </div>

      <!-- Quantity + CTA -->
      <div v-if="!hideActions" class="flex flex-col mt-auto" :class="isPC ? 'gap-2' : 'gap-1'">
        <!-- Quantity selector -->
        <div v-if="!simple" class="flex flex-col gap-1" @click.stop>
          <div class="flex items-center" :class="isPC ? 'gap-4' : 'gap-2'">
            <span class="text-[#334155]" :class="isPC ? 'text-sm' : 'text-sm'">數量</span>
            <InputNumber
              v-model="qty"
              :min="1"
              show-buttons
              button-layout="horizontal"
              increment-button-icon="pi pi-plus"
              decrement-button-icon="pi pi-minus"
              class="qty-stepper"
              :class="{ 'is-sm': !isPC }"
            />
          </div>
          <span class="text-[#334155]" :class="isPC ? 'text-sm' : 'text-xs'">還剩{{ stock ?? 11 }}件</span>
        </div>

        <!-- CTA Button — 一律「加入購物車」；有規格者點擊跳彈窗選規格 -->
        <button
          class="w-full flex items-center justify-center font-medium transition-colors"
          :class="isPC
            ? 'gap-2 px-4 py-3 rounded-lg text-base'
            : 'gap-1 px-3 min-h-[44px] py-2 rounded-lg text-sm'"
          style="background: var(--primary-bg); border: 1px solid var(--primary); color: #fff"
          @mouseover="(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover-bg)' }"
          @mouseleave="(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--primary-bg)' }"
          @click="onPrimaryAction"
        >
          <i class="pi pi-cart-plus" :class="isPC ? 'text-sm' : 'text-xl'" />
          <span v-if="isPC">加入購物車</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 選擇規格彈窗 -->
  <Dialog
    v-model:visible="specDialogOpen"
    modal
    header="選擇商品規格"
    :draggable="false"
    dismissable-mask
    :style="{ width: '360px', maxWidth: '90vw' }"
  >
    <div class="flex flex-col gap-4">
      <!-- 商品圖 + 名稱 -->
      <div class="flex gap-3">
        <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
          <img v-if="image" :src="image" :alt="name" class="w-full h-full object-cover" />
          <i v-else class="pi pi-hammer text-gray-300 text-xl" />
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-1">
          <p class="font-semibold text-[#334155] line-clamp-2 text-base">{{ name }}</p>
          <span class="font-bold text-lg" style="color: var(--primary)">${{ price }}</span>
        </div>
      </div>

      <!-- 規格 -->
      <div v-if="sizes.length" class="flex flex-col gap-2">
        <span class="text-sm font-medium text-[#334155]">規格</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in sizes"
            :key="s"
            type="button"
            class="px-4 min-h-[44px] rounded-md border text-sm transition-colors"
            :style="dialogSize === s
              ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }
              : { borderColor: '#e2e8f0', color: '#334155', background: '#fff' }"
            @click="dialogSize = s"
          >{{ s }}</button>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="取消" severity="secondary" outlined @click="specDialogOpen = false" />
      <Button label="加入購物車" icon="pi pi-cart-plus" :disabled="!!sizes.length && !dialogSize" @click="confirmSpecAdd" />
    </template>
  </Dialog>

  <!-- 組合商品挑選彈窗：任選 或 固定組合（含可選規格） -->
  <Dialog
    v-model:visible="bundleDialogOpen"
    modal
    :draggable="false"
    dismissable-mask
    :header="product?.isPickBundle ? `請選擇 ${totalPickCount} 件商品` : '選擇組合商品內容'"
    :style="{ width: '560px' }"
    :breakpoints="{ '768px': '92vw' }"
    @click.stop
  >
    <div @click.stop class="flex flex-col gap-4">
      <!-- 商品圖 + 名稱 + 主數量 -->
      <div class="flex gap-3">
        <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
          <img v-if="image" :src="image" :alt="name" class="w-full h-full object-cover" />
          <i v-else class="pi pi-hammer text-gray-300 text-xl" />
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-1">
          <p class="font-semibold text-[#334155] line-clamp-2 text-base">{{ name }}</p>
          <span class="font-bold text-lg" style="color: var(--primary)">${{ price }}</span>
        </div>
      </div>

      <!-- 主數量（買幾組） -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-[#334155] w-[60px] shrink-0">數量</span>
        <InputNumber
          v-model="qty"
          :min="1"
          show-buttons
          button-layout="horizontal"
          increment-button-icon="pi pi-plus"
          decrement-button-icon="pi pi-minus"
          class="qty-stepper"
        />
        <span class="text-sm text-[#64748b]">組</span>
      </div>

      <!-- 任選組合 -->
      <div v-if="product?.isPickBundle && product.pickOptions?.length" class="flex flex-col gap-3">
        <div class="text-sm" style="color: var(--primary)">已選 {{ pickedTotal }} / {{ totalPickCount }}</div>
        <div
          v-for="opt in product.pickOptions"
          :key="opt.id"
          class="flex gap-3 p-2 rounded-[8px] border-2 transition"
          :class="(pickedQty[opt.id] ?? 0) > 0
            ? 'border-[color:var(--primary)] bg-[color:color-mix(in_srgb,var(--primary)_6%,transparent)]'
            : 'border-[#e2e8f0]'"
        >
          <div class="w-[72px] h-[72px] bg-[#d9d9d9] rounded-[8px] overflow-hidden shrink-0">
            <img v-if="opt.image" :src="opt.image" :alt="opt.name" class="w-full h-full object-cover" />
          </div>
          <div class="flex flex-col gap-1.5 flex-1 min-w-0">
            <p class="text-sm text-[#020617] leading-snug line-clamp-2">{{ opt.name }}</p>
            <p
              v-if="opt.maxQty != null && opt.maxQty < (product.pickCount ?? 0)"
              class="text-xs font-medium"
              style="color: #ef4444"
            >限購 {{ optMaxQtyCard(opt) }} 個</p>
            <div class="flex flex-col gap-1.5">
              <div v-if="opt.specOptions?.length" class="flex items-center gap-2 text-sm text-[#334155]">
                <span class="shrink-0 text-[#64748b] w-[36px]">規格</span>
                <Select
                  :model-value="pickedSpecs[opt.id] ?? opt.spec"
                  :options="opt.specOptions"
                  size="small"
                  fluid
                  class="flex-1 min-w-0"
                  @update:model-value="(v) => (pickedSpecs[opt.id] = v)"
                />
              </div>
              <div class="flex items-center gap-2 text-sm text-[#334155]">
                <span class="shrink-0 text-[#64748b] w-[36px]">數量</span>
                <Select
                  :model-value="pickedQty[opt.id] ?? 0"
                  :options="qtyOptionsForCard(opt)"
                  size="small"
                  fluid
                  class="flex-1 min-w-0"
                  @update:model-value="(v) => setPickQtyCard(opt, v)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 固定組合：每個子商品挑規格 -->
      <div v-else-if="product?.isBundle && product.bundleItems?.length" class="flex flex-col gap-3">
        <div
          v-for="(item, idx) in product.bundleItems"
          :key="idx"
          class="flex gap-3 p-2 rounded-[8px] border border-[#e2e8f0]"
        >
          <div class="w-[72px] h-[72px] bg-[#d9d9d9] rounded-[8px] overflow-hidden shrink-0">
            <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
          </div>
          <div class="flex flex-col gap-1.5 flex-1 min-w-0">
            <p class="text-sm text-[#020617] leading-snug line-clamp-2">{{ item.name }}</p>
            <div class="flex items-center gap-2 text-sm text-[#334155]">
              <span class="shrink-0 text-[#64748b] w-[36px]">規格</span>
              <Select
                v-if="item.specOptions?.length"
                v-model="bundleSelections[idx]"
                :options="item.specOptions"
                size="small"
                fluid
                class="flex-1 min-w-0"
              />
              <span v-else>{{ item.spec }}</span>
            </div>
            <div class="flex gap-4 text-sm text-[#334155]">
              <span class="text-[#64748b] w-[36px]">數量</span>
              <span>{{ item.qty * qty }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="先加入待選擇" severity="secondary" outlined @click="pendingBundleAdd" />
      <Button label="加入購物車" icon="pi pi-cart-plus" @click="confirmBundleAdd" />
    </template>
  </Dialog>
</template>
