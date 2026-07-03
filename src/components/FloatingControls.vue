<script setup lang="ts">
import { ref } from 'vue';
import { useThemeStore, themes as allThemes } from '../pinia/theme';
import { useDensityStore, type DensityMode } from '../pinia/density';

declare const __BUILD_TIME__: string;

const themeStore = useThemeStore();
const densityStore = useDensityStore();

const densities: { id: DensityMode; label: string; icon: string }[] = [
  { id: 'wide', label: '寬', icon: 'pi-arrows-h' },
  { id: 'compact', label: '窄', icon: 'pi-arrow-right-arrow-left' },
];

// 外觀選項：預設(紫) + 4 個具名 preset；主題色只調整「預設」外觀的主色。
const APPEARANCE_IDS = ['aurora', 'midnight', 'bloom', 'retro'] as const;
const APPEARANCE_ID_SET = new Set<string>(APPEARANCE_IDS);
const appearanceThemes = APPEARANCE_IDS.map((id) =>
  allThemes.find((t) => t.id === id),
).filter((t): t is NonNullable<typeof t> => !!t);

/** 「預設」外觀在浮動控制列的顯示用資料（沒有實體 theme.id，代表「非外觀類的主題色」）。 */
const defaultAppearance = {
  id: 'default' as const,
  label: '預設',
  swatch: '#7008e7',
  swatchGradient: undefined as string | undefined,
};
const appearanceOptions = [defaultAppearance, ...appearanceThemes];

/** 主題色 palette：只顯示可作為「預設」主色的顏色（排除外觀主題和作為 default 的紫色）。 */
const paletteThemes = allThemes.filter(
  (t) => t.id !== 'purple' && !APPEARANCE_ID_SET.has(t.id),
);

const isAppearanceActive = (id: string): boolean => {
  if (id === 'default') return !APPEARANCE_ID_SET.has(themeStore.current.id);
  return themeStore.current.id === id;
};

/** 點按外觀：預設 → 若目前在外觀主題就跳回紫，否則保留現有主題色。 */
const handlePickAppearance = (opt: (typeof appearanceOptions)[number]) => {
  if (opt.id === 'default') {
    if (APPEARANCE_ID_SET.has(themeStore.current.id)) {
      const purple = allThemes.find((t) => t.id === 'purple');
      if (purple) themeStore.set(purple);
    }
    return;
  }
  const theme = allThemes.find((t) => t.id === opt.id);
  if (theme) themeStore.set(theme);
};

const isOpen = ref(false);
const isHidden = ref(false);

/** vite.config 在 build/dev 啟動時注入 ISO 字串，轉成 YYYY/MM/DD HH:mm 顯示。 */
const buildTimeDisplay = (() => {
  const d = new Date(__BUILD_TIME__);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
})();
</script>

<template>
  <div
    v-if="!isHidden"
    class="fixed right-6 bottom-24 z-[9999] flex flex-col items-end gap-2"
  >
    <!-- Panel -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-if="isOpen"
        class="flex w-60 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
      >
        <!-- 外觀 -->
        <div>
          <p
            class="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase"
          >
            外觀
          </p>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="opt in appearanceOptions"
              :key="opt.id"
              class="flex min-h-12 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition-all"
              :style="
                isAppearanceActive(opt.id)
                  ? {
                      background: 'var(--primary-bg)',
                      borderColor: 'var(--primary)',
                      color: '#fff',
                    }
                  : {}
              "
              :class="
                !isAppearanceActive(opt.id)
                  ? 'border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  : ''
              "
              @click="handlePickAppearance(opt)"
            >
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                :style="{
                  background: opt.swatchGradient ?? opt.swatch,
                  borderColor: isAppearanceActive(opt.id)
                    ? '#fff'
                    : 'transparent',
                }"
              />
              <span class="leading-tight">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-200" />

        <!-- Density -->
        <div>
          <p
            class="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase"
          >
            間距
          </p>
          <div class="flex gap-1.5">
            <button
              v-for="d in densities"
              :key="d.id"
              class="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-all"
              :style="
                densityStore.mode === d.id
                  ? {
                      background: 'var(--primary-bg)',
                      borderColor: 'var(--primary)',
                      color: '#fff',
                    }
                  : {}
              "
              :class="
                densityStore.mode !== d.id
                  ? 'border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  : ''
              "
              @click="densityStore.set(d.id)"
            >
              <i :class="`pi ${d.icon} text-sm`" />
              {{ d.label }}
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-200" />

        <!-- Theme -->
        <div>
          <p
            class="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase"
          >
            主題色
          </p>
          <div class="grid grid-cols-4 gap-x-2 gap-y-3">
            <button
              v-for="theme in paletteThemes"
              :key="theme.id"
              class="group flex flex-col items-center gap-1"
              @click="themeStore.set(theme)"
            >
              <!-- swatch：漸層或純色 -->
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-110"
                :style="{
                  background: theme.swatchGradient ?? theme.swatch,
                  borderColor:
                    themeStore.current.id === theme.id
                      ? '#020617'
                      : 'transparent',
                  transform:
                    themeStore.current.id === theme.id ? 'scale(1.15)' : '',
                }"
              >
                <i
                  v-if="themeStore.current.id === theme.id"
                  class="pi pi-check text-xs text-white drop-shadow"
                />
              </span>
              <span class="text-center text-xs leading-tight text-slate-500">{{
                theme.label
              }}</span>
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-200" />

        <!-- Prototype 識別 + 更新時間 -->
        <p class="text-center text-xs leading-relaxed text-slate-400">
          此為 prototype 展示<br />更新時間：{{ buildTimeDisplay }}
        </p>
      </div>
    </Transition>

    <!-- FAB -->
    <div class="relative">
      <button
        class="flex h-12 w-12 items-center justify-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 hover:scale-110 active:scale-95"
        style="background: var(--primary-bg)"
        @click="isOpen = !isOpen"
      >
        <i
          class="pi text-lg text-white"
          :class="isOpen ? 'pi-times' : 'pi-palette'"
          :style="{
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }"
        />
      </button>
      <!-- 暫時隱藏（重整後恢復） -->
      <button
        v-show="!isOpen"
        class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="暫時隱藏（重整後恢復）"
        title="暫時隱藏（重整後恢復）"
        @click.stop="isHidden = true"
      >
        <i class="pi pi-times text-[10px]" />
      </button>
    </div>
  </div>
</template>
