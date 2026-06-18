<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useViewportStore, viewports } from '../stores/viewport'
import { useDensityStore, type DensityMode } from '../stores/density'

const themeStore = useThemeStore()
const viewportStore = useViewportStore()
const densityStore = useDensityStore()

const densities: { id: DensityMode; label: string; icon: string }[] = [
  { id: 'wide', label: '寬', icon: 'pi-arrows-h' },
  { id: 'compact', label: '窄', icon: 'pi-arrow-right-arrow-left' },
]

const open = ref(false)
</script>

<template>
  <div class="fixed bottom-24 right-6 z-[9999] flex flex-col items-end gap-2">

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
        v-if="open"
        class="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-[#e2e8f0] p-4 w-60 flex flex-col gap-4"
      >
        <!-- Viewport -->
        <div>
          <p class="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-2">裝置</p>
          <div class="flex gap-1.5">
            <button
              v-for="vp in viewports"
              :key="vp.id"
              class="flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-2 rounded-xl text-xs font-medium transition-all border"
              :style="viewportStore.userSelection.id === vp.id
                ? { background: 'var(--primary-bg)', borderColor: 'var(--primary)', color: '#fff' }
                : {}"
              :class="viewportStore.userSelection.id !== vp.id
                ? 'border-[#e2e8f0] text-[#334155] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                : ''"
              @click="viewportStore.set(vp)"
            >
              <i :class="`pi ${vp.icon} text-base`" />
              {{ vp.label }}
              <span v-if="vp.id !== 'pc'" class="text-[9px] leading-none text-[#ef4444]">開發中</span>
            </button>
          </div>
          <p v-if="viewportStore.userSelection.width" class="text-xs text-[#64748b] text-center mt-1.5">
            {{ viewportStore.userSelection.width }}px
          </p>
        </div>

        <div class="h-px bg-[#e2e8f0]" />

        <!-- Density -->
        <div>
          <p class="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-2">間距</p>
          <div class="flex gap-1.5">
            <button
              v-for="d in densities"
              :key="d.id"
              class="flex-1 flex items-center justify-center gap-1.5 min-h-[48px] py-2 rounded-xl text-xs font-medium transition-all border"
              :style="densityStore.mode === d.id
                ? { background: 'var(--primary-bg)', borderColor: 'var(--primary)', color: '#fff' }
                : {}"
              :class="densityStore.mode !== d.id
                ? 'border-[#e2e8f0] text-[#334155] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                : ''"
              @click="densityStore.set(d.id)"
            >
              <i :class="`pi ${d.icon} text-sm`" />
              {{ d.label }}
            </button>
          </div>
        </div>

        <div class="h-px bg-[#e2e8f0]" />

        <!-- Theme -->
        <div>
          <p class="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-2">主題色</p>
          <div class="grid grid-cols-4 gap-x-2 gap-y-3">
            <button
              v-for="theme in themeStore.themes"
              :key="theme.id"
              class="group flex flex-col items-center gap-1"
              @click="themeStore.set(theme)"
            >
              <!-- swatch：漸層或純色 -->
              <span
                class="w-8 h-8 rounded-full border-2 transition-transform group-hover:scale-110 flex items-center justify-center shrink-0"
                :style="{
                  background: theme.swatchGradient ?? theme.swatch,
                  borderColor: themeStore.current.id === theme.id ? '#020617' : 'transparent',
                  transform: themeStore.current.id === theme.id ? 'scale(1.15)' : '',
                }"
              >
                <i
                  v-if="themeStore.current.id === theme.id"
                  class="pi pi-check text-white text-xs drop-shadow"
                />
              </span>
              <span class="text-[10px] text-[#64748b] leading-tight text-center">{{ theme.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- FAB -->
    <button
      class="w-12 h-12 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.2)] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
      style="background: var(--primary-bg)"
      @click="open = !open"
    >
      <i
        class="pi text-white text-lg"
        :class="open ? 'pi-times' : 'pi-palette'"
        :style="{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }"
      />
    </button>
  </div>
</template>
