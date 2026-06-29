<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MemberIcon from '../components/MemberIcon.vue';
import MyOrdersSection from '../components/member/MyOrdersSection.vue';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';
import { useAuthStore } from '../pinia/auth';
import { useUiStore } from '../pinia/ui';
import { useOrdersStore } from '../pinia/orders';
import { parseDashDate, formatDashDate } from '../utils/date';
import { useCountdown } from '../composables/useCountdown';

interface SocialAccount {
  key: string;
  label: string;
  icon: 'fb' | 'google' | 'line' | 'ig' | 'tiktok';
  bound: boolean;
  idLabel: string;
  accountId: string;
}
interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
  chain?: '7-11' | 'FamilyMart';
  storeName?: string;
}
interface PointRecord {
  type: 'earn' | 'deduct';
  title: string;
  date: string;
  expiry: string;
  amount: number;
  status: string;
}
interface OwnedCoupon {
  id: string;
  amount: string;
  title: string;
  scope: string;
  expiry: string;
  status: 'unused' | 'used' | 'expired';
}
interface ClaimableCoupon {
  id: string;
  amount: string;
  title: string;
  scope: string;
  expiry: string;
}

const MEMBER_ID = '422519347308064';
const NAV_ITEMS = [
  { key: 'orders', label: '我的訂單' },
  { key: 'points', label: '紅利點數' },
  { key: 'coupons', label: '優惠券' },
  { key: 'account', label: '個人帳號' },
];

/** NAV_ITEMS key 映射到 MemberIcon 接受的 name（coupons → coupon 單複數差異） */
const navIconName = (
  key: string,
): 'orders' | 'points' | 'account' | 'coupon' =>
  key === 'coupons' ? 'coupon' : (key as 'orders' | 'points' | 'account');
const ACCOUNT_SUB_ITEMS = [
  { key: 'profile', label: '會員資料' },
  { key: 'binding', label: '更改綁定帳號' },
  { key: 'address', label: '收件地址' },
  { key: 'password', label: '更改密碼' },
];
const VALID_NAVS = new Set(['orders', 'points', 'account', 'coupons']);
const PHONE_CODES = ['+886', '+852'];
const CITIES = ['台北市', '新北市', '桃園市', '台中市', '高雄市'];
const DISTRICT_MAP: Record<string, string[]> = {
  台北市: ['信義區', '大安區', '中山區', '內湖區'],
  新北市: ['板橋區', '新莊區', '三重區', '中和區'],
  桃園市: ['桃園區', '中壢區', '平鎮區', '龜山區'],
  台中市: ['西屯區', '北屯區', '南屯區', '大里區'],
  高雄市: ['三民區', '前鎮區', '左營區', '鳳山區'],
};
const POINTS_TABS = [
  { key: 'all', label: '全部明細' },
  { key: 'earn', label: '獲得紀錄' },
  { key: 'deduct', label: '扣抵紀錄' },
] as const;
const COUPON_TABS = [
  { key: 'all', label: '全部' },
  { key: 'unused', label: '未使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已過期' },
] as const;
const COUPON_STATUS_TEXT: Record<string, string> = {
  used: '已使用',
  expired: '已過期',
};
const POINTS_HISTORY: PointRecord[] = [
  {
    type: 'earn',
    title: '雙 11 限時活動贈送',
    date: '2026.01.20 23:00',
    expiry: '2026.01.20 23:00',
    amount: 12,
    status: '已入帳',
  },
  {
    type: 'deduct',
    title: '訂單編號10002132132 折抵',
    date: '2026.01.20 23:00',
    expiry: '2026.01.20 23:00',
    amount: -200,
    status: '已使用',
  },
  {
    type: 'earn',
    title: '會員生日',
    date: '2026.03.01 20:00',
    expiry: '2026.03.31 24:00',
    amount: 300,
    status: '已入帳',
  },
];
const EXPIRING_POINTS = 20.0;
const VERIFY_CODE_COOLDOWN_SEC = 60;
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/;

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();
const ordersStore = useOrdersStore();

const readTabFromRoute = (): string => {
  const q = route.query.tab;
  return typeof q === 'string' && VALID_NAVS.has(q) ? q : 'orders';
};
const activeNav = ref(readTabFromRoute());
const activeSub = ref('profile');

const handleEditProfile = () => {
  activeNav.value = 'account';
  activeSub.value = 'profile';
};

// Verification code countdown
const { remaining: codeCountdown, start: startCodeCountdown } = useCountdown();
const handleSendVerifyCode = () => {
  if (codeCountdown.value > 0) return;
  ui.toast('驗證碼已發送（示意）');
  startCodeCountdown(VERIFY_CODE_COOLDOWN_SEC);
};

watch(
  () => route.query.tab,
  () => {
    activeNav.value = readTabFromRoute();
  },
);

// Saved baseline — updated only after a successful save
const snapshot = reactive({
  name: '王小明',
  gender: 'male' as 'male' | 'female' | 'other',
  birthday: '1990-01-01',
  phoneCode: '+886',
  phone: '09123456789',
  email: 'abc@gmail.com',
});

// Profile form
const name = ref(snapshot.name);
const gender = ref<'male' | 'female' | 'other'>(snapshot.gender);
const birthday = ref<Date>(parseDashDate(snapshot.birthday));

// Phone form
const phoneCode = ref(snapshot.phoneCode);
const phone = ref(snapshot.phone);
const verifyCode = ref('');

// Email form
const email = ref(snapshot.email);

const isProfileDirty = computed(
  () =>
    name.value !== snapshot.name ||
    gender.value !== snapshot.gender ||
    formatDashDate(birthday.value) !== snapshot.birthday,
);
const isPhoneDirty = computed(
  () =>
    phoneCode.value !== snapshot.phoneCode || phone.value !== snapshot.phone,
);
const isEmailDirty = computed(() => email.value !== snapshot.email);

const handleSaveProfile = () => {
  if (!isProfileDirty.value) return;
  snapshot.name = name.value;
  snapshot.gender = gender.value;
  snapshot.birthday = formatDashDate(birthday.value);
};
const handleSavePhone = () => {
  if (!isPhoneDirty.value) return;
  snapshot.phoneCode = phoneCode.value;
  snapshot.phone = phone.value;
  verifyCode.value = '';
};
const handleSaveEmail = () => {
  if (!isEmailDirty.value) return;
  snapshot.email = email.value;
};

