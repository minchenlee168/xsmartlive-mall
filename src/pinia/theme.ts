import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { Theme } from '../types/theme';

export type { Theme } from '../types/theme';

export const themes: Theme[] = [
  {
    id: 'purple',
    label: '紫色',
    swatch: '#7008e7',
    vars: {
      '--primary': '#7008e7',
      '--primary-200': '#d3bbfb',
      '--primary-bg': '#7008e7',
      '--primary-hover-bg': '#5b06bd',
      '--accent': '#b8923f',
      '--accent-200': '#ead9b8',
      '--accent-hover': '#997636',
      '--tabs-bg': '#7008e7',
      '--page-bg': '#f1f5f9',
    },
  },
  {
    // Red theme: reserved red kept only for category tabs / search button /
    // custom icons (--brand). A warm caramel drives everything else.
    id: 'red',
    label: '紅色',
    swatch: '#c75c58',
    vars: {
      '--primary': '#4f8a8a',
      '--primary-200': '#cfe1e1',
      '--primary-bg': '#4f8a8a',
      '--primary-hover-bg': '#3d6f6f',
      '--accent': '#4f8a8a',
      '--accent-200': '#cfe1e1',
      '--accent-hover': '#3d6f6f',
      '--brand': '#c75c58',
      '--brand-bg': '#c75c58',
      '--brand-hover-bg': '#a4453f',
      '--tabs-bg':
        'linear-gradient(135deg, #c75c58 0%, #c75c58 55%, #a4453f 100%)',
      '--page-bg': '#f1f5f9',
    },
  },
  {
    id: 'blue',
    label: '藍色',
    swatch: '#3f7da1',
    vars: {
      '--primary': '#3f7da1',
      '--primary-200': '#cdddE8',
      '--primary-bg': '#3f7da1',
      '--primary-hover-bg': '#326480',
      '--accent': '#cf8f54',
      '--accent-200': '#f0dcc4',
      '--accent-hover': '#b0743f',
      '--tabs-bg':
        'linear-gradient(135deg, #3f7da1 0%, #3f7da1 55%, #cf8f54 100%)',
      '--page-bg': '#f1f5f9',
    },
  },
  {
    id: 'green',
    label: '綠色',
    swatch: '#519072',
    vars: {
      '--primary': '#519072',
      '--primary-200': '#cfe2d7',
      '--primary-bg': '#519072',
      '--primary-hover-bg': '#3f7259',
      '--accent': '#bd7d52',
      '--accent-200': '#ecd8c6',
      '--accent-hover': '#9c6240',
      '--tabs-bg':
        'linear-gradient(135deg, #519072 0%, #519072 55%, #bd7d52 100%)',
      '--page-bg': '#f1f5f9',
    },
  },
  {
    id: 'orange',
    label: '橘色',
    swatch: '#ea580c',
    vars: {
      '--primary': '#ea580c',
      '--primary-200': '#fed7aa',
      '--primary-bg': '#ea580c',
      '--primary-hover-bg': '#c2410c',
      '--accent': '#3f8aa1',
      '--accent-200': '#c9e0e6',
      '--accent-hover': '#316d80',
      '--tabs-bg':
        'linear-gradient(135deg, #ea580c 0%, #ea580c 55%, #3f8aa1 100%)',
      '--page-bg': '#f1f5f9',
    },
  },
  {
    id: 'citrus',
    label: '柑橘撞色',
    swatch: '#f97316',
    swatchGradient:
      'linear-gradient(135deg, #6aa84f 0%, #f97316 60%, #ea580c 100%)',
    vars: {
      '--primary': '#f97316',
      '--primary-200': '#fde8cc',
      '--primary-bg':
        'linear-gradient(135deg, #fb923c 0%, #f97316 55%, #ea580c 100%)',
      '--primary-hover-bg': 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
      '--accent': '#4f8a8a',
      '--accent-200': '#cfe1e1',
      '--accent-hover': '#3d6f6f',
      '--tabs-bg': 'linear-gradient(135deg, #7cb342 0%, #4e7d33 100%)',
      '--page-bg': '#f1f5f9',
    },
  },
  {
    id: 'milktea',
    label: '奶茶',
    swatch: '#c8956c',
    swatchGradient: 'linear-gradient(135deg, #e8c49a, #c8956c, #a06840)',
    vars: {
      '--primary': '#c8956c',
      '--primary-200': '#f5e6d3',
      '--primary-bg':
        'linear-gradient(135deg, #e8c49a 0%, #c8956c 55%, #a06840 100%)',
      '--primary-hover-bg': 'linear-gradient(135deg, #d4a880 0%, #a06840 100%)',
      '--accent': '#6c87a0',
      '--accent-200': '#d6dee6',
      '--accent-hover': '#556b80',
      '--tabs-bg':
        'linear-gradient(135deg, #e8c49a 0%, #c8956c 55%, #a06840 100%)',
      '--page-bg':
        'linear-gradient(160deg, #fdf6ee 0%, #f5e6d3 50%, #eeddc4 100%)',
    },
  },
  {
    id: 'aurora',
    label: '極光珊瑚 Aurora',
    swatch: '#e07856',
    swatchGradient: 'linear-gradient(135deg, #ef9a7a, #e07856, #6cd4d0)',
    vars: {
      '--primary': '#e07856',
      '--primary-200': '#f5c9b8',
      '--primary-bg':
        'linear-gradient(135deg, #ef9a7a 0%, #e07856 55%, #6cd4d0 100%)',
      '--primary-hover-bg': 'linear-gradient(135deg, #e07856 0%, #b95a3d 100%)',
      '--accent': '#6cd4d0',
      '--accent-200': '#c6ecea',
      '--accent-hover': '#4bb8b3',
      '--tabs-bg':
        'linear-gradient(135deg, #ef9a7a 0%, #e07856 55%, #6cd4d0 100%)',
      '--page-bg':
        'linear-gradient(160deg, #fdf3ee 0%, #f9e2d7 50%, #d9f2f0 100%)',
    },
  },
  {
    id: 'midnight',
    label: '深夜藍 Midnight',
    swatch: '#1e40af',
    swatchGradient: 'linear-gradient(135deg, #3b82f6, #1e40af, #0f172a)',
    vars: {
      '--primary': '#1e40af',
      '--primary-200': '#c7d2fe',
      '--primary-bg':
        'linear-gradient(135deg, #3b82f6 0%, #1e40af 55%, #0f172a 100%)',
      '--primary-hover-bg': 'linear-gradient(135deg, #1e40af 0%, #0f172a 100%)',
      '--accent': '#94a3b8',
      '--accent-200': '#e2e8f0',
      '--accent-hover': '#64748b',
      '--tabs-bg':
        'linear-gradient(135deg, #3b82f6 0%, #1e40af 55%, #0f172a 100%)',
      '--page-bg':
        'linear-gradient(160deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)',
    },
  },
  {
    id: 'bloom',
    label: '櫻花粉 Bloom',
    swatch: '#f472b6',
    swatchGradient: 'linear-gradient(135deg, #fbcfe8, #f472b6, #db2777)',
    vars: {
      '--primary': '#f472b6',
      '--primary-200': '#fbcfe8',
      '--primary-bg':
        'linear-gradient(135deg, #fbcfe8 0%, #f472b6 55%, #db2777 100%)',
      '--primary-hover-bg': 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
      '--accent': '#a78bfa',
      '--accent-200': '#ddd6fe',
      '--accent-hover': '#7c3aed',
      '--tabs-bg':
        'linear-gradient(135deg, #fbcfe8 0%, #f472b6 55%, #db2777 100%)',
      '--page-bg':
        'linear-gradient(160deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)',
    },
  },
  {
    id: 'retro',
    label: '復古橘 Retro',
    swatch: '#d97706',
    swatchGradient: 'linear-gradient(135deg, #f59e0b, #d97706, #92400e)',
    vars: {
      '--primary': '#d97706',
      '--primary-200': '#fde4b7',
      '--primary-bg':
        'linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #92400e 100%)',
      '--primary-hover-bg': 'linear-gradient(135deg, #d97706 0%, #92400e 100%)',
      '--accent': '#78350f',
      '--accent-200': '#e0c9a6',
      '--accent-hover': '#5b2a08',
      '--tabs-bg':
        'linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #92400e 100%)',
      '--page-bg':
        'linear-gradient(160deg, #fef7ec 0%, #fdead0 50%, #fbd6a0 100%)',
    },
  },
  {
    id: 'techblue',
    label: '科技藍',
    swatch: '#0891b2',
    swatchGradient: 'linear-gradient(135deg, #22d3ee, #0891b2, #0e7490)',
    vars: {
      '--primary': '#0891b2',
      '--primary-200': '#cffafe',
      '--primary-bg':
        'linear-gradient(135deg, #22d3ee 0%, #0891b2 55%, #0e7490 100%)',
      '--primary-hover-bg': 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
      '--accent': '#c9795e',
      '--accent-200': '#efd4cb',
      '--accent-hover': '#a55d45',
      '--tabs-bg':
        'linear-gradient(135deg, #22d3ee 0%, #0891b2 55%, #0e7490 100%)',
      '--page-bg':
        'linear-gradient(160deg, #ecfeff 0%, #e0f7fa 50%, #cffafe 100%)',
    },
  },
];

// Optional keys a theme may override; when a theme doesn't set them they must
// be cleared so they fall back to the :root defaults (e.g. --brand → --primary)
// instead of leaking from a previously-applied theme.
const OPTIONAL_KEYS = ['--brand', '--brand-bg', '--brand-hover-bg'];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const key of OPTIONAL_KEYS) {
    if (!(key in theme.vars)) root.style.removeProperty(key);
  }
  for (const [key, val] of Object.entries(theme.vars)) {
    root.style.setProperty(key, val);
  }
}

export const useThemeStore = defineStore('theme', () => {
  const current = ref<Theme>(themes[0]);

  function set(theme: Theme) {
    current.value = theme;
    applyTheme(theme);
  }

  watch(current, applyTheme, { immediate: true });

  return { current, themes, set };
});
