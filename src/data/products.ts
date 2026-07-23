export interface BundleItem {
  name: string;
  image?: string;
  /** 預設選用的規格（顯示用）；可由 specOptions 切換 */
  spec: string;
  qty: number;
  /** 此子品可選的規格清單；商品內頁顯示為下拉，user 可挑一個 */
  specOptions?: string[];
}

export interface PickOption {
  id: number;
  name: string;
  image?: string;
  /** 預設規格 */
  spec: string;
  /** 可切換規格 */
  specOptions?: string[];
  /** 此單品最多可挑選次數；未設定 → 視為 1（單一可選） */
  maxQty?: number;
}

/** 多軸規格的一個軸，如「尺寸」「顏色」。 */
export interface SpecAxis {
  name: string;
  options: string[];
}

/** 一個 SKU 組合 + 剩餘庫存；spec 記錄各軸選值。 */
export interface Sku {
  id: string;
  /** 各規格軸選值，如 { 尺寸: '73cm', 顏色: '霧藍' } */
  spec: Record<string, string>;
  /** 剩餘庫存；0 → 售完不可選 */
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  original: number;
  hasVariant?: boolean;
  stock?: number;
  sizes?: string[];
  /** 多軸規格（尺寸 / 顏色…）；有此欄位 → 支援後選規格的 SKU 選擇。 */
  specAxes?: SpecAxis[];
  /** SKU 組合與庫存；後選規格時依此檢查各組合是否可選。 */
  skus?: Sku[];
  /** 已售完的尺寸（模擬缺貨）：選規格時顯示但不可選。 */
  soldOutSizes?: string[];
  /** 商品備註（賣家提醒 / 商品說明），顯示於商品內頁。 */
  note?: string;
  category?: string;
  image?: string;
  noCoupon?: boolean;
  isBundle?: boolean;
  bundleItems?: BundleItem[];
  /** 任選組合：從 pickOptions 中挑 pickCount 項 */
  isPickBundle?: boolean;
  pickCount?: number;
  pickOptions?: PickOption[];
}

