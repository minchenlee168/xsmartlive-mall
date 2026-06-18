<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4" style="background: var(--surface-100)">
    <!-- 背景光暈 -->
    <div class="landing-bg" aria-hidden="true" />

    <div class="relative z-10 flex flex-col items-center gap-10 w-full max-w-[760px]">
      <!-- Logo + 標題 -->
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="flex items-center gap-2">
          <span class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl" style="background: var(--primary-bg)">X</span>
          <span class="font-bold text-3xl" style="color: var(--primary)">xSmartLive</span>
        </div>
        <p class="text-base" style="color: var(--text-muted)">請選擇要進入的系統</p>
      </div>

      <!-- 兩個入口按鈕 -->
      <div class="grid grid-cols-1 @md:grid-cols-2 gap-5 w-full">
        <!-- 商城前台 -->
        <button
          class="entry-card group"
          @click="router.push('/shop')"
        >
          <span class="entry-icon" style="background: var(--primary-surface)">
            <i class="pi pi-shopping-bag text-3xl" style="color: var(--primary)" />
          </span>
          <span class="text-xl font-bold text-[#334155]">進入商城</span>
          <span class="text-sm" style="color: var(--text-muted)">瀏覽商品、下單結帳的購物前台</span>
          <span class="flex items-center gap-1 text-sm font-medium mt-1" style="color: var(--primary)">
            開啟 <i class="pi pi-arrow-right text-xs" />
          </span>
        </button>

        <!-- 商城後台 -->
        <button
          class="entry-card group"
          @click="router.push('/admin')"
        >
          <span class="entry-icon bg-[#f1f5f9]">
            <i class="pi pi-desktop text-3xl text-[#475569]" />
          </span>
          <span class="text-xl font-bold text-[#334155]">進入商城後台</span>
          <span class="text-sm" style="color: var(--text-muted)">商品、訂單、行銷等管理後台</span>
          <span class="flex items-center gap-1 text-sm font-medium mt-1" style="color: var(--primary)">
            開啟 <i class="pi pi-arrow-right text-xs" />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 28% 30%, color-mix(in srgb, var(--primary) 30%, transparent) 0%, transparent 40%),
    radial-gradient(circle at 72% 72%, rgba(96, 165, 250, 0.28) 0%, transparent 42%);
  filter: blur(12px);
}

.entry-card {
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
  cursor: pointer;
}
.entry-card:hover {
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
  border-color: var(--primary-200);
}
.entry-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
</style>
