<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useViewportStore } from '../pinia/viewport';

const tabs = ['大童童裝', '小童童裝', '寶寶包屁', '親子裝', '廠商出清'];

const route = useRoute();
const router = useRouter();
const isMobile = computed(() => useViewportStore().current.id === 'mobile');

const active = computed(() =>
  decodeURIComponent((route.params.tab as string) ?? ''),
);
const isDrawerOpen = ref(false);
const showAllInDrawer = ref(false);

// Measure which main categories fit the container width (mobile only)
const tabsRowRef = ref<HTMLElement | null>(null);
const rowWidth = ref(0);
const tabWidths = ref<number[]>([]);
const EXPAND_RESERVE = 48; // expand button + side margins

const measureTabWidths = () => {
  const measurer = document.createElement('div');
  measurer.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;left:-9999px;top:0;display:flex;';
  document.body.appendChild(measurer);
  tabWidths.value = tabs.map((t) => {
    const b = document.createElement('button');
    b.style.cssText =
      'font-size:14px;font-weight:700;padding:12px 16px;white-space:nowrap;';
    b.textContent = t;
    measurer.appendChild(b);
    return Math.ceil(b.offsetWidth);
  });
  document.body.removeChild(measurer);
};

const visibleTabs = computed(() => {
  if (!isMobile.value) return tabs;
  if (!rowWidth.value || tabWidths.value.length === 0) return tabs;
  let total = 0;
  const vis: string[] = [];
  for (let i = 0; i < tabs.length; i++) {
    total += tabWidths.value[i];
    if (total > rowWidth.value - EXPAND_RESERVE) break;
    vis.push(tabs[i]);
  }
  return vis.length ? vis : [tabs[0]];
});
const overflowTabs = computed(() =>
  tabs.filter((t) => !visibleTabs.value.includes(t)),
);
const hasOverflow = computed(
  () => isMobile.value && overflowTabs.value.length > 0,
);

// Drawer shows main categories — start with the overflow set, "查看更多" reveals all
const drawerItems = computed(() =>
  showAllInDrawer.value ? tabs : overflowTabs.value,
);
const canShowMore = computed(
  () => !showAllInDrawer.value && drawerItems.value.length < tabs.length,
);

const handleNavigate = (tab: string) => {
  isDrawerOpen.value = false;
  showAllInDrawer.value = false;
  router.push(`/category/${encodeURIComponent(tab)}`);
};

let ro: ResizeObserver | null = null;
onMounted(() => {
  measureTabWidths();
  if (tabsRowRef.value) {
    rowWidth.value = tabsRowRef.value.clientWidth;
    ro = new ResizeObserver((entries) => {
      for (const e of entries) rowWidth.value = e.contentRect.width;
    });
    ro.observe(tabsRowRef.value);
  }
});
onBeforeUnmount(() => ro?.disconnect());

// Re-measure container when viewport device changes
watch(isMobile, () => {
  nextTick(() => {
    if (tabsRowRef.value) rowWidth.value = tabsRowRef.value.clientWidth;
  });
});
</script>

<template>
  <!-- tabs bar：sticky 在 frame 頂端，捲動內容時保持可見 -->
  <div class="sticky top-0 z-40 w-full" style="background: var(--tabs-bg)">
    <div class="mx-auto max-w-7xl">
      <div class="flex items-center">
        <!-- main category tabs -->
        <div
          ref="tabsRowRef"
          class="flex min-w-0 flex-1"
          :class="
            isMobile ? 'overflow-hidden' : 'scrollbar-none overflow-x-auto'
          "
        >
          <button
            v-for="tab in visibleTabs"
            :key="tab"
            class="relative min-h-11 shrink-0 px-4 py-3 font-bold text-white transition-colors"
            :class="[
              active === tab ? 'bg-white/15' : 'hover:bg-white/10',
              isMobile ? 'text-base' : 'text-sm',
            ]"
            @click="handleNavigate(tab)"
          >
            {{ tab }}
            <span
              v-if="active === tab"
              class="absolute right-0 bottom-0 left-0 h-0.5 rounded-t bg-white"
            />
          </button>
        </div>

        <!-- expand button — mobile only, only when categories overflow -->
        <button
          v-if="hasOverflow"
          class="mx-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border transition-colors"
          style="border-color: var(--primary-200)"
          @click="isDrawerOpen = !isDrawerOpen"
        >
          <i
            class="text-xs text-white"
            :class="isDrawerOpen ? 'pi pi-angle-up' : 'pi pi-angle-down'"
          />
        </button>
      </div>
    </div>

    <!-- drawer overlay — mobile only, lists more main categories -->
    <div
      v-if="hasOverflow && isDrawerOpen"
      class="absolute top-full left-0 z-50 flex w-full flex-col gap-3 border-b border-slate-200 bg-white p-4 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]"
    >
      <div class="grid grid-cols-3 gap-2">
        <Button
          v-for="item in drawerItems"
          :key="item"
          :label="item"
          size="small"
          rounded
          class="w-full"
          :outlined="active !== item"
          :severity="active === item ? undefined : 'secondary'"
          @click="handleNavigate(item)"
        />
      </div>

      <!-- 查看更多 — reveals the remaining main categories -->
      <div v-if="canShowMore" class="flex justify-center">
        <Button
          label="查看更多"
          icon="pi pi-angle-down"
          icon-pos="right"
          size="small"
          rounded
          outlined
          @click="showAllInDrawer = true"
        />
      </div>
    </div>
  </div>
</template>
