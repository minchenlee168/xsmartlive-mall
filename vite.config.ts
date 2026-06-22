import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'

/** 取最新一筆 commit 的 ISO 時間；GitHub Pages 用 push 觸發 build，
 *  commit 時間 ≈ push 時間（誤差幾秒），比 `new Date()` 更穩定。
 *  若取不到（例如不在 git repo）則 fallback 到當下時間。 */
const getLastCommitISO = (): string => {
  try {
    return execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim()
  } catch {
    return new Date().toISOString()
  }
}

export default defineConfig({
  base: '/xsmartlive-mall/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    /** 最新 commit ISO 時間（≈ 部署/push 時間），注入到 prototype 浮動面板顯示「更新時間」。 */
    __BUILD_TIME__: JSON.stringify(getLastCommitISO()),
  },
  plugins: [
    vue(),
    tailwindcss(),
    Components({
      dts: false,
      resolvers: [PrimeVueResolver()],
    }),
  ],
})
