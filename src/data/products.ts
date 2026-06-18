export interface BundleItem {
  name: string
  image?: string
  /** 預設選用的規格（顯示用）；可由 specOptions 切換 */
  spec: string
  qty: number
  /** 此子品可選的規格清單；商品內頁顯示為下拉，user 可挑一個 */
  specOptions?: string[]
}

export interface PickOption {
  id: number
  name: string
  image?: string
  /** 預設規格 */
  spec: string
  /** 可切換規格 */
  specOptions?: string[]
  /** 此單品最多可挑選次數；未設定 → 視為 1（單一可選） */
  maxQty?: number
}

export interface Product {
  id: number
  name: string
  price: number
  original: number
  hasVariant?: boolean
  stock?: number
  sizes?: string[]
  category?: string
  image?: string
  noCoupon?: boolean
  isBundle?: boolean
  bundleItems?: BundleItem[]
  /** 任選組合：從 pickOptions 中挑 pickCount 項 */
  isPickBundle?: boolean
  pickCount?: number
  pickOptions?: PickOption[]
}

export const products: Product[] = [
  {
    id: 15,
    name: '新生兒入門必備三件組（固定組合）',
    price: 599, original: 890,
    stock: 8,
    category: '大童童裝',
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&fit=crop',
    isBundle: true,
    noCoupon: true,
    bundleItems: [
      {
        name: '寶寶純棉包屁衣',
        image: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&fit=crop',
        spec: '預設',
        qty: 1,
      },
      {
        name: '寶寶嬰兒紗布手帕 5 入組',
        image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '預設',
        qty: 1,
      },
      {
        name: '寶寶可愛印花圍兜',
        image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&fit=crop',
        spec: '預設',
        qty: 1,
      },
    ],
  },
  {
    id: 16,
    name: '任選 4 件 寶寶配件超值組合（部分限購）',
    price: 599, original: 980,
    stock: 6,
    category: '大童童裝',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&fit=crop',
    isBundle: true,
    isPickBundle: true,
    pickCount: 4,
    noCoupon: true,
    pickOptions: [
      {
        id: 201,
        name: '寶寶安撫奶嘴（限購 1）',
        image: 'https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=400&fit=crop',
        spec: '粉色',
        specOptions: ['粉色', '藍色', '黃色'],
        maxQty: 1,
      },
      {
        id: 202,
        name: '嬰兒抗 UV 遮陽帽（限購 1）',
        image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&fit=crop',
        spec: '黃-F',
        specOptions: ['黃-F', '藍-F'],
        maxQty: 1,
      },
      {
        id: 203,
        name: '寶寶嬰兒紗布手帕 5 入組（最多 2）',
        image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '白',
        specOptions: ['白', '黃', '粉'],
        maxQty: 2,
      },
      {
        id: 204,
        name: '寶寶柔嫩濕紙巾 80 抽',
        image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&fit=crop',
        spec: '預設',
      },
      {
        id: 205,
        name: '寶寶可愛印花圍兜口水巾',
        image: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&fit=crop',
        spec: '藍',
        specOptions: ['藍', '粉', '黃'],
      },
    ],
  },
  { id: 1,  name: '韓版秋冬女童泡泡袖針織洋裝 保暖舒適百搭款',          price: 350, original: 500, hasVariant: false, stock: 11, sizes: ['90cm','100cm','110cm','120cm'], category: '寶寶包屁' },
  { id: 2,  name: '男童純棉長袖上衣 撞色條紋圓領T',                     price: 280, original: 420, hasVariant: true,  stock: 8,  sizes: ['S','M','L','XL'],             category: '大童童裝' },
  { id: 3,  name: '寶寶連身包屁衣 有機棉長袖春秋款 0-18個月',           price: 199, original: 320, hasVariant: true,  stock: 15, sizes: ['66cm','73cm','80cm','90cm'],    category: '寶寶包屁', image: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600&fit=crop' },
  { id: 4,  name: '親子裝母女裝秋冬新款格紋棉麻長裙套裝',               price: 890, original: 1200, hasVariant: false, stock: 5, sizes: ['S','M','L'],                  category: '親子裝',   image: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=600&fit=crop', noCoupon: true },
  { id: 5,  name: '女童蕾絲公主裙 春夏薄款蓬蓬裙禮服',                  price: 450, original: 680, hasVariant: false, stock: 8,  sizes: ['100cm','110cm','120cm','130cm'], category: '小童童裝', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&fit=crop' },
  { id: 6,  name: '男童加絨加厚衝鋒衣外套 防風防水戶外機能款 超值優惠', price: 620, original: 980, hasVariant: false, stock: 3,  sizes: ['110cm','120cm','130cm','140cm'], category: '大童童裝', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&fit=crop', noCoupon: true },
  { id: 7,  name: '嬰兒連帽爬服 卡通印花長袖爬爬服',                    price: 169, original: 250, hasVariant: false, stock: 20, sizes: ['59cm','66cm','73cm','80cm'],    category: '寶寶包屁', image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&fit=crop' },
  { id: 8,  name: '女童牛仔短褲 夏季薄款休閒百搭',                      price: 220, original: 360, hasVariant: true,  stock: 12, sizes: ['100cm','110cm','120cm'],        category: '小童童裝', image: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=600&fit=crop' },
  { id: 9,  name: '男童運動套裝 速乾透氣短袖短褲兩件組',                price: 399, original: 560, hasVariant: false, stock: 14, sizes: ['110cm','120cm','130cm','140cm'], category: '大童童裝', image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&fit=crop' },
  { id: 10, name: '親子母子裝 夏季短袖棉麻寬鬆上衣',                    price: 580, original: 800, hasVariant: false, stock: 7,  sizes: ['S','M','L','XL'],              category: '親子裝',   image: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&fit=crop' },
  { id: 11, name: '女童碎花連衣裙 春款長袖娃娃領公主裙',                price: 320, original: 480, hasVariant: false, stock: 9,  sizes: ['100cm','110cm','120cm','130cm'], category: '小童童裝', image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&fit=crop' },
  { id: 12, name: '男童衛衣長褲套裝 秋冬加絨保暖兩件組',                price: 460, original: 650, hasVariant: false, stock: 6,  sizes: ['110cm','120cm','130cm'],        category: '大童童裝', image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&fit=crop' },
  {
    id: 13,
    name: '新款組合 包屁衣韓版小洋裝雙件組',
    price: 290, original: 350,
    stock: 1,
    category: '寶寶包屁',
    image: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600&fit=crop',
    isBundle: true,
    noCoupon: true,
    bundleItems: [
      {
        name: '新款 包屁衣韓版小洋裝 秋冬刺繡款',
        image: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&fit=crop',
        spec: '黑-S',
        qty: 1,
        specOptions: ['黑-S', '黑-M', '黑-L', '白-S', '白-M', '白-L'],
      },
      {
        name: '新款 包屁衣韓版小洋裝 秋冬刺繡款',
        image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '白-S',
        qty: 1,
        specOptions: ['黑-S', '黑-M', '黑-L', '白-S', '白-M', '白-L'],
      },
    ],
  },
  {
    id: 14,
    name: '任選 3 件 寶寶超值組合包',
    price: 499, original: 870,
    stock: 5,
    category: '寶寶包屁',
    image: 'https://images.unsplash.com/photo-1518830411533-cdf1d0517f47?w=600&fit=crop',
    isBundle: true,
    isPickBundle: true,
    pickCount: 3,
    noCoupon: true,
    pickOptions: [
      {
        id: 101,
        name: '寶寶連身包屁衣 有機棉長袖春秋款',
        image: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&fit=crop',
        spec: '黃-66cm',
        specOptions: ['黃-66cm', '黃-73cm', '白-66cm', '白-73cm'],
      },
      {
        id: 102,
        name: '嬰兒連帽爬服 卡通印花長袖款',
        image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '藍-66cm',
        specOptions: ['藍-66cm', '藍-73cm', '粉-66cm', '粉-73cm'],
      },
      {
        id: 103,
        name: 'MM 巧克力男寶寶搞怪包屁衣',
        image: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400&fit=crop',
        spec: '棕-66cm',
        specOptions: ['棕-66cm', '棕-73cm'],
      },
      {
        id: 104,
        name: '愛兒抗 UV 遮陽帽',
        image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&fit=crop',
        spec: '黃-F',
        specOptions: ['黃-F', '藍-F'],
      },
      {
        id: 105,
        name: '寶寶純棉雙層紗布巾',
        image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&fit=crop',
        spec: '白',
        specOptions: ['白', '黃', '粉'],
      },
      {
        id: 106,
        name: '寶寶可愛印花圍兜口水巾',
        image: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&fit=crop',
        spec: '藍',
        specOptions: ['藍', '粉', '黃'],
      },
    ],
  },
]