// Linked social accounts
const socialAccounts = ref<SocialAccount[]>([
  {
    key: 'fb',
    label: 'Facebook',
    icon: 'fb',
    bound: true,
    idLabel: 'FBID',
    accountId: '422519347308064',
  },
  {
    key: 'google',
    label: 'Google',
    icon: 'google',
    bound: false,
    idLabel: 'Google ID',
    accountId: '',
  },
  {
    key: 'line',
    label: 'Line',
    icon: 'line',
    bound: false,
    idLabel: 'LINE ID',
    accountId: '',
  },
  {
    key: 'ig',
    label: 'Instagram',
    icon: 'ig',
    bound: false,
    idLabel: 'IG 帳號',
    accountId: '',
  },
  {
    key: 'tiktok',
    label: 'Tik Tok',
    icon: 'tiktok',
    bound: false,
    idLabel: 'TikTok ID',
    accountId: '',
  },
]);
const genAccountId = (acc: SocialAccount) => {
  if (acc.icon === 'ig' || acc.icon === 'line')
    return '@wang_' + Math.random().toString(36).slice(2, 8);
  return String(Math.floor(1e14 + Math.random() * 9e14));
};
const handleToggleBind = (acc: SocialAccount) => {
  acc.bound = !acc.bound;
  if (acc.bound) {
    if (!acc.accountId) acc.accountId = genAccountId(acc);
    ui.toast(`已綁定 ${acc.label}`);
  } else {
    acc.accountId = '';
    ui.toast(`已解除綁定 ${acc.label}`);
  }
};

// Shipping addresses
const addressTab = ref<'home' | 'store'>('home');
const homeAddrs = ref<Address[]>([
  {
    id: 'h1',
    name: '王小明',
    phone: '+886 912****56',
    address: '台北市信義區忠孝東路五段 100 號 10 樓',
    isDefault: true,
  },
  {
    id: 'h2',
    name: '王小明',
    phone: '+886 912****56',
    address: '台中市西屯區台灣大道三段 99 號',
    isDefault: false,
  },
]);
const storeAddrs = ref<Address[]>([
  {
    id: 's1',
    name: '王小明',
    phone: '+886 912****56',
    chain: '7-11',
    storeName: '鑫工門市',
    address: '台北市信義區忠孝東路五段 100 號 10 樓',
    isDefault: true,
  },
  {
    id: 's2',
    name: '王小明',
    phone: '+886 912****56',
    chain: '7-11',
    storeName: '連興門市',
    address: '高雄市三民區大連街 314 號',
    isDefault: false,
  },
  {
    id: 's3',
    name: '王小明',
    phone: '+886 912****56',
    chain: 'FamilyMart',
    storeName: '平鎮上海店',
    address: '桃園市平鎮區上海路２０５號１樓',
    isDefault: false,
  },
]);
const currentAddrs = computed(() =>
  addressTab.value === 'home' ? homeAddrs.value : storeAddrs.value,
);
const handleSetDefaultAddr = (id: string) => {
  currentAddrs.value.forEach((a) => {
    a.isDefault = a.id === id;
  });
};

const isDeleteConfirmVisible = ref(false);
const pendingDeleteId = ref<string | null>(null);
const handleAskDeleteAddr = (id: string) => {
  pendingDeleteId.value = id;
  isDeleteConfirmVisible.value = true;
};
const deleteAddr = (id: string) => {
  const list = addressTab.value === 'home' ? homeAddrs : storeAddrs;
  const wasDefault = list.value.find((a) => a.id === id)?.isDefault;
  list.value = list.value.filter((a) => a.id !== id);
  if (
    wasDefault &&
    list.value.length > 0 &&
    !list.value.some((a) => a.isDefault)
  ) {
    list.value[0].isDefault = true;
  }
  ui.toast(addressTab.value === 'home' ? '宅配地址已刪除' : '超商門市已刪除');
};
const handleConfirmDeleteAddr = () => {
  if (pendingDeleteId.value) deleteAddr(pendingDeleteId.value);
  isDeleteConfirmVisible.value = false;
  pendingDeleteId.value = null;
};

// Points
const pointsTab = ref<'all' | 'earn' | 'deduct'>('all');
const filteredPoints = computed(() =>
  pointsTab.value === 'all'
    ? POINTS_HISTORY
    : POINTS_HISTORY.filter((p) => p.type === pointsTab.value),
);
const handleUsePoints = () => {
  ui.toast('已前往購物車，可於結帳折抵紅利點數');
  router.push('/cart');
};

// Coupons
const couponTab = ref<'all' | 'unused' | 'used' | 'expired'>('all');
const ownedCoupons = ref<OwnedCoupon[]>([
  {
    id: 'o1',
    amount: '折?元/?折',
    title: '滿千折百優惠券（滿1000元使用）',
    scope: '適用範圍（直播場次）：我是直播場次-2025-12-24',
    expiry: '有效期限 2026.01.20 23:00',
    status: 'unused',
  },
  {
    id: 'o2',
    amount: '折50元',
    title: '新客優惠券（滿499元使用）',
    scope: '新客首單 $499 現折 $50',
    expiry: '有效期限 2026.01.20 23:00',
    status: 'unused',
  },
  {
    id: 'o3',
    amount: '折50元',
    title: '新客優惠券（全站使用）',
    scope: '適用範圍：全站',
    expiry: '有效期限 2026.01.20 23:00',
    status: 'unused',
  },
  {
    id: 'o4',
    amount: '95折',
    title: '註冊禮金額優惠券（不限金額使用）',
    scope: '適用範圍：全站',
    expiry: '有效期限 2026.01.20 23:00',
    status: 'used',
  },
  {
    id: 'o5',
    amount: '折1000元',
    title: '新客優惠券（全站使用）',
    scope: '適用範圍：全站',
    expiry: '有效期限 2026.01.20 23:00',
    status: 'expired',
  },
]);
const claimableCoupons = ref<ClaimableCoupon[]>([
  {
    id: 'c1',
    amount: '折50%',
    title: '生日禮券',
    scope: '適用範圍：全站',
    expiry: '有效期限 2026.01.30 23:00',
  },
  {
    id: 'c2',
    amount: '折20元',
    title: '新客優惠券（全站使用）',
    scope: '適用範圍：全站',
    expiry: '有效期限 2026.01.30 23:00',
  },
  {
    id: 'c3',
    amount: '折50%',
    title: '生日禮券',
    scope: '適用範圍：全站',
    expiry: '有效期限 2026.01.30 23:00',
  },
  {
    id: 'c4',
    amount: '折20元',
    title: '新客優惠券（全站使用）',
    scope: '適用範圍：全站',
    expiry: '有效期限 2026.01.30 23:00',
  },
]);
const filteredCoupons = computed(() =>
  couponTab.value === 'all'
    ? ownedCoupons.value
    : ownedCoupons.value.filter((c) => c.status === couponTab.value),
);
const handleUseCoupon = () => {
  ui.toast('已套用優惠券，前往購物車結帳');
  router.push('/cart');
};
const handleClaimCoupon = (c: ClaimableCoupon) => {
  ownedCoupons.value.unshift({
    id: `o_${Date.now()}`,
    amount: c.amount,
    title: c.title,
    scope: c.scope,
    expiry: c.expiry,
    status: 'unused',
  });
  claimableCoupons.value = claimableCoupons.value.filter((x) => x.id !== c.id);
  // 領取後自動切到「未使用」tab，方便看到剛入手的優惠券
  couponTab.value = 'unused';
  ui.toast('已領取優惠券');
};

