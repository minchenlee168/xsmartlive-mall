<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';

/**
 * 客服浮動鈕 + 客服對話 bottom sheet（原型假 UI，後端未開發）。
 * - 只掛在「我的訂單」頁；選單式互動：AI 訊息下方可掛一組按鈕（分類 / 子項）。
 * - 分類與子項點擊都復用 sendUserMessage，讓「上屏 → 輸入中 → 回覆」節奏跟打字一致。
 * - 對話 session 僅存在元件內 ref，重整自然清空，不做持久化。
 * - z-index：遮罩 / 面板需壓過設定 FAB（z-[9999]），故用 10000 / 10001。
 */

type ChatRole = 'agent' | 'user';
type MenuLayout = 'grid' | 'list';

// 掛在訊息下方的按鈕節點；有 children 即為可下鑽分類，否則為葉節點（帶罐頭 reply）。
interface MenuButton {
  key: string;
  label: string;
  icon?: string;
  reply?: string;
  isPrimary?: boolean;
  children?: MenuButton[];
}

interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  time: string;
  menu?: MenuButton[];
  menuLayout?: MenuLayout;
}

// 罐頭假回覆延遲（模擬「客服輸入中…」）
const TYPING_DELAY_MS = 700;
// 時間戳一律用固定假字串（專案禁用 Date.now() / argless new Date()）
const FIXED_TIME = '11:13';

// 歡迎語（初始與每次叫出選單時的 AI 訊息內容）
const WELCOME_TEXT =
  '【我可以幫您做這些】請選一個項目，或直接把問題打給我 😊';
// 一般輸入（打字路）走通用回覆
const GENERIC_REPLY =
  '感謝您的訊息，專人將於稍後回覆，您也可以點左下角選單挑選常見問題。';
// 客服示範用的假訂單（原型，不接真實訂單資料）
const SAMPLE_ORDER_LINE = '訂單 20260224000004176・商品 123456789・NT$231';
// 專人接手後，使用者輸入這個關鍵字可重新叫回 AI 選單
const HELPER_KEYWORD = '小幫手';
// 進入某分類時的引導語（【分類】請選一個項目）
const categoryPrompt = (label: string): string =>
  `【${label}】請選一個項目 🙂`;
// 訂單相關細項「都不是」→ 轉專人並提示輸入小幫手叫回 AI
const escalateReply = (action: string): string =>
  `好的，我讓專人與您確認要${action}的是哪一筆。已收到申請，請稍待客服人員協助處理。稍後如需讓 AI 重新為您服務，請輸入『${HELPER_KEYWORD}』。`;
// 訂單相關細項「請問是這一筆嗎？」確認訊息
const confirmOrderReply = (action: string): string =>
  `【選擇要${action}的訂單】\n請問您要${action}的是這一筆嗎？\n${SAMPLE_ORDER_LINE}\n若都不是，請直接把訂單編號傳給我 🙂`;

