<script setup lang="ts">
const SITE_URL = 'https://www.168money.com.tw';
const PLATFORM_URL = 'https://www.168money.com.tw/';
const PRIVACY_URL = 'https://live02.168money.com.tw/privacy-policy.html';
const TERMS_URL = 'https://live02.168money.com.tw/terms-of-service.html';

const BASE_URL = import.meta.env.BASE_URL;

// 合作廠商：先物流 / 超商取貨，再付款方式
const PARTNERS = [
  { src: 'seven.png', alt: '7-ELEVEn 超商取貨' },
  { src: 'family.png', alt: '全家便利商店 超商取貨' },
  { src: 'hct.png', alt: '新竹物流' },
  { src: 'ktj.png', alt: '嘉里大榮物流' },
  { src: 'ezcat.png', alt: '黑貓宅急便' },
  { src: 'ipassmoney.png', alt: '一卡通 iPASS MONEY' },
  { src: 'linepay.png', alt: 'LINE Pay' },
  { src: 'linepay-money.png', alt: 'LINE Pay Money' },
  { src: 'newebpay.png', alt: '藍新金流 NewebPay' },
] as const;

// 物流組最後一項（黑貓宅急便）索引；桌機於此後強制換行，付款組另起一行
const LOGISTICS_LAST_INDEX = 4;
</script>

<template>
  <footer class="border-t border-slate-200 bg-slate-50">
    <div class="mx-auto flex max-w-7xl flex-col px-4 py-6">
      <!-- 合作廠商 -->
      <div class="flex flex-col items-center gap-3">
        <h3 class="text-xs font-medium tracking-wide text-slate-400">
          合作廠商
        </h3>
        <ul
          class="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 sm:gap-x-3 sm:gap-y-1"
        >
          <template v-for="(partner, index) in PARTNERS" :key="partner.src">
            <li class="flex h-9 items-center sm:h-11">
              <img
                :src="`${BASE_URL}partners/${partner.src}`"
                :alt="partner.alt"
                class="h-5 w-auto object-contain sm:h-6"
              />
            </li>
            <!-- 桌機強制斷行：物流組(1~5) 一行、付款組(6~9) 另一行；小尺寸靠自然 flex-wrap -->
            <li
              v-if="index === LOGISTICS_LAST_INDEX"
              aria-hidden="true"
              class="hidden basis-full @5xl:block"
            />
          </template>
        </ul>
      </div>

      <!-- 分隔線 -->
      <div class="my-6 h-px w-full bg-slate-200" />

      <!-- 政策連結 + Copyright -->
      <div
        class="flex flex-col items-center gap-2 text-center text-sm text-slate-500"
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
          |
          <a
            :href="PLATFORM_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-[color:var(--primary)] hover:underline"
          >
            直播購物管理平台
          </a>
          All Rights Reserved.
        </p>
      </div>
    </div>
  </footer>
</template>