// Change password
const pwCurrent = ref('');
const pwNew = ref('');
const pwConfirm = ref('');
const isPwNewValid = computed(() => PASSWORD_RULE.test(pwNew.value));
const isPwMismatch = computed(
  () => !!pwConfirm.value && pwNew.value !== pwConfirm.value,
);
const canChangePw = computed(
  () =>
    !!pwCurrent.value &&
    isPwNewValid.value &&
    !isPwMismatch.value &&
    !!pwConfirm.value,
);
const handleChangePassword = () => {
  if (!canChangePw.value) return;
  pwCurrent.value = '';
  pwNew.value = '';
  pwConfirm.value = '';
  ui.toast('密碼已更新');
};

// 圖示（存放於 public/member-icons/，以 BASE_URL 引入）
const sevenIcon = `${import.meta.env.BASE_URL}member-icons/seven.png`;
const familyIcon = `${import.meta.env.BASE_URL}member-icons/family.png`;
const socialIconSrc = (icon: SocialAccount['icon']) => {
  const slug = icon === 'fb' ? 'facebook' : icon === 'ig' ? 'instagram' : icon;
  return `${import.meta.env.BASE_URL}member-icons/${slug}.svg`;
};

// --- Add / Edit address dialog ---
const isAddrDialogVisible = ref(false);
const addrDialogMode = ref<'add' | 'edit'>('add');
const editingId = ref<string | null>(null);
const form = reactive({
  name: '',
  countryCode: '+886',
  phone: '',
  city: '台北市',
  district: '信義區',
  detail: '',
  chain: '7-11' as '7-11' | 'FamilyMart',
  storeName: '',
});
const districts = computed(() => DISTRICT_MAP[form.city] ?? []);

const resetForm = () => {
  form.name = '';
  form.countryCode = '+886';
  form.phone = '';
  form.city = '台北市';
  form.district = '信義區';
  form.detail = '';
  form.chain = '7-11';
  form.storeName = '';
};
const handleOpenAddAddr = () => {
  addrDialogMode.value = 'add';
  editingId.value = null;
  resetForm();
  isAddrDialogVisible.value = true;
};
const handleOpenEditAddr = (addr: Address) => {
  addrDialogMode.value = 'edit';
  editingId.value = addr.id;
  resetForm();
  form.name = addr.name;
  form.phone = addr.phone.replace(/^\+\d+\s*/, '');
  form.detail = addr.address;
  if (addr.chain) form.chain = addr.chain;
  if (addr.storeName) form.storeName = addr.storeName;
  isAddrDialogVisible.value = true;
};
const isFormValid = computed(() => {
  if (!form.name.trim() || !form.phone.trim()) return false;
  if (addressTab.value === 'home') return !!form.detail.trim();
  return !!form.storeName.trim() && !!form.detail.trim();
});
const handleSaveAddr = () => {
  if (!isFormValid.value) return;
  const list = addressTab.value === 'home' ? homeAddrs : storeAddrs;
  const phoneFull = `${form.countryCode} ${form.phone}`;
  if (addrDialogMode.value === 'edit' && editingId.value) {
    const target = list.value.find((a) => a.id === editingId.value);
    if (target) {
      target.name = form.name;
      target.phone = phoneFull;
      target.address = form.detail;
      if (addressTab.value === 'store') {
        target.chain = form.chain;
        target.storeName = form.storeName;
      }
    }
  } else {
    const base: Address = {
      id: `${addressTab.value === 'home' ? 'h' : 's'}_${Date.now()}`,
      name: form.name,
      phone: phoneFull,
      address:
        addressTab.value === 'home'
          ? `${form.city}${form.district} ${form.detail}`
          : form.detail,
      isDefault: list.value.length === 0,
    };
    if (addressTab.value === 'store') {
      base.chain = form.chain;
      base.storeName = form.storeName;
    }
    list.value.push(base);
  }
  isAddrDialogVisible.value = false;
  ui.toast(addrDialogMode.value === 'edit' ? '地址已更新' : '地址已新增');
};
</script>

