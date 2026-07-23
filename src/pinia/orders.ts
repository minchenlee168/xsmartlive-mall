import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { OrderRecord, Transaction } from '../types/order';

// 型別 re-export，方便 store 使用者只 import 一處
export type {
  OrderRecord,
  OrderItem,
  PackageInfo,
  OrderStatus,
  TimelineStepKey,
  DetailTab,
  Transaction,
} from '../types/order';

const SAMPLE_TIMES = {
  unpaid: '02/01 07:20',
  to_ship: '02/02 08:30',
  shipped: '02/01 11:18',
  to_receive: '02/02 16:45',
  delivered: '02/03 08:00',
  completed: '02/04 18:00',
};
const IMG_PJ =
  'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&fit=crop';
const IMG_HAT =
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&fit=crop';
const IMG_BIB =
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&fit=crop';

/** 剛結完帳的付款摘要：付款成功頁使用；redirect 進去讀完後 clear。 */
export interface LastPaymentSummary {
  orderNos: string[];
  buyerName: string;
  buyerPhone: string;
  paymentMethod: string;
  deliveryAddress: string;
}

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<OrderRecord[]>([
    {
      id: '11',
      date: '2026/02/02 10:15',
      orderNo: '1000000021',
      qty: 1,
      total: 490,
      payment: '超商代碼繳費',
      delivery: '超商取貨',
      invoice: '個人載具',
      invoiceStatus: 'pending',
      status: 'to_ship',
      detailTab: 'progress',
      expanded: false,
      items: [
        {
          image: IMG_PJ,
          name: '寶寶純棉長袖兩件組',
          spec: '灰，70cm',
          price: 490,
          qty: 1,
          packages: [
            {
              no: 'F2026020211',
              qty: 1,
              currentStep: 'to_ship',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '12',
      date: '2026/01/28 16:40',
      orderNo: '1000000022',
      qty: 2,
      total: 300,
      payment: '線上刷卡',
      delivery: '超商取貨',
      invoice: '個人載具',
      invoiceStatus: 'issued',
      status: 'completed',
      detailTab: 'progress',
      expanded: false,
      items: [
        {
          image: IMG_HAT,
          name: '嬰兒抗 UV 遮陽帽',
          spec: '米，F',
          price: 150,
          qty: 2,
          packages: [
            {
              no: 'F2026012811',
              qty: 2,
              currentStep: 'completed',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '13',
      date: '2026/01/26 12:00',
      orderNo: '1000000023',
      qty: 1,
      total: 290,
      payment: '線上刷卡',
      delivery: '自取',
      invoice: '個人載具',
      invoiceStatus: 'pending',
      status: 'unpaid',
      detailTab: 'progress',
      expanded: false,
      items: [
        {
          image: IMG_BIB,
          name: '寶寶可愛印花圍兜',
          spec: '黃',
          price: 290,
          qty: 1,
          packages: [
            {
              no: 'F2026012611',
              qty: 1,
              currentStep: 'unpaid',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '14',
      date: '2026/01/22 18:20',
      orderNo: '1000000024',
      qty: 2,
      total: 720,
      payment: '線上刷卡',
      delivery: '自取',
      invoice: '個人載具',
      invoiceStatus: 'issued',
      status: 'completed',
      detailTab: 'progress',
      expanded: false,
      items: [
        {
          image: IMG_PJ,
          name: '寶寶長袖包屁衣親子裝',
          spec: '綠，66cm',
          price: 360,
          qty: 2,
          packages: [
            {
              no: 'F2026012211',
              qty: 2,
              currentStep: 'completed',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '1',
      date: '2026/02/03 11:24',
      orderNo: '1000000020',
      qty: 3,
      total: 600,
      payment: '線上刷卡',
      delivery: '宅配',
      invoice: '個人載具',
      invoiceStatus: 'pending',
      status: 'unpaid',
      detailTab: 'progress',
      expanded: true,
      items: [
        {
          image: IMG_PJ,
          name: '秋裝長袖公主南瓜系包屁衣',
          spec: '黃，60cm',
          price: 450,
          qty: 2,
          packages: [
            {
              no: 'F2026020501',
              qty: 2,
              currentStep: 'unpaid',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
        {
          image: IMG_HAT,
          name: '嬰兒抗 UV 遮陽帽',
          spec: '牛仔，F',
          price: 150,
          qty: 1,
          packages: [
            {
              no: 'F2026020502',
              qty: 1,
              currentStep: 'unpaid',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '2',
      date: '2026/02/04 09:50',
      orderNo: '1000000019',
      qty: 4,
      total: 1200,
      payment: 'ATM 轉帳',
      delivery: '宅配',
      invoice: '個人載具',
      invoiceStatus: 'pending',
      status: 'to_ship',
      detailTab: 'progress',
      expanded: true,
      items: [
        {
          image: IMG_PJ,
          name: '秋裝長袖公主南瓜系包屁衣',
          spec: '紅，60cm',
          price: 450,
          qty: 3,
          packages: [
            {
              no: 'F2026020401',
              qty: 3,
              currentStep: 'to_ship',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
        {
          image: IMG_HAT,
          name: '嬰兒抗 UV 遮陽帽',
          spec: '藍，F',
          price: 150,
          qty: 1,
          packages: [
            {
              no: 'F2026020402',
              qty: 1,
              currentStep: 'to_ship',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '3',
      date: '2026/02/03 17:08',
      orderNo: '1000000018',
      qty: 2,
      total: 720,
      payment: '線上刷卡',
      delivery: '超商取貨',
      invoice: '個人載具',
      invoiceStatus: 'issued',
      status: 'completed',
      detailTab: 'progress',
      expanded: true,
      items: [
        {
          image: IMG_PJ,
          name: '寶寶長袖包屁衣親子裝',
          spec: '黑，66cm',
          price: 360,
          qty: 2,
          packages: [
            {
              no: 'F2026020301',
              qty: 2,
              currentStep: 'to_receive',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '4',
      date: '2026/02/02 13:33',
      orderNo: '1000000017',
      qty: 1,
      total: 290,
      payment: '貨到付款',
      delivery: '宅配',
      invoice: '個人載具',
      invoiceStatus: 'issued',
      status: 'completed',
      detailTab: 'progress',
      expanded: true,
      items: [
        {
          image: IMG_BIB,
          name: '寶寶可愛印花圍兜',
          spec: '粉',
          price: 290,
          qty: 1,
          packages: [
            {
              no: 'F2026020201',
              qty: 1,
              currentStep: 'delivered',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '5',
      date: '2026/01/29 20:15',
      orderNo: '1000000010',
      qty: 4,
      total: 600,
      payment: '線上刷卡',
      delivery: '宅配',
      invoice: '個人載具',
      invoiceStatus: 'issued',
      status: 'completed',
      detailTab: 'progress',
      expanded: true,
      items: [
        {
          image: IMG_PJ,
          name: '秋裝長袖公主南瓜系包屁衣',
          spec: '黃，60cm',
          price: 450,
          qty: 3,
          packages: [
            {
              no: 'F2026012901',
              qty: 2,
              currentStep: 'completed',
              stepTimes: SAMPLE_TIMES,
            },
            {
              no: 'F2026012919',
              qty: 1,
              currentStep: 'completed',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
        {
          image: IMG_HAT,
          name: '嬰兒抗 UV 遮陽帽',
          spec: '牛仔，F',
          price: 150,
          qty: 1,
          packages: [
            {
              no: 'F2026012911',
              qty: 1,
              currentStep: 'completed',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '6',
      date: '2026/01/25 10:00',
      orderNo: '1000000005',
      qty: 4,
      total: 980,
      payment: '線上刷卡',
      delivery: '宅配',
      invoice: '不開立',
      invoiceStatus: 'none',
      status: 'completed',
      detailTab: 'progress',
      expanded: true,
      items: [
        {
          image: IMG_PJ,
          name: '寶寶純棉長袖兩件組',
          spec: '白，66cm',
          price: 490,
          qty: 2,
          packages: [
            {
              no: 'F2026012501',
              qty: 1,
              currentStep: 'shipped',
              stepTimes: SAMPLE_TIMES,
            },
            {
              no: 'F2026012502',
              qty: 1,
              currentStep: 'to_receive',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '7',
      date: '2026/01/20 14:42',
      orderNo: '1000000001',
      qty: 1,
      total: 320,
      payment: '線上刷卡',
      delivery: '宅配',
      invoice: '個人載具',
      invoiceStatus: 'pending',
      status: 'cancelled',
      detailTab: 'progress',
      expanded: true,
      items: [
        {
          image: IMG_BIB,
          name: '寶寶可愛印花圍兜',
          spec: '藍',
          price: 320,
          qty: 1,
          packages: [
            {
              no: 'F2026012001',
              qty: 1,
              currentStep: 'unpaid',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '8',
      date: '2026/01/15 09:21',
      orderNo: '1000000000',
      qty: 1,
      total: 450,
      payment: '線上刷卡',
      delivery: '宅配',
      invoice: '個人載具',
      invoiceStatus: 'voided',
      status: 'returned',
      detailTab: 'progress',
      expanded: true,
      items: [
        {
          image: IMG_PJ,
          name: '寶寶長袖包屁衣親子裝',
          spec: '白，66cm',
          price: 450,
          qty: 1,
          packages: [
            {
              no: 'F2026011501',
              qty: 1,
              currentStep: 'delivered',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '9',
      date: '2026/01/12 15:30',
      orderNo: '1000000009',
      qty: 1,
      total: 520,
      payment: '線上刷卡',
      delivery: '宅配',
      invoice: '個人載具',
      invoiceStatus: 'issued',
      status: 'completed',
      detailTab: 'return',
      expanded: true,
      items: [
        {
          image: IMG_PJ,
          name: '寶寶純棉短袖套裝',
          spec: '粉，70cm',
          price: 520,
          qty: 1,
          returnStatus: 'approved',
          packages: [
            {
              no: 'F2026011201',
              qty: 1,
              currentStep: 'delivered',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
    {
      id: '10',
      date: '2026/01/10 09:45',
      orderNo: '1000000010',
      qty: 1,
      total: 380,
      payment: '線上刷卡',
      delivery: '宅配',
      invoice: '個人載具',
      invoiceStatus: 'issued',
      status: 'completed',
      detailTab: 'return',
      expanded: true,
      items: [
        {
          image: IMG_HAT,
          name: '嬰兒抗 UV 遮陽帽',
          spec: '藍，F',
          price: 380,
          qty: 1,
          returnStatus: 'rejected',
          returnRejectReason:
            '商品已超過 7 天鑑賞期，依據退換貨政策無法受理。若對此結果有疑問，請透過訂單提問聯絡客服。',
          packages: [
            {
              no: 'F2026011001',
              qty: 1,
              currentStep: 'delivered',
              stepTimes: SAMPLE_TIMES,
            },
          ],
        },
      ],
    },
  ]);

  const transactions = ref<Transaction[]>([
    {
      date: '2026-05-12',
      method: '線上信用卡',
      orderId: 'SO20260512001',
      amount: 1936,
    },
    {
      date: '2026-04-30',
      method: 'ATM 轉帳',
      orderId: 'SO20260430017',
      amount: 688,
    },
    {
      date: '2026-04-18',
      method: '貨到付款',
      orderId: 'SO20260418009',
      amount: 1290,
    },
  ]);

  let seq = 20;
  function pad2(n: number) {
    return String(n).padStart(2, '0');
  }

  // 由結帳頁呼叫：將購物車已勾選商品 + 付款/配送方式 寫入「我的訂單」與交易記錄
  function placeOrder(input: {
    items: Array<{
      name: string;
      image?: string;
      spec: string;
      price: number;
      qty: number;
    }>;
    total: number;
    payment: string;
    delivery: string;
    buyerNote?: string;
  }): string {
    seq += 1;
    const now = new Date();
    const ymd = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
    const orderNo = `${1000000020 + seq}`;
    const orderId = `SO${ymd}${pad2(seq)}`;
    const time = `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const date = `${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const dateShort = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

    const items: OrderItem[] = input.items.map((it, idx) => ({
      image: it.image,
      name: it.name,
      spec: it.spec || '預設',
      price: it.price,
      qty: it.qty,
      packages: [
        {
          no: `F${ymd}${pad2(seq)}${pad2(idx + 1)}`,
          qty: it.qty,
          currentStep: 'unpaid',
          stepTimes: { unpaid: time },
        },
      ],
    }));

    // 只保留最新一筆展開，其餘自動收合
    orders.value.forEach((o) => {
      o.expanded = false;
    });
    orders.value.unshift({
      id: orderId,
      date,
      orderNo,
      qty: items.reduce((s, i) => s + i.qty, 0),
      total: input.total,
      payment: input.payment,
      delivery: input.delivery,
      invoice: '個人載具',
      invoiceStatus: 'pending',
      status: 'unpaid',
      detailTab: 'progress',
      expanded: true,
      items,
      buyerNote: input.buyerNote,
    });
    transactions.value.unshift({
      date: dateShort,
      method: input.payment,
      orderId,
      amount: input.total,
    });
    return orderNo;
  }

  const lastPaymentSummary = ref<LastPaymentSummary | null>(null);
  const setLastPaymentSummary = (s: LastPaymentSummary | null) => {
    lastPaymentSummary.value = s;
  };

  /** 買家確認「已完成」：已送達的包裹推進到 completed，訂單狀態轉為 completed。 */
  function completeOrder(orderId: string): void {
    const order = orders.value.find((o) => o.id === orderId);
    if (!order) return;
    const now = new Date();
    const t = `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} ${pad2(
      now.getHours(),
    )}:${pad2(now.getMinutes())}`;
    order.items.forEach((it) => {
      it.packages.forEach((p) => {
        if (p.currentStep === 'delivered') {
          p.currentStep = 'completed';
          p.stepTimes = { ...p.stepTimes, completed: t };
        }
      });
    });
    order.status = 'completed';
  }

  return {
    orders,
    transactions,
    placeOrder,
    completeOrder,
    lastPaymentSummary,
    setLastPaymentSummary,
  };
});
