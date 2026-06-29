<script setup lang="ts">
const SITE_URL = 'https://www.168money.com.tw';
const PRIVACY_URL = 'https://live02.168money.com.tw/privacy-policy.html';
const TERMS_URL = 'https://live02.168money.com.tw/terms-of-service.html';
</script>

<template>
  <footer class="border-t border-slate-200 bg-slate-50">
    <div
      class="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-6 text-center text-sm text-slate-500"
    >
      <!-- 政策連結 -->
      <div class="flex items-center gap-3">
        <a
          :href="PRIVACY_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="transition-colors hover:text-[color:var(--primary)] hover:underline"
        >
          Privacy Policy
        </a>
        <span class="text-slate-300">|</span>
        <a
          :href="TERMS_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="transition-colors hover:text-[color:var(--primary)] hover:underline"
        >
          Terms of Service
        </a>
      </div>

      <!-- Copyright -->
      <p class="text-xs leading-relaxed text-slate-400">
        Copyright ©
        <a
          :href="SITE_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="transition-colors hover:text-[color:var(--primary)] hover:underline"
        >
          {{ SITE_URL }}
        </a>
        | 直播購物管理平台 All Rights Reserved.
      </p>
    </div>
  </footer>
</template>