// 四大分類 → 子項 → 罐頭回覆；2×2 與子項清單皆由此渲染。
const MENU_TREE: MenuButton[] = [
  {
    key: 'order',
    label: '訂單相關',
    icon: 'pi pi-receipt',
    children: [
      {
        key: 'order-query',
        label: '查訂單/標單',
        icon: 'pi pi-search',
        reply: confirmOrderReply('查詢'),
        children: [
          {
            key: 'order-query-yes',
            label: '是，就是這筆',
            reply:
              '好的，這筆訂單目前狀態為「待出貨」，您可在『我的訂單』展開查看完整配送進度；若需專人協助，請稍待客服回覆。',
          },
          {
            key: 'order-query-no',
            label: '都不是',
            reply: escalateReply('查詢'),
          },
        ],
      },
      {
        key: 'order-modify',
        label: '修改訂單',
        icon: 'pi pi-pencil',
        reply: confirmOrderReply('調整'),
        children: [
          {
            key: 'order-modify-yes',
            label: '是，就是這筆',
            reply:
              '好的，已為您登記這筆訂單的修改需求，專人將於出貨前與您確認可調整的數量或收件資訊。',
          },
          {
            key: 'order-modify-no',
            label: '都不是',
            reply: escalateReply('調整'),
          },
        ],
      },
      {
        key: 'order-cancel',
        label: '取消訂單/標單',
        icon: 'pi pi-trash',
        reply: confirmOrderReply('取消'),
        children: [
          {
            key: 'order-cancel-yes',
            label: '是，就是這筆',
            reply:
              '好的，未出貨的訂單可申請取消，已為您登記，專人確認狀態後將為您處理取消與退款。',
          },
          {
            key: 'order-cancel-no',
            label: '都不是',
            reply: escalateReply('取消'),
          },
        ],
      },
    ],
  },
  {
    key: 'purchase',
    label: '購買相關',
    icon: 'pi pi-shopping-bag',
    children: [
      {
        key: 'purchase-product',
        label: '商品詢問',
        reply:
          '想了解商品規格、庫存或到貨時間嗎？請提供商品名稱或直播場次，專人將為您確認。',
      },
      {
        key: 'purchase-coupon',
        label: '優惠券/紅利',
        reply:
          '可用的優惠券與紅利點數會在結帳頁自動列出；紅利可折抵金額依當前活動而定，詳情請見會員中心。',
      },
      {
        key: 'purchase-payment',
        label: '付款方式',
        reply:
          '目前支援信用卡、行動支付與貨到付款；部分直播場次限定付款方式，會於結帳頁顯示。',
      },
      {
        key: 'purchase-shipping',
        label: '運費/免運',
        reply:
          '運費依配送方式與地區計算，結帳頁會顯示；達免運門檻或使用免運折抵時，運費將自動折抵。',
      },
      {
        key: 'purchase-promo',
        label: '優惠活動',
        reply:
          '最新活動與滿額好禮請見商城首頁活動專區；活動可否併用會於結帳頁提示。',
      },
    ],
  },
  {
    key: 'other',
    label: '其他問題',
    icon: 'pi pi-comment',
    children: [
      {
        key: 'other-account',
        label: '會員帳號',
        reply:
          '登入、綁定或個人資料問題，請至會員中心設定；若無法登入，請提供註冊資訊由專人協助。',
      },
      {
        key: 'other-rule',
        label: '活動辦法',
        reply:
          '各檔活動的參加資格與期限請見活動頁說明；若有疑問可直接把問題打給我。',
      },
      {
        key: 'other-privacy',
        label: '隱私與帳號安全',
        reply:
          '我們重視您的資料安全，帳號相關疑慮請提供聯絡方式，專人將主動與您聯繫。',
      },
      {
        key: 'other-misc',
        label: '其他問題',
        reply:
          '請直接把您的問題打在下方輸入框，我會盡量協助；必要時可轉接真人客服。',
      },
    ],
  },
  {
    key: 'human',
    label: '找真人客服',
    icon: 'pi pi-headphone',
    isPrimary: true,
    reply:
      '已為您登記轉接真人客服 🙋 服務時間為週一至週五 09:00–18:00（例假日除外）。請留下訂單編號與聯絡方式，專人將盡快與您聯繫；非服務時間的訊息我們會於上班後優先處理。',
  },
];

const isOpen = ref(false);
const isAgentTyping = ref(false);
const inputText = ref('');
const messagesRef = ref<HTMLElement | null>(null);

// 訊息 id 遞增計數器（禁用 Date.now() / Math.random()）
let messageIdSeq = 0;
const nextMessageId = (): number => {
  messageIdSeq += 1;
  return messageIdSeq;
};

const messages = ref<ChatMessage[]>([
  {
    id: nextMessageId(),
    role: 'agent',
    text: WELCOME_TEXT,
    time: FIXED_TIME,
    menu: MENU_TREE,
    menuLayout: 'grid',
  },
]);

