import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { products } from '../data/products'

export interface CartBundleItem {
  name: string
  image?: string
  spec: string
  qty: number
}

export interface CartItem {
  id: string
  productId?: number      // 對應商品目錄 id，可導向商品內頁
  name: string
  image?: string
  spec: string
  qty: number
  price: number
  original?: number
  checked: boolean
  isBundle?: boolean
  bundleExpanded?: boolean
  bundleItems?: CartBundleItem[]
}

export interface CartTag { label: string; type: 'info' | 'danger' | 'secondary' }

export interface CartGroup {
  id: number
  sellerName: string
  tags: CartTag[]
  items: CartItem[]
}

export const useCartStore = defineStore('cart', () => {
  const groups = ref<CartGroup[]>([
    {
      id: 1,
      sellerName: '春節烹飪好禮直播連線',
      tags: [{ label: '低溫配送', type: 'info' }],
      items: [
        {
          id: 'i1', productId: 13,
          name: '新款組合 包屁衣韓版小洋裝雙件組',
          image: products.find(p => p.id === 13)?.image,
          spec: '66cm,紫色', qty: 1, price: 290, original: 350,
          checked: true, isBundle: true, bundleExpanded: true,
          bundleItems: [
            { name: '新款 包屁衣韓版小洋裝', image: products.find(p => p.id === 3)?.image, spec: '黑-S', qty: 1 },
            { name: '新款 包屁衣韓版小洋裝', image: products.find(p => p.id === 7)?.image, spec: '白-S', qty: 1 },
          ],
        },
        {
          id: 'i1b', productId: 15,
          name: '新生兒入門必備三件組（固定組合）',
          image: products.find(p => p.id === 15)?.image,
          spec: '預設', qty: 1, price: 599, original: 890,
          checked: true, isBundle: true, bundleExpanded: true,
          bundleItems: products.find(p => p.id === 15)?.bundleItems?.map(b => ({
            name: b.name, image: b.image, spec: b.spec, qty: b.qty,
          })) ?? [],
        },
        {
          id: 'i2', productId: 1,
          name: '韓版秋冬女童泡泡袖針織洋裝 保暖舒適百搭款',
          image: products.find(p => p.id === 1)?.image,
          spec: '110cm', qty: 1, price: 350, original: 500,
          checked: true,
        },
        {
          id: 'i3', productId: 7,
          name: '嬰兒連帽爬服 卡通印花長袖爬爬服',
          image: products.find(p => p.id === 7)?.image,
          spec: '66cm', qty: 1, price: 169, original: 250,
          checked: true,
        },
      ],
    },
    {
      id: 2,
      sellerName: '兒童大廠清倉',
      tags: [
        { label: '一般配送', type: 'secondary' },
        { label: '禁止棄標', type: 'danger' },
      ],
      items: [
        {
          id: 'i4', productId: 13,
          name: '新款組合 包屁衣韓版小洋裝雙件組',
          image: products.find(p => p.id === 13)?.image,
          spec: '66cm', qty: 1, price: 290, original: 350,
          checked: false, isBundle: true, bundleExpanded: true,
          bundleItems: [
            { name: '新款 包屁衣韓版小洋裝 秋冬刺繡款', image: products.find(p => p.id === 3)?.image, spec: '', qty: 1 },
            { name: '新款 包屁衣韓版小洋裝 秋冬刺繡款', image: products.find(p => p.id === 7)?.image, spec: '白-S', qty: 1 },
          ],
        },
        {
          id: 'i5', productId: 7,
          name: '限量 MM巧克力男寶寶搞怪包屁衣',
          image: products.find(p => p.id === 7)?.image,
          spec: '66cm,藍色', qty: 1, price: 300,
          checked: false,
        },
      ],
    },
  ])

  const totalCount = computed(() =>
    groups.value.reduce((sum, g) => sum + g.items.length, 0)
  )

  function addItem(
    p: { id: number; name: string; price: number; original?: number; image?: string },
    spec = '預設',
    qty = 1,
    customBundleItems?: CartBundleItem[],
  ) {
    // 加入的商品一律放進第一台「可刪除」（未禁止棄標）的購物車；沒有就新建一台放最前面
    let target = groups.value.find(g => !g.tags.some(t => t.label === '禁止棄標'))
    if (!target) {
      target = { id: Date.now(), sellerName: '我的商店', tags: [], items: [] }
      groups.value.unshift(target)
    }
    // 同商品（同 productId）且同規格 → 合併累加數量，不另開一列
    const existing = target.items.find(i => i.productId === p.id && i.spec === spec)
    if (existing) {
      existing.qty += qty
      existing.checked = true
      return
    }
    // 依商品 id 從商品目錄補齊組合商品內容；任選組合則由呼叫端帶入實際挑選的 customBundleItems
    const cat = products.find(pr => pr.id === p.id)
    const resolvedBundleItems = customBundleItems ?? cat?.bundleItems
    target.items.push({
      id: `i_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      productId: p.id,
      name: p.name,
      image: p.image,
      spec,
      qty,
      price: p.price,
      original: p.original,
      checked: true,
      isBundle: cat?.isBundle,
      bundleExpanded: cat?.isBundle ? true : undefined,
      bundleItems: resolvedBundleItems,
    })
  }

  function removeItem(groupId: number, itemId: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (g) g.items = g.items.filter(i => i.id !== itemId)
  }

  return { groups, totalCount, addItem, removeItem }
})
