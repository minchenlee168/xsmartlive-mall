<script setup lang="ts">
import { ref } from 'vue';
import { useThemeStore } from '../pinia/theme';
import { useViewportStore, viewports } from '../pinia/viewport';
import { useDensityStore, type DensityMode } from '../pinia/density';

const themeStore = useThemeStore();
const viewportStore = useViewportStore();
const densityStore = useDensityStore();

const densities: { id: DensityMode; label: string; icon: string }[] = [
  { id: 'wide', label: '寬', icon: 'pi-arrows-h' },
  { id: 'compact', label: '窄', icon: 'pi-arrow-right-arrow-left' },
];

const isOpen = ref(false);
</script>

<template>
  <div class="fixed right-6 bottom-24 z-[9999] flex flex-col items-end gap-2">
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
        <!-- Viewport -->
        <div>
          <p
            class="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase"
          >
            裝置
          </p>
          <div class="flex gap-1.5">
            <button
              v-for="vp in viewports"
              :key="vp.id"
              class="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-medium transition-all"
              :style="
                viewportStore.userSelection.id === vp.id
                  ? {
                      background: 'var(--primary-bg)',
                      borderColor: 'var(--primary)',
                      color: '#fff',
                    }
                  : {}
              "
              :class="
                viewportStore.userSelection.id !== vp.id
                  ? 'border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  : ''
              "
              @click="viewportStore.set(vp)"
            >
              <i :class="`pi ${vp.icon} text-base`" />
              {{ vp.label }}
              <span
                v-if="vp.id !== 'pc'"
                class="text-[9px] leading-none text-red-500"
                >開發中</span
              >
            </button>
          </div>
          <p
            v-if="viewportStore.userSelection.width"
            class="mt-1.5 text-center text-xs text-slate-500"
          >
            {{ viewportStore.userSelection.width }}px
          </p>
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
              v-for="theme in themeStore.themes"
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
      </div>
    </Transition>

    <!-- FAB -->
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
  </div>
</template>
