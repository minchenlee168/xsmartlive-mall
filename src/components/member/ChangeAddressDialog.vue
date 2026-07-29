<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import StoreMapPicker from '../StoreMapPicker.vue';
import type { CvsChain } from '../../pinia/address';

/**
 * 更換配送地址 / 更換門市彈窗。
 * home 模式：上半顯示原宅配收件資訊（唯讀），下半填新收件人 / 新電話 / 新地址。
 * store 模式：上半顯示原超商門市資訊（唯讀），下半選超商、填新門市名稱 / 收件人 / 電話 / 門市地址。
 */

interface Original {
  recipient: string;
  phoneCode: string;
  phone: string;
  address: string;
}

interface OriginalStore {
  chain: string;
  storeName: string;
  recipient: string;
  phoneCode: string;
  phone: string;
  address: string;
}

interface Props {
  visible?: boolean;
  mode?: 'home' | 'store';
  original?: Original;
  originalStore?: OriginalStore;
}
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  mode: 'home',
  original: () => ({
    recipient: '陳曉娟',
    phoneCode: '+886',
    phone: '912 345 678',
    address: '桃園市桃園區南平路303號',
  }),
  originalStore: () => ({
    chain: '7-11',
    storeName: '鑫工門市',
    recipient: '陳曉娟',
    phoneCode: '+886',
    phone: '912 345 678',
    address: '台北市信義區忠孝東路五段 100 號',
  }),
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  confirm: [payload: Record<string, unknown>];
}>();

const PHONE_CODES = ['+886', '+852', '+86', '+81'];

const sevenIcon = `${import.meta.env.BASE_URL}member-icons/seven.png`;
const familyIcon = `${import.meta.env.BASE_URL}member-icons/family.png`;

const recipient = ref('');
const phoneCode = ref('+886');
const phone = ref('');
const address = ref('');
const newChain = ref<CvsChain>('7-11');
const newStoreName = ref('');
/** 由電子地圖挑選帶回的門市地址（比照收件地址門市，免手填）。 */
const newStoreAddress = ref('');
const isStoreMapVisible = ref(false);
/** 點超商 logo → 開該超商電子地圖選門市。 */
const handleOpenStoreMap = (chain: CvsChain): void => {
  newChain.value = chain;
  isStoreMapVisible.value = true;
};
/** 電子地圖點選門市後帶回：自動填門市名 + 地址。 */
const handleSelectStore = (store: {
  chain: CvsChain;
  storeName: string;
  address: string;
}): void => {
  newChain.value = store.chain;
  newStoreName.value = store.storeName;
  newStoreAddress.value = store.address;
};

const headerText = computed(() =>
  props.mode === 'store' ? '更換門市' : '更換配送地址',
);

// 開啟時清空輸入欄位
watch(
  () => props.visible,
  (v) => {
    if (v) {
      recipient.value = '';
      phone.value = '';
      address.value = '';
      phoneCode.value = '+886';
      newChain.value = '7-11';
      newStoreName.value = '';
      newStoreAddress.value = '';
    }
  },
);

const handleClose = (): void => {
  emit('update:visible', false);
};

