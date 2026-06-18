<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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

const TERMS_CONTENT: InfoContent = {
  title: '服務政策',
  sections: [
    {
      h: '一、服務內容',
      b: '直播管家購物小幫手（以下簡稱本服務）提供直播電商之購物、結帳、訂單管理等功能。使用本服務即表示您同意本服務政策之全部條款。',
    },
    {
      h: '二、會員義務',
      b: '會員應提供正確、最新且完整之個人資料，並妥善保管帳號密碼。因帳號使用所生之一切行為，由會員自行負責。',
    },
    {
      h: '三、訂單與付款',
      b: '訂單一經送出視為要約，賣方確認後成立契約。付款方式、運費、優惠折抵依結帳頁顯示為準。',
    },
    {
      h: '四、退換貨',
      b: '部分商品標示「禁止棄標」者不適用七日鑑賞期。低溫配送、客製商品另依商品頁說明辦理。',
    },
    {
      h: '五、條款修改',
      b: '本服務得隨時修訂本政策，修訂後公告於本平台即生效，恕不另行個別通知。',
    },
  ],
};

const PRIVACY_CONTENT: InfoContent = {
  title: '隱私權政策',
  sections: [
    {
      h: '一、蒐集之資料',
      b: '我們蒐集您於註冊、下單、客服互動時提供之姓名、電話、Email、地址及交易紀錄。',
    },
    {
      h: '二、利用目的',
      b: '所蒐集資料用於訂單處理、物流配送、客戶服務、會員權益與行銷通知（您可隨時取消）。',
    },
    {
      h: '三、資料保護',
      b: '我們以加密傳輸與權限控管保護您的資料，非經您同意不會提供予第三方，但法令要求者除外。',
    },
    {
      h: '四、Cookie',
      b: '本平台使用 Cookie 以記住偏好（語言、貨幣）並優化購物體驗，您可於瀏覽器停用。',
    },
    {
      h: '五、您的權利',
      b: '您得隨時查詢、更正或請求刪除您的個人資料，請至會員中心或聯繫客服。',
    },
  ],
};

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

const route = useRoute();
const router = useRouter();

const content = computed<InfoContent>(() => {
  if (route.path === '/terms') return TERMS_CONTENT;
  if (route.path === '/privacy') return PRIVACY_CONTENT;
  return HELP_CONTENT;
});
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