<template>
  <div class="flex min-h-screen flex-col" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <!-- Profile summary bar：手機只在「個人帳號」分頁顯示；平板/PC 永遠顯示 -->
    <div
      class="border-b border-slate-200 bg-white"
      :class="activeNav === 'account' ? '' : 'hidden @4xl:block'"
    >
      <!-- 手機版：上半身份（垂直置中：頭像 / 姓名 / 會員編號），下方紅利點數 vs 優惠券 左右一列 -->
      <!-- padding 跟 main 用同一組 CSS var，紅利/優惠券列才能跟下方 card 外緣對齊 -->
      <div
        class="flex flex-col items-center gap-2 @4xl:hidden"
        style="padding: var(--page-pad-y) var(--page-pad-x)"
      >
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl font-medium text-slate-600"
        >
          {{ auth.avatarLetter }}
        </div>
        <p class="text-base font-bold text-slate-950">{{ name }}</p>
        <p class="text-xs text-slate-500">{{ MEMBER_ID }}</p>

        <!-- 紅利點數 / 優惠券一列：寬度縮到跟下方 card 的內容區同寬（兩側各扣 card-pad） -->
        <div
          class="mt-3 flex items-center justify-between border-t border-slate-200 pt-3"
          :style="{ width: 'calc(100% - 2 * var(--card-pad))' }"
        >
          <button
            class="-mx-2 flex min-h-10 items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-100 active:bg-slate-200"
            aria-label="前往紅利點數"
            @click="activeNav = 'points'"
          >
            <MemberIcon name="points" :size="18" />
            <span class="text-base text-slate-700">紅利點數</span>
            <span class="text-base font-medium text-amber-500">{{
              auth.rewardPoints.toFixed(2)
            }}</span>
            <i class="pi pi-chevron-right ml-0.5 text-xs text-slate-400" />
          </button>
          <button
            class="-mx-2 flex min-h-10 items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-100 active:bg-slate-200"
            aria-label="前往優惠券"
            @click="activeNav = 'coupons'"
          >
            <MemberIcon name="coupon" :size="18" />
            <span class="text-base text-slate-700">優惠券</span>
            <span class="text-base font-medium" style="color: var(--primary)"
              >{{ auth.couponCount }} 張</span
            >
            <i class="pi pi-chevron-right ml-0.5 text-xs text-slate-400" />
          </button>
        </div>
      </div>

      <!-- 平板 / PC 版：維持原本完整排版 -->
      <div
        class="mx-auto hidden max-w-7xl px-4 py-5 @4xl:block @4xl:flex @4xl:items-center @4xl:gap-12"
      >
        <!-- Identity -->
        <div class="flex min-w-0 flex-1 items-center gap-4">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-2xl font-medium text-slate-600 @3xl:h-16 @3xl:w-16"
          >
            {{ auth.avatarLetter }}
          </div>
          <div class="min-w-0">
            <p class="text-lg font-bold text-slate-950">{{ name }}</p>
            <p class="text-xs text-slate-500">{{ MEMBER_ID }}</p>
            <Button
              label="編輯個人檔案"
              icon="pi pi-pencil"
              icon-pos="right"
              link
              size="small"
              class="mt-1 !p-0"
              @click="handleEditProfile"
            />
          </div>
        </div>

        <!-- Points + Coupons group：平板並排 card row、PC 與身份同列 -->
        <div
          class="mt-5 flex flex-col gap-3 @3xl:flex-row @3xl:gap-0 @3xl:rounded-xl @3xl:border @3xl:border-slate-200 @3xl:bg-slate-50 @4xl:mt-0 @4xl:contents @4xl:rounded-none @4xl:border-0 @4xl:bg-transparent"
        >
          <div
            class="flex shrink-0 flex-col gap-1.5 @3xl:flex-1 @3xl:p-4 @4xl:p-0"
          >
            <div class="flex items-center gap-2">
              <MemberIcon name="points" :size="20" class="shrink-0" />
              <span class="font-medium text-slate-700">紅利點數</span>
              <Button
                icon="pi pi-chevron-right"
                severity="secondary"
                outlined
                size="small"
                class="ml-auto @4xl:ml-1"
                @click="activeNav = 'points'"
              />
            </div>
            <p class="text-sm text-slate-700">
              目前剩餘點數：<span class="font-medium text-amber-500">{{
                auth.rewardPoints.toFixed(2)
              }}</span>
            </p>
          </div>

          <div
            class="my-3 hidden w-px self-stretch bg-slate-200 @4xl:block @4xl:hidden"
          />

          <div
            class="flex shrink-0 flex-col gap-1.5 @3xl:flex-1 @3xl:p-4 @4xl:p-0"
          >
            <div class="flex items-center gap-2">
              <MemberIcon name="coupon" :size="20" class="shrink-0" />
              <span class="font-medium text-slate-700">優惠券</span>
              <Button
                icon="pi pi-chevron-right"
                severity="secondary"
                outlined
                size="small"
                class="ml-auto @4xl:ml-1"
                @click="activeNav = 'coupons'"
              />
            </div>
            <p class="text-sm text-slate-700">
              總張數：<span style="color: var(--primary)" class="font-medium"
                >{{ auth.couponCount }}張</span
              >
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 個人帳號子分頁下拉（手機 only；放在 profile summary bar 下方）-->
    <div v-if="activeNav === 'account'" class="px-4 pt-3 @4xl:hidden">
      <Select
        v-model="activeSub"
        :options="ACCOUNT_SUB_ITEMS"
        option-label="label"
        option-value="key"
        class="w-full"
      />
    </div>

    <!-- Content -->
    <main
      class="mx-auto flex w-full max-w-7xl flex-1 flex-col @4xl:flex-row"
      style="
        padding: var(--page-pad-y) var(--page-pad-x);
        gap: var(--stack-gap);
      "
    >
      <!-- Sidebar — 手機隱藏（改走下方 fixed bar）；平板以上仍是上方/側邊 card -->
      <aside
        v-if="activeNav !== 'coupons'"
        class="hidden w-full shrink-0 @4xl:block @4xl:w-[220px]"
      >
        <div class="shadow-card card-pad rounded-xl bg-white">
          <template v-for="item in NAV_ITEMS" :key="item.key">
            <button
              class="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors"
              :class="
                activeNav === item.key ? '' : 'text-slate-700 hover:bg-slate-50'
              "
              :style="
                activeNav === item.key
                  ? 'background: var(--primary-surface); color: var(--primary)'
                  : ''
              "
              @click="activeNav = item.key"
            >
              <MemberIcon
                :name="navIconName(item.key)"
                :size="20"
                class="shrink-0"
              />
              <span class="text-sm font-medium">{{ item.label }}</span>
            </button>
            <div
              v-if="item.key === 'account' && activeNav === 'account'"
              class="flex flex-col"
            >
              <button
                v-for="sub in ACCOUNT_SUB_ITEMS"
                :key="sub.key"
                class="w-full rounded-lg py-2.5 pr-4 pl-12 text-left text-sm transition-colors"
                :class="
                  activeSub === sub.key ? 'font-medium' : 'text-slate-500'
                "
                :style="activeSub === sub.key ? 'color: var(--primary)' : ''"
                @click="
                  activeNav = 'account';
                  activeSub = sub.key;
                "
              >
                {{ sub.label }}
              </button>
            </div>
          </template>
        </div>
      </aside>

      <!-- Right column -->
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <!-- 我的訂單（對齊 Figma 設計） -->
        <MyOrdersSection v-if="activeNav === 'orders'" />

        <!-- 紅利點數 -->
        <template v-else-if="activeNav === 'points'">
          <!-- Top cards -->
          <div class="flex flex-col gap-4 @3xl:flex-row">
            <div
              class="shadow-card card-pad flex flex-1 items-center justify-between gap-4 rounded-xl bg-white"
            >
              <div>
                <p class="text-sm text-slate-600">目前可使用紅利點數</p>
                <p
                  class="mt-1 text-3xl font-bold"
                  style="color: var(--primary)"
                >
                  {{ auth.rewardPoints.toFixed(2) }}
                </p>
              </div>
              <Button
                label="立即使用"
                class="!min-h-11 shrink-0"
                @click="handleUsePoints"
              />
            </div>
            <div
              class="shadow-card card-pad rounded-xl bg-white @3xl:w-[260px]"
            >
              <p class="text-sm text-slate-600">即將到期 (30天內)</p>
              <p class="mt-1 text-3xl font-bold text-slate-700">
                {{ EXPIRING_POINTS.toFixed(2) }}
              </p>
            </div>
          </div>

          <!-- Usage records -->
          <section class="shadow-card card-pad rounded-xl bg-white">
            <h2 class="text-lg font-bold text-slate-950">紅利點數使用紀錄</h2>

            <div class="mt-3 flex items-center gap-6 border-b border-slate-200">
              <button
                v-for="t in POINTS_TABS"
                :key="t.key"
                class="-mb-px border-b-2 pb-2 text-sm font-medium transition-colors"
                :class="
                  pointsTab === t.key ? '' : 'border-transparent text-slate-500'
                "
                :style="
                  pointsTab === t.key
                    ? 'color: var(--primary); border-color: var(--primary)'
                    : ''
                "
                @click="pointsTab = t.key"
              >
                {{ t.label }}
              </button>
            </div>

            <div class="flex flex-col">
              <div
                v-for="(h, hi) in filteredPoints"
                :key="hi"
                class="flex items-center gap-4 py-4"
                :class="
                  hi !== filteredPoints.length - 1
                    ? 'border-b border-slate-200'
                    : ''
                "
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  :class="h.type === 'earn' ? 'bg-green-100' : 'bg-slate-100'"
                >
                  <i
                    :class="[
                      'pi text-sm',
                      h.type === 'earn'
                        ? 'pi-arrow-down-left text-green-600'
                        : 'pi-arrow-up-right text-slate-500',
                    ]"
                  />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-slate-700">{{ h.title }}</p>
                  <div
                    class="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500"
                  >
                    <span class="flex items-center gap-1"
                      ><i class="pi pi-calendar text-xs" />{{ h.date }}</span
                    >
                    <span>有效期限至 {{ h.expiry }}</span>
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <p
                    class="text-base font-bold"
                    :class="h.amount >= 0 ? 'text-green-600' : 'text-slate-700'"
                  >
                    {{ h.amount >= 0 ? '+ ' : '- '
                    }}{{ Math.abs(h.amount).toFixed(2) }}
                  </p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ h.status }}</p>
                </div>
              </div>
              <div
                v-if="filteredPoints.length === 0"
                class="py-10 text-center text-sm text-slate-500"
              >
                此分類目前沒有紀錄
              </div>
            </div>
          </section>
        </template>

        <!-- 優惠券 — full width, no card wrapper -->
        <section v-else-if="activeNav === 'coupons'">
          <h2 class="text-lg font-bold text-slate-950">優惠券</h2>

          <!-- Tabs -->
          <div class="mt-3 flex items-center gap-6 border-b border-slate-200">
            <button
              v-for="t in COUPON_TABS"
              :key="t.key"
              class="-mb-px border-b-2 pb-2 text-sm font-medium transition-colors"
              :class="
                couponTab === t.key ? '' : 'border-transparent text-slate-500'
              "
              :style="
                couponTab === t.key
                  ? 'color: var(--primary); border-color: var(--primary)'
                  : ''
              "
              @click="couponTab = t.key"
            >
              {{ t.label }}
            </button>
          </div>

          <!-- Owned coupons grid -->
          <div class="mt-4 grid grid-cols-1 gap-3 @4xl:grid-cols-2">
            <div
              v-for="c in filteredCoupons"
              :key="c.id"
              class="flex min-h-[120px] overflow-hidden rounded-[10px] border border-slate-200 bg-white"
            >
              <div
                class="flex w-[150px] shrink-0 flex-col items-center justify-center gap-2 px-3"
                :class="c.status === 'unused' ? '' : 'bg-slate-100'"
                :style="
                  c.status === 'unused'
                    ? 'background: var(--primary-surface)'
                    : ''
                "
              >
                <MemberIcon
                  v-if="c.status === 'unused'"
                  name="coupon"
                  :size="26"
                />
                <i v-else class="pi pi-ticket text-xl text-slate-400" />
                <span
                  class="text-center text-xl leading-tight font-bold"
                  :class="c.status === 'unused' ? '' : 'text-slate-400'"
                  :style="c.status === 'unused' ? 'color: var(--primary)' : ''"
                  >{{ c.amount }}</span
                >
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-1.5 px-4 py-3">
                <p class="line-clamp-2 text-sm font-medium text-slate-700">
                  {{ c.title }}
                </p>
                <span
                  class="self-start rounded px-2 py-0.5 text-xs"
                  :class="
                    c.scope.includes('直播場次')
                      ? 'bg-red-100 text-red-600'
                      : ''
                  "
                  :style="
                    c.scope.includes('直播場次')
                      ? ''
                      : 'background: var(--primary-surface); color: var(--primary)'
                  "
                  >{{ c.scope }}</span
                >
                <p class="text-xs text-slate-500">有效期限 {{ c.expiry }}</p>
                <div class="mt-auto flex justify-end pt-1">
                  <Button
                    v-if="c.status === 'unused'"
                    label="去使用"
                    outlined
                    size="small"
                    @click="handleUseCoupon"
                  />
                  <span v-else class="text-xs text-slate-400">{{
                    COUPON_STATUS_TEXT[c.status]
                  }}</span>
                </div>
              </div>
            </div>
            <div
              v-if="filteredCoupons.length === 0"
              class="col-span-full py-10 text-center text-sm text-slate-500"
            >
              此分類目前沒有優惠券
            </div>
          </div>

          <!-- Claimable -->
          <div class="my-5 flex items-center gap-3">
            <div class="h-px flex-1 bg-slate-200" />
            <span class="text-sm font-medium text-slate-600">領取更多優惠</span>
            <div class="h-px flex-1 bg-slate-200" />
          </div>
          <div class="grid grid-cols-1 gap-3 @4xl:grid-cols-2">
            <div
              v-for="c in claimableCoupons"
              :key="c.id"
              class="flex min-h-[120px] overflow-hidden rounded-[10px] bg-white"
            >
              <div
                class="flex w-[150px] shrink-0 flex-col items-center justify-center gap-2 px-3 text-white"
                style="background: var(--primary-bg)"
              >
                <i class="pi pi-ticket text-2xl" />
                <span class="text-center text-2xl leading-tight font-bold">{{
                  c.amount
                }}</span>
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-1.5 px-4 py-3">
                <p class="line-clamp-2 text-sm font-bold text-slate-950">
                  {{ c.title }}
                </p>
                <span
                  class="self-start rounded px-2 py-0.5 text-xs"
                  :class="
                    c.scope.includes('直播場次')
                      ? 'bg-red-100 text-red-600'
                      : ''
                  "
                  :style="
                    c.scope.includes('直播場次')
                      ? ''
                      : 'background: var(--primary-surface); color: var(--primary)'
                  "
                  >{{ c.scope }}</span
                >
                <p class="text-xs text-slate-500">有效期限至 {{ c.expiry }}</p>
                <div class="mt-auto flex justify-end pt-1">
                  <Button
                    label="領取"
                    size="small"
                    @click="handleClaimCoupon(c)"
                  />
                </div>
              </div>
            </div>
            <div
              v-if="claimableCoupons.length === 0"
              class="col-span-full py-6 text-center text-sm text-slate-500"
            >
              目前沒有可領取的優惠券
            </div>
          </div>
        </section>

        <template v-else-if="activeSub === 'profile'">
          <!-- 會員資料 -->
          <section class="shadow-card card-pad rounded-xl bg-white">
            <h2 class="text-lg font-bold text-slate-950">會員資料</h2>
            <p
              class="mt-1 border-b border-slate-200 pb-4 text-sm text-slate-500"
            >
              管理您的檔案以保護您的帳號
            </p>

            <div class="flex max-w-[440px] flex-col gap-4 pt-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-sm text-slate-700">姓名</label>
                <InputText v-model="name" class="w-full" />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-sm text-slate-700">性別</label>
                <div class="flex items-center gap-6">
                  <div class="flex items-center gap-2 text-sm text-slate-700">
                    <RadioButton
                      v-model="gender"
                      value="male"
                      input-id="gender-male"
                    />
                    <label for="gender-male" class="cursor-pointer">男性</label>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-slate-700">
                    <RadioButton
                      v-model="gender"
                      value="female"
                      input-id="gender-female"
                    />
                    <label for="gender-female" class="cursor-pointer"
                      >女性</label
                    >
                  </div>
                  <div class="flex items-center gap-2 text-sm text-slate-700">
                    <RadioButton
                      v-model="gender"
                      value="other"
                      input-id="gender-other"
                    />
                    <label for="gender-other" class="cursor-pointer"
                      >其他</label
                    >
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-sm text-slate-700">生日</label>
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

            <div class="mt-6 flex justify-end">
              <Button
                :disabled="!isProfileDirty"
                label="儲存修改"
                class="!min-h-11"
                @click="handleSaveProfile"
              />
            </div>
          </section>

          <!-- 手機號碼 -->
          <section class="shadow-card card-pad rounded-xl bg-white">
            <div class="flex max-w-[440px] flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-sm text-slate-700">手機號碼</label>
                <div class="flex gap-2">
                  <Select
                    v-model="phoneCode"
                    :options="PHONE_CODES"
                    class="w-[110px]"
                  />
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
                  :label="
                    codeCountdown > 0
                      ? `${codeCountdown}s 後重新發送`
                      : '發送驗證碼'
                  "
                  severity="secondary"
                  outlined
                  class="whitespace-nowrap"
                  @click="handleSendVerifyCode"
                />
              </div>
            </div>
            <div class="mt-6 flex justify-end">
              <Button
                :disabled="!isPhoneDirty"
                label="儲存修改"
                class="!min-h-11"
                @click="handleSavePhone"
              />
            </div>
          </section>

          <!-- Email -->
          <section class="shadow-card card-pad rounded-xl bg-white">
            <div class="flex max-w-[440px] flex-col gap-1.5">
              <label class="text-sm text-slate-700">Email</label>
              <InputText v-model="email" type="email" class="w-full" />
            </div>
            <div class="mt-6 flex justify-end">
              <Button
                :disabled="!isEmailDirty"
                label="儲存修改"
                class="!min-h-11"
                @click="handleSaveEmail"
              />
            </div>
          </section>
        </template>

        <!-- 更改綁定帳號 -->
        <section
          v-else-if="activeSub === 'binding'"
          class="shadow-card card-pad rounded-xl bg-white"
        >
          <h2 class="text-lg font-bold text-slate-950">更改綁定帳號</h2>
          <p class="mt-1 text-sm text-red-500">
            請確保此帳號為您本人使用，避免造成資料安全風險。
          </p>

          <div
            class="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
          >
            <i class="pi pi-exclamation-triangle mt-0.5 shrink-0" />
            <span
              >您的檔案尚未綁定電話號碼驗證，為保護帳戶安全請先驗證電話號碼，完成安全設置。</span
            >
          </div>

          <div class="mt-4 flex flex-col">
            <div
              v-for="(acc, ai) in socialAccounts"
              :key="acc.key"
              class="flex items-center justify-between gap-4 py-4"
              :class="
                ai !== socialAccounts.length - 1
                  ? 'border-b border-slate-200'
                  : ''
              "
            >
              <div class="flex min-w-0 items-center gap-3">
                <img
                  :src="socialIconSrc(acc.icon)"
                  :alt="acc.label"
                  class="h-8 w-8 shrink-0 object-contain"
                />
                <div class="min-w-0">
                  <p class="text-sm font-medium text-slate-700">
                    {{ acc.label }}
                  </p>
                  <p
                    v-if="acc.bound && acc.accountId"
                    class="text-xs text-slate-500"
                  >
                    {{ acc.idLabel }}: {{ acc.accountId }}
                  </p>
                  <p v-else class="text-xs text-slate-400">尚未綁定</p>
                </div>
              </div>
              <Button
                :label="acc.bound ? '已綁定' : '未綁定'"
                :icon="acc.bound ? 'pi pi-link' : 'pi pi-times-circle'"
                :severity="acc.bound ? 'primary' : 'secondary'"
                outlined
                size="small"
                class="shrink-0"
                @click="handleToggleBind(acc)"
              />
            </div>
          </div>
        </section>

        <!-- 收件地址 -->
        <section
          v-else-if="activeSub === 'address'"
          class="shadow-card card-pad rounded-xl bg-white"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-bold text-slate-950">收件地址</h2>
              <p class="mt-1 text-sm text-slate-500">
                請確保此帳號為您本人使用，避免造成資料安全風險。
              </p>
            </div>
            <Button
              :label="addressTab === 'home' ? '新增地址' : '新增門市'"
              icon="pi pi-plus"
              class="!min-h-11 shrink-0"
              @click="handleOpenAddAddr"
            />
          </div>

          <!-- Tabs -->
          <div class="mt-4 flex items-center gap-6 border-b border-slate-200">
            <button
              class="-mb-px flex items-center gap-2 border-b-2 pb-2 text-sm font-medium transition-colors"
              :class="
                addressTab === 'home' ? '' : 'border-transparent text-slate-500'
              "
              :style="
                addressTab === 'home'
                  ? 'color: var(--primary); border-color: var(--primary)'
                  : ''
              "
              @click="addressTab = 'home'"
            >
              <i class="pi pi-truck text-sm" />
              宅配地址
            </button>
            <button
              class="-mb-px flex items-center gap-2 border-b-2 pb-2 text-sm font-medium transition-colors"
              :class="
                addressTab === 'store'
                  ? ''
                  : 'border-transparent text-slate-500'
              "
              :style="
                addressTab === 'store'
                  ? 'color: var(--primary); border-color: var(--primary)'
                  : ''
              "
              @click="addressTab = 'store'"
            >
              <i class="pi pi-shopping-bag text-sm" />
              超商門市
            </button>
          </div>

          <!-- Address list -->
          <div class="mt-4 flex flex-col gap-3">
            <div
              v-for="addr in currentAddrs"
              :key="addr.id"
              class="flex items-start justify-between gap-4 rounded-[10px] p-4"
              :class="addr.isDefault ? '' : 'border border-slate-200 bg-white'"
              :style="
                addr.isDefault ? 'background: var(--primary-surface)' : ''
              "
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="font-bold text-slate-700">{{ addr.name }}</span>
                  <span class="text-sm text-slate-700">{{ addr.phone }}</span>
                  <span
                    v-if="addr.isDefault"
                    class="rounded px-2 py-0.5 text-xs font-medium text-white"
                    style="background: var(--primary)"
                    >預設</span
                  >
                </div>

                <!-- Store: chain logo + store name -->
                <div v-if="addr.chain" class="mt-2 flex items-center gap-2">
                  <i class="pi pi-map-marker shrink-0 text-xs text-slate-500" />
                  <img
                    :src="addr.chain === '7-11' ? sevenIcon : familyIcon"
                    :alt="addr.chain"
                    class="h-7 w-7 shrink-0 object-contain"
                  />
                  <span class="text-sm font-medium text-slate-700">{{
                    addr.storeName
                  }}</span>
                </div>
                <div
                  v-if="addr.chain"
                  class="mt-1 ml-[26px] text-sm text-slate-700"
                >
                  {{ addr.address }}
                </div>

                <!-- Home: plain address -->
                <div
                  v-else
                  class="mt-2 flex items-center gap-1 text-sm text-slate-700"
                >
                  <i class="pi pi-map-marker shrink-0 text-xs" />
                  {{ addr.address }}
                </div>
              </div>
              <!-- 手機：編輯 / 刪除一排、設為預設在下方；@3xl 以上同一列 -->
              <div
                class="flex shrink-0 flex-col items-end gap-2 @3xl:flex-row @3xl:items-center"
              >
                <div class="flex items-center gap-2">
                  <Button
                    icon="pi pi-pencil"
                    severity="secondary"
                    outlined
                    size="small"
                    @click="handleOpenEditAddr(addr)"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    outlined
                    size="small"
                    @click="handleAskDeleteAddr(addr.id)"
                  />
                </div>
                <Button
                  v-if="!addr.isDefault"
                  label="設為預設"
                  outlined
                  size="small"
                  class="whitespace-nowrap"
                  @click="handleSetDefaultAddr(addr.id)"
                />
              </div>
            </div>

            <div
              v-if="currentAddrs.length === 0"
              class="py-8 text-center text-sm text-slate-500"
            >
              尚無{{ addressTab === 'home' ? '宅配' : '超商' }}地址
            </div>
          </div>
        </section>

        <!-- 更改密碼 -->
        <section
          v-else-if="activeSub === 'password'"
          class="shadow-card card-pad rounded-xl bg-white"
        >
          <h2 class="text-lg font-bold text-slate-950">更改密碼</h2>
          <p class="mt-1 text-sm text-slate-500">
            為了保障您的帳號安全，建議定期更換強度較高的密碼。
          </p>

          <div
            class="mt-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700"
          >
            <i class="pi pi-exclamation-triangle shrink-0" />
            密碼安全性要求：8-20 位英數字組合
          </div>

          <div class="mt-5 flex max-w-[440px] flex-col gap-4">
            <!-- Current password -->
            <div class="flex flex-col gap-1.5">
              <label class="text-sm text-slate-700">目前密碼</label>
              <Password
                v-model="pwCurrent"
                :feedback="false"
                toggle-mask
                placeholder="請輸入目前密碼"
                fluid
                input-class="w-full"
              />
            </div>

            <!-- New password -->
            <div class="flex flex-col gap-1.5">
              <label class="text-sm text-slate-700">新密碼</label>
              <Password
                v-model="pwNew"
                :feedback="false"
                toggle-mask
                :invalid="!!pwNew && !isPwNewValid"
                placeholder="請輸入新密碼"
                fluid
                input-class="w-full"
              />
              <p v-if="pwNew && !isPwNewValid" class="text-sm text-red-500">
                需 8-20 位、且含英文與數字
              </p>
            </div>

            <!-- Confirm password -->
            <div class="flex flex-col gap-1.5">
              <label class="text-sm text-slate-700">確認新密碼</label>
              <Password
                v-model="pwConfirm"
                :feedback="false"
                toggle-mask
                :invalid="isPwMismatch"
                placeholder="請再次輸入新密碼"
                fluid
                input-class="w-full"
              />
              <p v-if="isPwMismatch" class="text-sm text-red-500">
                兩次密碼輸入不一致
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <Button
              :disabled="!canChangePw"
              label="儲存修改"
              class="!min-h-11"
              @click="handleChangePassword"
            />
          </div>
        </section>

        <!-- Placeholder for other sub-pages -->
        <section v-else class="shadow-card card-pad rounded-xl bg-white">
          <p class="text-sm text-slate-500">此功能尚未開放</p>
        </section>
      </div>
    </main>

    <!-- 手機底部固定 bar：4 個主分頁（我的訂單 / 紅利點數 / 優惠券 / 個人帳號） -->
    <nav
      class="sticky bottom-0 z-30 flex border-t border-slate-200 bg-white @4xl:hidden"
    >
      <button
        v-for="item in NAV_ITEMS"
        :key="item.key"
        class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
        :class="activeNav === item.key ? '' : 'text-slate-500'"
        :style="activeNav === item.key ? 'color: var(--primary)' : ''"
        @click="
          activeNav = item.key;
          if (item.key === 'account' && !activeSub) activeSub = 'profile';
        "
      >
        <MemberIcon :name="navIconName(item.key)" :size="22" />
        <span class="text-xs font-medium">{{ item.label }}</span>
      </button>
    </nav>

    <!-- Add / Edit address dialog -->
    <Dialog
      v-model:visible="isAddrDialogVisible"
      modal
      :draggable="false"
      :header="
        (addrDialogMode === 'edit' ? '編輯' : '新增') +
        (addressTab === 'home' ? '宅配地址' : '超商門市')
      "
      :breakpoints="{ '768px': '22rem' }"
      :style="{ width: '28rem' }"
    >
      <div class="flex flex-col gap-4">
        <!-- Store: chain picker -->
        <div v-if="addressTab === 'store'" class="flex flex-col gap-2">
          <label class="text-sm text-slate-700">選擇超商</label>
          <div class="flex gap-3">
            <button
              class="flex h-12 w-16 items-center justify-center rounded-md border-2 bg-white transition-all"
              :class="form.chain === '7-11' ? '' : 'border-slate-200'"
              :style="
                form.chain === '7-11' ? 'border-color: var(--primary)' : ''
              "
              @click="form.chain = '7-11'"
            >
              <img :src="sevenIcon" alt="7-11" class="h-7 w-7 object-contain" />
            </button>
            <button
              class="flex h-12 w-16 items-center justify-center rounded-md border-2 bg-white transition-all"
              :class="form.chain === 'FamilyMart' ? '' : 'border-slate-200'"
              :style="
                form.chain === 'FamilyMart'
                  ? 'border-color: var(--primary)'
                  : ''
              "
              @click="form.chain = 'FamilyMart'"
            >
              <img
                :src="familyIcon"
                alt="FamilyMart"
                class="h-7 w-7 object-contain"
              />
            </button>
          </div>
        </div>

        <div v-if="addressTab === 'store'" class="flex flex-col gap-1.5">
          <label class="text-sm text-slate-700"
            >門市名稱<span class="text-red-500"> *</span></label
          >
          <InputText
            v-model="form.storeName"
            placeholder="例：鑫工門市"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-slate-700"
            >收件人姓名<span class="text-red-500"> *</span></label
          >
          <InputText
            v-model="form.name"
            placeholder="請輸入收件人姓名"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-slate-700"
            >收件人電話<span class="text-red-500"> *</span></label
          >
          <div class="flex gap-2">
            <Select
              v-model="form.countryCode"
              :options="PHONE_CODES"
              class="w-[120px]"
            />
            <InputText
              v-model="form.phone"
              type="tel"
              placeholder="請輸入電話號碼"
              class="flex-1"
            />
          </div>
        </div>

        <!-- Home: city/district -->
        <div v-if="addressTab === 'home'" class="flex flex-col gap-1.5">
          <label class="text-sm text-slate-700">城市 / 區</label>
          <div class="flex gap-2">
            <Select v-model="form.city" :options="CITIES" class="flex-1" />
            <Select
              v-model="form.district"
              :options="districts"
              class="flex-1"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm text-slate-700">
            {{ addressTab === 'home' ? '詳細收件地址' : '門市地址'
            }}<span class="text-red-500"> *</span>
          </label>
          <InputText
            v-model="form.detail"
            :placeholder="
              addressTab === 'home' ? '街道、門牌、樓層' : '門市完整地址'
            "
            class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="取消"
          severity="secondary"
          outlined
          @click="isAddrDialogVisible = false"
        />
        <Button
          :disabled="!isFormValid"
          :label="addrDialogMode === 'edit' ? '儲存' : '確認新增'"
          @click="handleSaveAddr"
        />
      </template>
    </Dialog>

    <!-- 刪除地址確認彈窗 -->
    <Dialog
      v-model:visible="isDeleteConfirmVisible"
      modal
      :draggable="false"
      :header="addressTab === 'home' ? '刪除宅配地址' : '刪除超商門市'"
      :style="{ width: '20rem' }"
    >
      <p class="text-sm leading-relaxed text-slate-700">
        確定要刪除這筆{{
          addressTab === 'home' ? '宅配地址' : '超商門市'
        }}嗎？此操作無法復原。
      </p>
      <template #footer>
        <Button
          label="取消"
          severity="secondary"
          outlined
          @click="isDeleteConfirmVisible = false"
        />
        <Button
          label="刪除"
          severity="danger"
          @click="handleConfirmDeleteAddr"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.shadow-card {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
