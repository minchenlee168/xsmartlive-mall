<script setup lang="ts">
import { useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import CategoryTabs from '../components/CategoryTabs.vue';

interface InfoSection {
  h: string;
  b: string;
}
interface InfoContent {
  title: string;
  sections: InfoSection[];
}

const HELP_CONTENT: InfoContent = {
  title: '需要幫助',
  sections: [
    {
      h: '常見問題：如何修改收件地址？',
      b: '登入後進入「會員中心 → 個人帳號 → 收件地址」，即可新增、編輯或設定預設地址。',
    },
    {
      h: '常見問題：可以更改付款方式嗎？',
      b: '結帳頁「付款方式」區塊可選擇線上信用卡、ATM 轉帳或貨到付款。',
    },
    {
      h: '常見問題：優惠券怎麼使用？',
      b: '結帳頁點「選擇可使用優惠券」挑選，或於代碼欄輸入優惠碼後按「使用」。',
    },
    {
      h: '常見問題：忘記密碼怎麼辦？',
      b: '於登入頁點「忘記密碼」，以手機或 Email 取得重設驗證碼後重設。',
    },
    {
      h: '聯絡客服',
      b: '線上客服服務時間為每日 09:00–21:00，亦可來信 support@xsmartlive.example。',
    },
  ],
};

const router = useRouter();

const content: InfoContent = HELP_CONTENT;
</script>

<template>
  <div class="flex min-h-screen flex-col" style="background: var(--page-bg)">
    <NavBar />
    <CategoryTabs />

    <div>
      <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-6">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          class="!min-h-11 !min-w-11"
          @click="router.back()"
        />
        <h1 class="text-2xl font-bold text-slate-950">{{ content.title }}</h1>
      </div>
    </div>

    <main class="mx-auto w-full max-w-[860px] flex-1 px-4 pb-12">
      <div
        class="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.1)]"
      >
        <div
          v-for="section in content.sections"
          :key="section.h"
          class="flex flex-col gap-2"
        >
          <h2 class="text-base font-bold text-slate-950">{{ section.h }}</h2>
          <p class="text-base leading-relaxed text-slate-600">
            {{ section.b }}
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
