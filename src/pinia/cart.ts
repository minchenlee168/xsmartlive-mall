import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { products } from '../data/products';
import type { CartGroup, CartItem, CartBundleItem } from '../types/cart';

// 型別 re-export，方便 store 使用者只 import 一處
export type {
  CartGroup,
  CartItem,
  CartBundleItem,
  CartTag,
} from '../types/cart';

export const useCartStore = defineStore('cart', () => {
  const groups = ref<CartGroup[]>([
    {
      id: 1,
      sellerName: '春節烹飪好禮直播連線',
      tags: [{ label: '低溫配送', type: 'info' }],
      items: [
        {
          id: 'i1',
          productId: 100,
          name: '新春海陸雙享套組',
          image: products.find((p) => p.id === 100)?.image,
          spec: '雙人份',
          qty: 1,
          price: 1280,
          original: 1580,
          checked: true,
          isBundle: true,
          bundleExpanded: true,
          bundleItems:
            products
              .find((p) => p.id === 100)
              ?.bundleItems?.map((b) => ({
                name: b.name,
                image: b.image,
                spec: b.spec,
                qty: b.qty,
              })) ?? [],
        },
        {
          id: 'i1b',
          productId: 101,
          name: '新手主廚三件組（固定組合）',
          image: products.find((p) => p.id === 101)?.image,
          spec: '預設',
          qty: 1,
          price: 899,
          original: 1290,
          checked: true,
          isBundle: true,
          bundleExpanded: true,
          bundleItems:
            products
              .find((p) => p.id === 101)
              ?.bundleItems?.map((b) => ({
                name: b.name,
                image: b.image,
                spec: b.spec,
                qty: b.qty,
              })) ?? [],
        },
        {
          id: 'i2',
          productId: 102,
          name: '挪威生鮮鮭魚切片 厚切真空包裝',
          image: products.find((p) => p.id === 102)?.image,
          spec: '500g',
          qty: 1,
          price: 380,
          original: 480,
          checked: true,
        },
        {
          id: 'i3',
          productId: 103,
          name: '古早味手工冷凍水餃 高麗菜豬肉口味',
          image: products.find((p) => p.id === 103)?.image,
          spec: '60顆/盒',
          qty: 1,
          price: 199,
          original: 250,
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
          id: 'i4',
          productId: 13,
          name: '新款組合 包屁衣韓版小洋裝雙件組',
          image: products.find((p) => p.id === 13)?.image,
          spec: '66cm',
          qty: 1,
          price: 290,
          original: 350,
          checked: false,
          isBundle: true,
          bundleExpanded: true,
          bundleItems: [
            {
              name: '新款 包屁衣韓版小洋裝 秋冬刺繡款',
              image: products.find((p) => p.id === 3)?.image,
              spec: '',
              qty: 1,
            },
            {
              name: '新款 包屁衣韓版小洋裝 秋冬刺繡款',
              image: products.find((p) => p.id === 7)?.image,
              spec: '白-S',
              qty: 1,
            },
          ],
        },
        {
          id: 'i5',
          productId: 7,
          name: '限量 MM巧克力男寶寶搞怪包屁衣',
          image: products.find((p) => p.id === 7)?.image,
          spec: '66cm,藍色',
          qty: 1,
          price: 300,
          checked: false,
        },
      ],
    },
  ]);

  const totalCount = computed(() =>
    groups.value.reduce((sum, g) => sum + g.items.length, 0),
  );

  function addItem(
    p: {
      id: number;
      name: string;
      price: number;
      original?: number;
      image?: string;
    },
    spec = '預設',
    qty = 1,
    customBundleItems?: CartBundleItem[],
  ) {
    // 加入的商品一律放進第一台「可刪除」（未禁止棄標）的購物車；沒有就新建一台放最前面
    let target = groups.value.find(
      (g) => !g.tags.some((t) => t.label === '禁止棄標'),
    );
    if (!target) {
      target = { id: Date.now(), sellerName: '我的商店', tags: [], items: [] };
      groups.value.unshift(target);
    }
    // 同商品（同 productId）且同規格 → 合併累加數量，不另開一列
    const existing = target.items.find(
      (i) => i.productId === p.id && i.spec === spec,
    );
    if (existing) {
      existing.qty += qty;
      existing.checked = true;
      return;
    }
    // 依商品 id 從商品目錄補齊組合商品內容；任選組合則由呼叫端帶入實際挑選的 customBundleItems
    const cat = products.find((pr) => pr.id === p.id);
    const resolvedBundleItems = customBundleItems ?? cat?.bundleItems;
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
    });
  }

  function removeItem(groupId: number, itemId: string) {
    const g = groups.value.find((g) => g.id === groupId);
    if (g) g.items = g.items.filter((i) => i.id !== itemId);
  }

  return { groups, totalCount, addItem, removeItem };
});