const handleConfirm = (): void => {
  const payload: Record<string, unknown> = {
    recipient: recipient.value,
    phoneCode: phoneCode.value,
    phone: phone.value,
    address: props.mode === 'store' ? newStoreAddress.value : address.value,
  };
  if (props.mode === 'store') {
    payload.chain = newChain.value;
    payload.storeName = newStoreName.value;
  }
  emit('confirm', payload);
  handleClose();
};
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :draggable="false"
    :dismissable-mask="true"
    :header="headerText"
    :breakpoints="{ '768px': '90vw' }"
    :style="{ width: '640px' }"
    @update:visible="(v) => emit('update:visible', v)"
  >
    <!-- store 模式：原門市唯讀 + 新門市表單 -->
    <div v-if="mode === 'store'" class="flex flex-col gap-4">
      <!-- 原門市資訊（唯讀） -->
      <section class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <p class="mb-1 text-xs text-slate-500">原門市</p>
          <p class="text-slate-700">
            {{ originalStore.chain }}・{{ originalStore.storeName }}
          </p>
        </div>
        <div>
          <p class="mb-1 text-xs text-slate-500">原收件人</p>
          <p class="text-slate-700">{{ originalStore.recipient }}</p>
        </div>
        <div class="col-span-2">
          <p class="mb-1 text-xs text-slate-500">原門市地址</p>
          <p class="text-slate-700">{{ originalStore.address }}</p>
        </div>
      </section>

      <!-- 選擇超商（點 logo 開該超商電子地圖選門市，免手填，比照收件地址門市） -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-slate-700"
          >選擇超商<span class="text-red-500"> *</span></label
        >
        <div class="flex gap-3">
          <button
            class="flex h-12 w-16 items-center justify-center rounded-md border-2 bg-white transition-all"
            :class="newChain === '7-11' ? '' : 'border-slate-200'"
            :style="newChain === '7-11' ? 'border-color: var(--primary)' : ''"
            @click="handleOpenStoreMap('7-11')"
          >
            <img :src="sevenIcon" alt="7-11" class="h-7 w-7 object-contain" />
          </button>
          <button
            class="flex h-12 w-16 items-center justify-center rounded-md border-2 bg-white transition-all"
            :class="newChain === 'FamilyMart' ? '' : 'border-slate-200'"
            :style="
              newChain === 'FamilyMart' ? 'border-color: var(--primary)' : ''
            "
            @click="handleOpenStoreMap('FamilyMart')"
          >
            <img
              :src="familyIcon"
              alt="FamilyMart"
              class="h-7 w-7 object-contain"
            />
          </button>
        </div>
        <!-- 已選門市：只讀卡（門市名 + 地址，由電子地圖帶回） -->
        <div
          v-if="newStoreName && newStoreAddress"
          class="flex min-w-0 flex-col rounded-md border border-slate-200 bg-slate-50 p-3"
        >
          <span class="font-bold text-slate-950">{{ newStoreName }}</span>
          <span class="truncate text-xs text-slate-500">{{
            newStoreAddress
          }}</span>
        </div>
        <p v-else class="text-sm text-slate-400">尚未選擇門市</p>
      </div>

      <!-- 新收件人 + 新聯絡電話 -->
      <div class="grid grid-cols-1 gap-4 @md:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">新收件人</label>
          <InputText v-model="recipient" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">新聯絡電話</label>
          <div class="flex gap-2">
            <Select
              v-model="phoneCode"
              :options="PHONE_CODES"
              class="w-[110px]"
            />
            <InputText
              v-model="phone"
              placeholder="例如：0912345678"
              class="min-w-0 flex-1"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- home 模式：原宅配地址唯讀 + 宅配表單 -->
    <div v-else class="flex flex-col gap-4">
      <!-- 原地址資訊（唯讀） -->
      <section class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <p class="mb-1 text-xs text-slate-500">原收件人</p>
          <p class="text-slate-700">{{ original.recipient }}</p>
        </div>
        <div>
          <p class="mb-1 text-xs text-slate-500">原聯絡電話</p>
          <p class="text-slate-700">
            ({{ original.phoneCode }}) {{ original.phone }}
          </p>
        </div>
        <div class="col-span-2">
          <p class="mb-1 text-xs text-slate-500">原配送地址</p>
          <p class="text-slate-700">{{ original.address }}</p>
        </div>
      </section>

      <!-- 新收件人 + 新聯絡電話 -->
      <div class="grid grid-cols-1 gap-4 @md:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">新收件人</label>
          <InputText v-model="recipient" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">新聯絡電話</label>
          <div class="flex gap-2">
            <Select
              v-model="phoneCode"
              :options="PHONE_CODES"
              class="w-[110px]"
            />
            <InputText
              v-model="phone"
              placeholder="例如：0912345678"
              class="min-w-0 flex-1"
            />
          </div>
        </div>
      </div>

      <!-- 新配送地址 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-slate-700">新配送地址</label>
        <InputText v-model="address" class="w-full" />
      </div>
    </div>

    <!-- 超商電子地圖選門市（比照收件地址門市選擇器） -->
    <StoreMapPicker
      v-model:visible="isStoreMapVisible"
      :chain="newChain"
      @select="handleSelectStore"
    />

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <Button
          label="取消"
          severity="secondary"
          outlined
          @click="handleClose"
        />
        <Button label="確認更新" @click="handleConfirm" />
      </div>
    </template>
  </Dialog>
</template>