export const products: Product[] = [
  // ─── 生鮮類（低溫配送）──────────────────────────────
  {
    id: 100,
    name: '新春海陸雙享套組',
    price: 1280,
    original: 1580,
    stock: 10,
    category: '生鮮',
    note: '本商品全程冷凍配送，收貨後請立即冷凍保存，建議 3 日內食用完畢。',
    image:
      'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&fit=crop',
    isBundle: true,
    noCoupon: true,
    bundleItems: [
      {
        name: '挪威生鮮鮭魚切片',
        image:
          'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&fit=crop',
        spec: '300g',
        qty: 1,
      },
      {
        name: '美國安格斯牛小排',
        image:
          'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&fit=crop',
        spec: '500g',
        qty: 1,
      },
    ],
  },
  {
    id: 101,
    name: '新手主廚三件組（固定組合）',
    price: 899,
    original: 1290,
    stock: 10,
    category: '生鮮',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&fit=crop',
    isBundle: true,
    noCoupon: true,
    bundleItems: [
      {
        name: '北海道生食級帆立貝',
        image:
          'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&fit=crop',
        spec: '12顆',
        qty: 1,
      },
      {
        name: '法國頂級櫻桃鴨胸',
        image:
          'https://images.unsplash.com/photo-1572441713132-c542fc4fe282?w=400&fit=crop',
        spec: '300g',
        qty: 1,
      },
      {
        name: '西班牙伊比利豬肋排',
        image:
          'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&fit=crop',
        spec: '500g',
        qty: 1,
      },
    ],
  },
  {
    id: 102,
    name: '挪威生鮮鮭魚切片 厚切真空包裝',
    price: 380,
    original: 480,
    stock: 10,
    category: '生鮮',
    image:
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&fit=crop',
    hasVariant: true,
    sizes: ['300g', '500g', '1kg'],
  },
  {
    id: 103,
    name: '古早味手工冷凍水餃 高麗菜豬肉口味',
    price: 199,
    original: 250,
    stock: 10,
    category: '生鮮',
    image:
      'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&fit=crop',
    hasVariant: true,
    sizes: ['30顆/盒', '60顆/盒', '100顆/盒'],
  },

  {
    id: 15,
    name: '新生兒入門必備三件組（固定組合）',
    price: 599,
    original: 890,
    stock: 10,
    category: '大童童裝',
    image:
      'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&fit=crop',
    isBundle: true,
    noCoupon: true,
    bundleItems: [
      {
        name: '寶寶純棉包屁衣',
        image:
          'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&fit=crop',
        spec: '預設',
        qty: 1,
      },
      {
        name: '寶寶嬰兒紗布手帕 5 入組',
        image:
          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '預設',
        qty: 1,
      },
      {
        name: '寶寶可愛印花圍兜',
        image:
          'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&fit=crop',
        spec: '預設',
        qty: 1,
      },
    ],
  },
  {
    id: 16,
    name: '任選 4 件 寶寶配件超值組合（部分限購）',
    price: 599,
    original: 980,
    stock: 10,
    category: '大童童裝',
    image:
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&fit=crop',
    isBundle: true,
    isPickBundle: true,
    pickCount: 4,
    noCoupon: true,
    pickOptions: [
      {
        id: 201,
        name: '寶寶安撫奶嘴（限購 1）',
        image:
          'https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=400&fit=crop',
        spec: '粉色',
        specOptions: ['粉色', '藍色', '黃色'],
        maxQty: 1,
      },
      {
        id: 202,
        name: '嬰兒抗 UV 遮陽帽（限購 1）',
        image:
          'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&fit=crop',
        spec: '黃-F',
        specOptions: ['黃-F', '藍-F'],
        maxQty: 1,
      },
      {
        id: 203,
        name: '寶寶嬰兒紗布手帕 5 入組（最多 2）',
        image:
          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '白',
        specOptions: ['白', '黃', '粉'],
        maxQty: 2,
      },
      {
        id: 204,
        name: '寶寶柔嫩濕紙巾 80 抽',
        image:
          'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&fit=crop',
        spec: '預設',
      },
      {
        id: 205,
        name: '寶寶可愛印花圍兜口水巾',
        image:
          'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&fit=crop',
        spec: '藍',
        specOptions: ['藍', '粉', '黃'],
      },
    ],
  },
  {
    id: 1,
    name: '韓版秋冬女童泡泡袖針織洋裝 保暖舒適百搭款',
    price: 350,
    original: 500,
    hasVariant: false,
    stock: 10,
    sizes: ['90cm', '100cm', '110cm', '120cm'],
    category: '寶寶包屁',
  },
  {
    id: 2,
    name: '男童純棉長袖上衣 撞色條紋圓領T',
    price: 280,
    original: 420,
    hasVariant: true,
    stock: 10,
    sizes: ['S', 'M', 'L', 'XL'],
    soldOutSizes: ['M'],
    note: '直播限定色，不參與退換貨；建議冷水手洗、勿漂白、勿烘乾。',
    category: '大童童裝',
  },
  {
    id: 3,
    name: '寶寶連身包屁衣 有機棉長袖春秋款 0-18個月',
    price: 199,
    original: 320,
    hasVariant: true,
    stock: 10,
    sizes: ['66cm', '73cm', '80cm', '90cm'],
    // 多軸 SKU（尺寸 × 10 種顏色）+ 庫存；供直播得標後挑選規格使用，含幾個售完組合示範
    specAxes: [
      { name: '尺寸', options: ['66cm', '73cm', '80cm'] },
      {
        name: '顏色',
        options: [
          '奶油白',
          '霧藍',
          '櫻花粉',
          '薄荷綠',
          '鵝黃',
          '奶茶',
          '珊瑚橘',
          '丁香紫',
          '石墨灰',
          '磚紅',
        ],
      },
    ],
    skus: [
      { id: 's3-66-01', spec: { 尺寸: '66cm', 顏色: '奶油白' }, stock: 150 },
      { id: 's3-66-02', spec: { 尺寸: '66cm', 顏色: '霧藍' }, stock: 150 },
      { id: 's3-66-03', spec: { 尺寸: '66cm', 顏色: '櫻花粉' }, stock: 150 },
      { id: 's3-66-04', spec: { 尺寸: '66cm', 顏色: '薄荷綠' }, stock: 0 },
      { id: 's3-66-05', spec: { 尺寸: '66cm', 顏色: '鵝黃' }, stock: 150 },
      { id: 's3-66-06', spec: { 尺寸: '66cm', 顏色: '奶茶' }, stock: 150 },
      { id: 's3-66-07', spec: { 尺寸: '66cm', 顏色: '珊瑚橘' }, stock: 150 },
      { id: 's3-66-08', spec: { 尺寸: '66cm', 顏色: '丁香紫' }, stock: 150 },
      { id: 's3-66-09', spec: { 尺寸: '66cm', 顏色: '石墨灰' }, stock: 150 },
      { id: 's3-66-10', spec: { 尺寸: '66cm', 顏色: '磚紅' }, stock: 150 },
      { id: 's3-73-01', spec: { 尺寸: '73cm', 顏色: '奶油白' }, stock: 0 },
      { id: 's3-73-02', spec: { 尺寸: '73cm', 顏色: '霧藍' }, stock: 150 },
      { id: 's3-73-03', spec: { 尺寸: '73cm', 顏色: '櫻花粉' }, stock: 150 },
      { id: 's3-73-04', spec: { 尺寸: '73cm', 顏色: '薄荷綠' }, stock: 150 },
      { id: 's3-73-05', spec: { 尺寸: '73cm', 顏色: '鵝黃' }, stock: 150 },
      { id: 's3-73-06', spec: { 尺寸: '73cm', 顏色: '奶茶' }, stock: 150 },
      { id: 's3-73-07', spec: { 尺寸: '73cm', 顏色: '珊瑚橘' }, stock: 0 },
      { id: 's3-73-08', spec: { 尺寸: '73cm', 顏色: '丁香紫' }, stock: 150 },
      { id: 's3-73-09', spec: { 尺寸: '73cm', 顏色: '石墨灰' }, stock: 150 },
      { id: 's3-73-10', spec: { 尺寸: '73cm', 顏色: '磚紅' }, stock: 150 },
      { id: 's3-80-01', spec: { 尺寸: '80cm', 顏色: '奶油白' }, stock: 150 },
      { id: 's3-80-02', spec: { 尺寸: '80cm', 顏色: '霧藍' }, stock: 0 },
      { id: 's3-80-03', spec: { 尺寸: '80cm', 顏色: '櫻花粉' }, stock: 150 },
      { id: 's3-80-04', spec: { 尺寸: '80cm', 顏色: '薄荷綠' }, stock: 150 },
      { id: 's3-80-05', spec: { 尺寸: '80cm', 顏色: '鵝黃' }, stock: 150 },
      { id: 's3-80-06', spec: { 尺寸: '80cm', 顏色: '奶茶' }, stock: 150 },
      { id: 's3-80-07', spec: { 尺寸: '80cm', 顏色: '珊瑚橘' }, stock: 150 },
      { id: 's3-80-08', spec: { 尺寸: '80cm', 顏色: '丁香紫' }, stock: 0 },
      { id: 's3-80-09', spec: { 尺寸: '80cm', 顏色: '石墨灰' }, stock: 150 },
      { id: 's3-80-10', spec: { 尺寸: '80cm', 顏色: '磚紅' }, stock: 150 },
    ],
    category: '寶寶包屁',
    image:
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600&fit=crop',
  },
  {
    id: 4,
    name: '親子裝母女裝秋冬新款格紋棉麻長裙套裝',
    price: 890,
    original: 1200,
    hasVariant: false,
    stock: 10,
    sizes: ['S', 'M', 'L'],
    category: '親子裝',
    image:
      'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=600&fit=crop',
    noCoupon: true,
  },
  {
    id: 5,
    name: '女童蕾絲公主裙 春夏薄款蓬蓬裙禮服',
    price: 450,
    original: 680,
    hasVariant: false,
    stock: 10,
    sizes: ['100cm', '110cm', '120cm', '130cm'],
    category: '小童童裝',
    image:
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&fit=crop',
  },
  {
    id: 6,
    name: '男童加絨加厚衝鋒衣外套 防風防水戶外機能款 超值優惠',
    price: 620,
    original: 980,
    hasVariant: false,
    stock: 10,
    sizes: ['110cm', '120cm', '130cm', '140cm'],
    category: '大童童裝',
    image:
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&fit=crop',
    noCoupon: true,
  },
  {
    id: 7,
    name: '嬰兒連帽爬服 卡通印花長袖爬爬服',
    price: 169,
    original: 250,
    hasVariant: false,
    stock: 10,
    sizes: ['59cm', '66cm', '73cm', '80cm'],
    category: '寶寶包屁',
    image:
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&fit=crop',
  },
  {
    id: 8,
    name: '女童牛仔短褲 夏季薄款休閒百搭',
    price: 220,
    original: 360,
    hasVariant: true,
    stock: 10,
    sizes: ['100cm', '110cm', '120cm'],
    // 多軸 SKU（尺寸 × 顏色）+ 庫存；供直播得標後挑選規格使用
    specAxes: [
      { name: '尺寸', options: ['100cm', '110cm', '120cm'] },
      { name: '顏色', options: ['淺藍', '深藍', '水洗灰'] },
    ],
    skus: [
      { id: 's8-100-01', spec: { 尺寸: '100cm', 顏色: '淺藍' }, stock: 150 },
      { id: 's8-100-02', spec: { 尺寸: '100cm', 顏色: '深藍' }, stock: 150 },
      { id: 's8-100-03', spec: { 尺寸: '100cm', 顏色: '水洗灰' }, stock: 0 },
      { id: 's8-110-01', spec: { 尺寸: '110cm', 顏色: '淺藍' }, stock: 150 },
      { id: 's8-110-02', spec: { 尺寸: '110cm', 顏色: '深藍' }, stock: 150 },
      { id: 's8-110-03', spec: { 尺寸: '110cm', 顏色: '水洗灰' }, stock: 150 },
      { id: 's8-120-01', spec: { 尺寸: '120cm', 顏色: '淺藍' }, stock: 0 },
      { id: 's8-120-02', spec: { 尺寸: '120cm', 顏色: '深藍' }, stock: 150 },
      { id: 's8-120-03', spec: { 尺寸: '120cm', 顏色: '水洗灰' }, stock: 150 },
    ],
    category: '小童童裝',
    image:
      'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=600&fit=crop',
  },
  {
    id: 9,
    name: '男童運動套裝 速乾透氣短袖短褲兩件組',
    price: 399,
    original: 560,
    hasVariant: false,
    stock: 10,
    sizes: ['110cm', '120cm', '130cm', '140cm'],
    category: '大童童裝',
    image:
      'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&fit=crop',
  },
  {
    id: 10,
    name: '親子母子裝 夏季短袖棉麻寬鬆上衣',
    price: 580,
    original: 800,
    hasVariant: false,
    stock: 10,
    sizes: ['S', 'M', 'L', 'XL'],
    category: '親子裝',
    image:
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&fit=crop',
  },
  {
    id: 11,
    name: '女童碎花連衣裙 春款長袖娃娃領公主裙',
    price: 320,
    original: 480,
    hasVariant: false,
    stock: 10,
    sizes: ['100cm', '110cm', '120cm', '130cm'],
    category: '小童童裝',
    image:
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&fit=crop',
  },
  {
    id: 12,
    name: '男童衛衣長褲套裝 秋冬加絨保暖兩件組',
    price: 460,
    original: 650,
    hasVariant: false,
    stock: 10,
    sizes: ['110cm', '120cm', '130cm'],
    category: '大童童裝',
    image:
      'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&fit=crop',
  },
  {
    id: 13,
    name: '新款組合 包屁衣韓版小洋裝雙件組',
    price: 290,
    original: 350,
    stock: 10,
    category: '寶寶包屁',
    image:
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=600&fit=crop',
    isBundle: true,
    noCoupon: true,
    bundleItems: [
      {
        name: '新款 包屁衣韓版小洋裝 秋冬刺繡款',
        image:
          'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&fit=crop',
        spec: '黑-S',
        qty: 1,
        specOptions: ['黑-S', '黑-M', '黑-L', '白-S', '白-M', '白-L'],
      },
      {
        name: '新款 包屁衣韓版小洋裝 秋冬刺繡款',
        image:
          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '白-S',
        qty: 1,
        specOptions: ['黑-S', '黑-M', '黑-L', '白-S', '白-M', '白-L'],
      },
    ],
  },
  {
    id: 14,
    name: '任選 3 件 寶寶超值組合包',
    price: 499,
    original: 870,
    stock: 10,
    category: '寶寶包屁',
    image:
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&fit=crop',
    isBundle: true,
    isPickBundle: true,
    pickCount: 3,
    noCoupon: true,
    pickOptions: [
      {
        id: 101,
        name: '寶寶連身包屁衣 有機棉長袖春秋款',
        image:
          'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&fit=crop',
        spec: '黃-66cm',
        specOptions: ['黃-66cm', '黃-73cm', '白-66cm', '白-73cm'],
      },
      {
        id: 102,
        name: '嬰兒連帽爬服 卡通印花長袖款',
        image:
          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '藍-66cm',
        specOptions: ['藍-66cm', '藍-73cm', '粉-66cm', '粉-73cm'],
      },
      {
        id: 103,
        name: 'MM 巧克力男寶寶搞怪包屁衣',
        image:
          'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400&fit=crop',
        spec: '棕-66cm',
        specOptions: ['棕-66cm', '棕-73cm'],
      },
      {
        id: 104,
        name: '愛兒抗 UV 遮陽帽',
        image:
          'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&fit=crop',
        spec: '黃-F',
        specOptions: ['黃-F', '藍-F'],
      },
      {
        id: 105,
        name: '寶寶純棉雙層紗布巾',
        image:
          'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&fit=crop',
        spec: '白',
        specOptions: ['白', '黃', '粉'],
      },
      {
        id: 106,
        name: '寶寶可愛印花圍兜口水巾',
        image:
          'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&fit=crop',
        spec: '藍',
        specOptions: ['藍', '粉', '黃'],
      },
    ],
  },

  // ─── 廠商出清 ──────────────────────────────────────
  {
    id: 200,
    name: '【出清】童裝鋪棉外套 不挑款福袋',
    price: 299,
    original: 990,
    stock: 10,
    category: '廠商出清',
    image:
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&fit=crop',
    hasVariant: true,
    sizes: ['100cm', '110cm', '120cm', '130cm'],
  },
  {
    id: 201,
    name: '【出清】經典素色棉T 三件組（固定組合）',
    price: 399,
    original: 870,
    stock: 10,
    category: '廠商出清',
    image:
      'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&fit=crop',
    isBundle: true,
    noCoupon: true,
    bundleItems: [
      {
        name: '純棉短袖 T 男童',
        image:
          'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&fit=crop',
        spec: '白-110cm',
        qty: 1,
      },
      {
        name: '純棉短袖 T 女童',
        image:
          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '粉-110cm',
        qty: 1,
      },
      {
        name: '純棉短袖 T 中性款',
        image:
          'https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=400&fit=crop',
        spec: '灰-110cm',
        qty: 1,
      },
    ],
  },
  {
    id: 202,
    name: '【出清】男女童冬季毛帽 限量花色',
    price: 99,
    original: 280,
    stock: 10,
    category: '廠商出清',
    image:
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&fit=crop',
    hasVariant: true,
    sizes: ['F'],
  },
  {
    id: 203,
    name: '【出清】童襪 12 雙超值組 隨機混色',
    price: 199,
    original: 480,
    stock: 10,
    category: '廠商出清',
    image:
      'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=600&fit=crop',
  },
  {
    id: 204,
    name: '【出清】兒童透明雨衣 最後 6 件',
    price: 149,
    original: 350,
    stock: 10,
    category: '廠商出清',
    image:
      'https://images.unsplash.com/photo-1519074069390-98277fc02a5d?w=600&fit=crop',
    hasVariant: true,
    sizes: ['S', 'M', 'L'],
  },
  {
    id: 205,
    name: '【出清】寶寶配件福袋 任選 3 件',
    price: 199,
    original: 690,
    stock: 10,
    category: '廠商出清',
    image:
      'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&fit=crop',
    isBundle: true,
    isPickBundle: true,
    pickCount: 3,
    noCoupon: true,
    pickOptions: [
      {
        id: 301,
        name: '寶寶純棉手帕',
        image:
          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop',
        spec: '白',
        specOptions: ['白', '黃', '粉'],
      },
      {
        id: 302,
        name: '寶寶印花圍兜',
        image:
          'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&fit=crop',
        spec: '藍',
        specOptions: ['藍', '粉', '黃'],
      },
      {
        id: 303,
        name: '寶寶安撫奶嘴',
        image:
          'https://images.unsplash.com/photo-1517242810446-cc8951b2be40?w=400&fit=crop',
        spec: '粉色',
        specOptions: ['粉色', '藍色', '黃色'],
      },
      {
        id: 304,
        name: '寶寶柔嫩濕紙巾 80 抽',
        image:
          'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400&fit=crop',
        spec: '預設',
      },
      {
        id: 305,
        name: '寶寶嬰兒鞋襪 兩雙裝',
        image:
          'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=400&fit=crop',
        spec: '0-12M',
        specOptions: ['0-12M', '12-24M'],
      },
    ],
  },
];
