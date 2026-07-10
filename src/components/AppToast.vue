<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore, type ToastSeverity } from '../pinia/ui';

/**
 * 手刻 toast：一次一則、置中彈出、pastel 底色 + 白色外環 icon chip。
 * 全域只需要在 App.vue 掛一次，由 ui store 的 currentToast 驅動。
 */

const ui = useUiStore();
const toast = computed(() => ui.currentToast);

const ICON_CLASS: Record<ToastSeverity, string> = {
  success: 'pi pi-check',
  info: 'pi pi-info',
  warn: 'pi pi-exclamation-triangle',
  error: 'pi pi-times',
};
</script>

<template>
  <Teleport to="body">
    <Transition name="app-toast">
      <div
        v-if="toast"
        :key="toast.id"
        class="app-toast"
        :class="`app-toast--${toast.severity}`"
        role="status"
        aria-live="polite"
      >
        <div class="app-toast__icon">
          <i :class="ICON_CLASS[toast.severity]" />
        </div>
        <div class="app-toast__text">
          <p class="app-toast__summary">{{ toast.summary }}</p>
          <p v-if="toast.detail" class="app-toast__detail">
            {{ toast.detail }}
          </p>
        </div>
        <button
          type="button"
          class="app-toast__close"
          aria-label="關閉通知"
          @click="ui.hideToast()"
        >
          <i class="pi pi-times" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: min(360px, calc(100vw - 32px));
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 44px 16px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  color: #0f172a;
  box-shadow:
    0 12px 32px -12px rgba(15, 23, 42, 0.18),
    0 4px 10px -4px rgba(15, 23, 42, 0.08);
}

/* Severity 極淡底色（50 級）+ 一階 border（100 級），比原本 pastel 再柔一階 */
.app-toast--info {
  background: #f0f9ff;
  border-color: #e0f2fe;
}
.app-toast--success {
  background: #f0fdf4;
  border-color: #dcfce7;
}
.app-toast--warn {
  background: #fffbeb;
  border-color: #fef3c7;
}
.app-toast--error {
  background: #fef2f2;
  border-color: #fee2e2;
}

/* Icon chip：內圈實心 severity 色 + 白 glyph；外圈 5px 白環（box-shadow） */
.app-toast__icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin: 5px 5px 5px 0;
  border-radius: 50%;
  background: #94a3b8;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  box-shadow:
    0 0 0 5px #ffffff,
    0 2px 4px rgba(15, 23, 42, 0.08);
}
.app-toast--info .app-toast__icon {
  background: #3b82f6;
}
.app-toast--success .app-toast__icon {
  background: #10b981;
}
.app-toast--warn .app-toast__icon {
  background: #f59e0b;
}
.app-toast--error .app-toast__icon {
  background: #ef4444;
}

/* 文字欄：標題粗、細節較灰 */
.app-toast__text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.app-toast__summary {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  color: #0f172a;
  letter-spacing: 0.01em;
  margin: 0;
}
.app-toast__detail {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
}

/* 右上角關閉 X */
.app-toast__close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}
.app-toast__close:hover {
  color: #334155;
  background: rgba(15, 23, 42, 0.04);
}
.app-toast__close .pi {
  font-size: 12px;
}

/* 進 / 退場：從上方輕微下滑 + 淡入 */
.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}
.app-toast-enter-active {
  transition:
    opacity 0.22s ease-out,
    transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.app-toast-leave-active {
  transition:
    opacity 0.18s ease-in,
    transform 0.22s ease-in;
}

@media (prefers-reduced-motion: reduce) {
  .app-toast-enter-active,
  .app-toast-leave-active {
    transition: opacity 0.15s ease;
  }
  .app-toast-enter-from,
  .app-toast-leave-to {
    transform: translateX(-50%);
  }
}
</style>
