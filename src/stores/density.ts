import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type DensityMode = 'wide' | 'compact'

// Spacing tokens per mode. 'wide' matches the current (pre-feature) layout.
// One consistent spacing value per mode — page padding, block gaps and card
// padding all use the same number so spacing is uniform across the app.
const PRESETS: Record<DensityMode, Record<string, string>> = {
  wide: {
    '--page-pad-x': '16px',
    '--page-pad-y': '16px',
    '--stack-gap': '16px',
    '--card-pad': '16px',
  },
  compact: {
    '--page-pad-x': '8px',
    '--page-pad-y': '8px',
    '--stack-gap': '8px',
    '--card-pad': '8px',
  },
}

function applyDensity(mode: DensityMode) {
  const root = document.documentElement
  for (const [k, v] of Object.entries(PRESETS[mode])) {
    root.style.setProperty(k, v)
  }
}

export const useDensityStore = defineStore('density', () => {
  const mode = ref<DensityMode>('wide')

  function set(m: DensityMode) {
    mode.value = m
    applyDensity(m)
  }

  watch(mode, applyDensity, { immediate: true })

  return { mode, set }
})