const scrollToBottom = (): void => {
  nextTick(() => {
    const el = messagesRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
};

const pushMessage = (
  role: ChatRole,
  text: string,
  menu?: MenuButton[],
  menuLayout?: MenuLayout,
): void => {
  messages.value.push({
    id: nextMessageId(),
    role,
    text,
    time: FIXED_TIME,
    menu,
    menuLayout,
  });
  scrollToBottom();
};

/** 送出一則使用者訊息 → 顯示輸入中 → 罐頭假回覆（回覆可再掛一組選單）。 */
const sendUserMessage = (
  text: string,
  reply?: string,
  menu?: MenuButton[],
  menuLayout?: MenuLayout,
): void => {
  const trimmed = text.trim();
  if (!trimmed) return;
  pushMessage('user', trimmed);
  isAgentTyping.value = true;
  scrollToBottom();
  window.setTimeout(() => {
    isAgentTyping.value = false;
    pushMessage('agent', reply ?? GENERIC_REPLY, menu, menuLayout);
  }, TYPING_DELAY_MS);
};

const handleSend = (): void => {
  const text = inputText.value.trim();
  if (!text) return;
  inputText.value = '';
  // 輸入「小幫手」→ 重新叫回 AI 歡迎 + 四大分類
  if (text === HELPER_KEYWORD) {
    sendUserMessage(text, WELCOME_TEXT, MENU_TREE, 'grid');
    return;
  }
  sendUserMessage(text);
};

/**
 * 點選單按鈕：有 children → 下鑽出子項清單（分類用「請選一個項目」引導；
 * 帶自訂 reply 的節點如訂單細項會顯示確認訊息）；否則為葉節點 → 直接罐頭回覆。
 */
const handleMenuClick = (btn: MenuButton): void => {
  if (btn.children && btn.children.length > 0) {
    sendUserMessage(
      btn.label,
      btn.reply ?? categoryPrompt(btn.label),
      btn.children,
      'list',
    );
  } else {
    sendUserMessage(btn.label, btn.reply ?? GENERIC_REPLY);
  }
};

/** ⊞ 選單鈕：上屏「選單」→ 重新叫出歡迎 + 四大分類，永遠回到 root。 */
const handleShowMenu = (): void => {
  sendUserMessage('選單', WELCOME_TEXT, MENU_TREE, 'grid');
};

const handleOpen = (): void => {
  isOpen.value = true;
  scrollToBottom();
};

const handleClose = (): void => {
  isOpen.value = false;
};

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && isOpen.value) handleClose();
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <!-- 客服 FAB：位於設定 FAB（bottom-24）正上方；面板開啟時隱藏避免重疊 -->
  <div v-if="!isOpen" class="fixed right-6 bottom-40 z-[9999]">
    <button
      class="flex h-12 w-12 min-h-11 min-w-11 items-center justify-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
      style="
        background: color-mix(in srgb, var(--primary-bg) 65%, transparent);
      "
      aria-label="線上客服"
      title="線上客服"
      @click="handleOpen"
    >
      <i class="pi pi-comments text-lg text-white" />
    </button>
  </div>

  <!-- 遮罩：點擊關閉（壓過設定 FAB） -->
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <!-- 手機：半透明遮罩變暗；桌機（右下 widget）：透明但仍可點擊關閉 -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[10000] bg-black/40 @3xl:bg-transparent"
      @click="handleClose"
    />
  </Transition>

  <!-- 客服對話面板：手機從底部長出的 bottom sheet；桌機（@3xl↑）為右下角固定 widget -->
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-200 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="isOpen"
      class="fixed inset-x-0 bottom-0 z-[10001] mx-auto flex max-h-[85vh] max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.15)] @3xl:inset-x-auto @3xl:right-6 @3xl:bottom-6 @3xl:mx-0 @3xl:h-[560px] @3xl:max-h-[calc(100%-3rem)] @3xl:w-96 @3xl:rounded-2xl @3xl:shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
    >
      <!-- Header（sticky 於面板頂端；關閉鈕 = 關閉整個 sheet） -->
      <div
        class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 px-4 py-3"
        style="background: var(--primary-surface); color: var(--primary)"
      >
        <span class="flex items-center gap-2 text-base font-bold">
          <i class="pi pi-comments" />
          線上客服
        </span>
        <button
          class="flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-white/60"
          aria-label="關閉"
          @click="handleClose"
        >
          <i class="pi pi-times text-lg" />
        </button>
      </div>

      <!-- 訊息區（可捲動） -->
      <div
        ref="messagesRef"
        class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        <!-- 「今天」日期分隔線 -->
        <div class="flex items-center justify-center">
          <span
            class="rounded-full bg-slate-100 px-3 py-0.5 text-xs text-slate-400"
          >
            今天
          </span>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex flex-col gap-1"
          :class="msg.role === 'user' ? 'items-end' : 'items-start'"
        >
          <!-- AI 客服標籤 -->
          <span
            v-if="msg.role === 'agent'"
            class="text-xs font-medium"
            style="color: var(--primary)"
          >
            AI 客服
          </span>

          <div
            class="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap"
            :class="
              msg.role === 'user'
                ? 'rounded-br-sm text-white'
                : 'rounded-bl-sm bg-slate-100 text-slate-700'
            "
            :style="msg.role === 'user' ? 'background: var(--primary)' : ''"
          >
            {{ msg.text }}
          </div>

          <!-- 時間戳 -->
          <span class="px-1 text-[11px] text-slate-400">{{ msg.time }}</span>

          <!-- 掛在 AI 訊息下方的選單：grid = 四大分類、list = 子項 pill -->
          <div
            v-if="msg.role === 'agent' && msg.menu"
            class="w-full"
            :class="msg.menuLayout === 'grid' ? 'max-w-[85%]' : ''"
          >
            <!-- 2×2 四大分類（帶框 icon + label） -->
            <div
              v-if="msg.menuLayout === 'grid'"
              class="grid grid-cols-2 gap-2"
            >
              <button
                v-for="btn in msg.menu"
                :key="btn.key"
                class="flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors"
                :class="
                  btn.isPrimary
                    ? 'bg-white hover:bg-slate-50'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                "
                :style="
                  btn.isPrimary
                    ? 'border-color: var(--primary); color: var(--primary)'
                    : ''
                "
                @click="handleMenuClick(btn)"
              >
                <i :class="btn.icon" class="text-lg" />
                {{ btn.label }}
              </button>
            </div>

            <!-- 子項清單（帶框按鈕，可選 icon，換行排列） -->
            <div v-else class="flex flex-wrap gap-2">
              <button
                v-for="btn in msg.menu"
                :key="btn.key"
                class="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                @click="handleMenuClick(btn)"
              >
                <i v-if="btn.icon" :class="btn.icon" />
                {{ btn.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- 客服輸入中…佔位 -->
        <div v-if="isAgentTyping" class="flex justify-start">
          <div
            class="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5 text-sm text-slate-400"
          >
            <span class="inline-flex gap-1">
              <span
                class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]"
              />
              <span
                class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]"
              />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </span>
            客服輸入中…
          </div>
        </div>
      </div>

      <!-- 輸入列（固定於面板底部）：左側 ⊞ 選單鈕、中間輸入、右側送出 -->
      <div
        class="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
      >
        <button
          class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="開啟選單"
          title="開啟選單"
          @click="handleShowMenu"
        >
          <i class="pi pi-th-large text-lg" />
        </button>
        <InputText
          v-model="inputText"
          placeholder="看看可以做什麼"
          class="min-h-11 w-full flex-1"
          @keyup.enter="handleSend"
        />
        <Button
          icon="pi pi-send"
          rounded
          class="!min-h-11 !min-w-11 shrink-0"
          aria-label="送出"
          :disabled="!inputText.trim()"
          @click="handleSend"
        />
      </div>
    </div>
  </Transition>
</template>
