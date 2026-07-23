<script setup lang="ts">
import { computed } from 'vue';
import type { CvsChain } from '../pinia/address';

interface MapStore {
  chain: CvsChain;
  storeName: string;
  address: string;
}

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    chain?: CvsChain;
  }>(),
  {
    visible: false,
    chain: '7-11',
  },
);

const emit = defineEmits<{
  'update:visible': [value: boolean];
  select: [store: MapStore];
}>();

// 圖示（存放於 public/member-icons/，以 BASE_URL 引入）
const sevenIcon = `${import.meta.env.BASE_URL}member-icons/seven.png`;
const familyIcon = `${import.meta.env.BASE_URL}member-icons/family.png`;

// 示意門市清單（模擬超商電子地圖點選後帶回）
const MAP_STORES: MapStore[] = [
  {
    chain: '7-11',
    storeName: '鑫工門市',
    address: '台北市信義區忠孝東路五段 100 號',
  },
  {
    chain: '7-11',
    storeName: '松德門市',
    address: '台北市信義區松德路 12 號',
  },
  {
    chain: '7-11',
    storeName: '永春門市',
    address: '台北市信義區忠孝東路五段 372 號',
  },
  {
    chain: 'FamilyMart',
    storeName: '信義興雅店',
    address: '台北市信義區松高路 19 號',
  },
  {
    chain: 'FamilyMart',
    storeName: '市府轉運站店',
    address: '台北市信義區忠孝東路五段 8 號',
  },
  {
    chain: 'FamilyMart',
    storeName: '松智門市',
    address: '台北市信義區松智路 1 號',
  },
];

const chainIcon = (chain: CvsChain) =>
  chain === '7-11' ? sevenIcon : familyIcon;

const chainLabel = (chain: CvsChain) =>
  chain === '7-11' ? '7-11' : '全家';

// 只顯示所選超商的門市
const visibleStores = computed(() =>
  MAP_STORES.filter((s) => s.chain === props.chain),
);

const handleSelect = (store: MapStore) => {
  emit('select', store);
  emit('update:visible', false);
};
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    :draggable="false"
    :header="`${chainLabel(props.chain)} 電子地圖`"
    :style="{ width: '30rem' }"
    :breakpoints="{ '768px': '90vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4">
      <p class="text-sm text-slate-500">
        （示意）實際會開啟超商電子地圖，於地圖上點選門市後自動帶回。以下為示意門市：
      </p>

      <button
        type="button"
        class="flex w-fit items-center gap-1.5 text-sm underline"
        style="color: var(--primary)"
      >
        <i class="pi pi-map-marker text-xs"></i>
        <span>開啟超商電子地圖</span>
      </button>

      <ul class="flex flex-col gap-2">
        <li v-for="s in visibleStores" :key="s.chain + s.storeName">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-md border-2 border-slate-200 p-3 text-left transition-colors hover:border-[var(--primary)]"
            @click="handleSelect(s)"
          >
            <img
              :src="chainIcon(s.chain)"
              :alt="s.chain"
              class="h-7 w-7 shrink-0 object-contain"
            />
            <div class="flex min-w-0 flex-col">
              <span class="font-bold text-slate-950">{{ s.storeName }}</span>
              <span class="truncate text-xs text-slate-500">{{
                s.address
              }}</span>
            </div>
          </button>
        </li>
      </ul>
    </div>

    <template #footer>
      <Button
        label="取消"
        severity="secondary"
        outlined
        @click="emit('update:visible', false)"
      />
    </template>
  </Dialog>
</template>
