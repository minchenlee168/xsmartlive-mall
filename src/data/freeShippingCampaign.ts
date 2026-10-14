import { parseDashDate, parseSlashDate, formatSlashDate } from '../utils/date';

/**
 * 「期間首購後免運」檔期設定（原型固定）。
 *
 * 規則：
 * - 觸發條件：檔期內只要下過一筆訂單（首購）就解鎖——不要求首筆實付運費。
 * - 免運範圍：解鎖後，檔期內後續每一筆訂單皆免運；檔期結束即失效。
 *
 * 原型把「帳號級」檔期設成已結束（9 月、休眠），讓「購物車級」（每台開關控制、10 月）
 * 的獨立畫面能展示、不被帳號級擇優壓過。要展示帳號級時把此檔期改回涵蓋今天即可。
 */
export const FREE_SHIPPING_CAMPAIGN = {
  id: 'first-purchase-free-shipping-2026q4',
  name: '期間首購後免運',
  /** 檔期起日（含當日）。 */
  startDate: '2026-09-01',
  /** 檔期訖日（含當日，到 23:59:59 仍有效）。 */
  endDate: '2026-09-30',
} as const;

const DAY_IN_MS = 86_400_000;
/** 一天最後一刻（含訖日當天整天）。 */
const END_OF_DAY = { h: 23, m: 59, s: 59, ms: 999 };

/** 檔期起始（當日 00:00）。 */
export const campaignStartDate = (): Date =>
  parseDashDate(FREE_SHIPPING_CAMPAIGN.startDate);

/** 檔期結束（訖日當天 23:59:59）。 */
export const campaignEndDate = (): Date => {
  const d = parseDashDate(FREE_SHIPPING_CAMPAIGN.endDate);
  d.setHours(END_OF_DAY.h, END_OF_DAY.m, END_OF_DAY.s, END_OF_DAY.ms);
  return d;
};

/** 檔期訖日顯示字串（'YYYY/MM/DD'）。 */
export const campaignEndLabel = (): string => formatSlashDate(campaignEndDate());

/** now 是否落在檔期內。 */
export const isWithinCampaign = (now: Date): boolean =>
  now >= campaignStartDate() && now <= campaignEndDate();

/** 訂單日期字串（'YYYY/MM/DD …'）是否落在檔期內。 */
export const isOrderDateInCampaign = (dateStr: string): boolean => {
  const d = parseSlashDate(dateStr);
  return !!d && d >= campaignStartDate() && d <= campaignEndDate();
};

/** 距檔期結束剩餘天數（至少 0）。 */
export const campaignDaysLeft = (now: Date): number =>
  Math.max(
    0,
    Math.ceil((campaignEndDate().getTime() - now.getTime()) / DAY_IN_MS),
  );

// ── 購物車級「賣場回購免運」檔期窗（共用）─────────────────────────────────────
/**
 * 與帳號級並存的另一種來源：綁定「某一台賣場 / 場次」。
 * 規則：加入該台購物車後，該台「第一筆付運費、其餘每一筆免運」（限該台、檔期內）。
 * 哪些台參與由各購物車的開關（CartGroup.freeShippingReturn）控制，此處只定義共用檔期窗。
 */
export const CART_RETURN_FREE_SHIPPING_WINDOW = {
  startDate: '2026-10-01',
  endDate: '2026-10-31',
} as const;

const returnWindowEnd = (): Date => {
  const d = parseDashDate(CART_RETURN_FREE_SHIPPING_WINDOW.endDate);
  d.setHours(END_OF_DAY.h, END_OF_DAY.m, END_OF_DAY.s, END_OF_DAY.ms);
  return d;
};

/** 回購免運檔期窗是否進行中。 */
export const isReturnWindowActive = (now: Date): boolean =>
  now >= parseDashDate(CART_RETURN_FREE_SHIPPING_WINDOW.startDate) &&
  now <= returnWindowEnd();

/** 訂單日期字串是否落在回購免運檔期窗內。 */
export const isOrderDateInReturnWindow = (dateStr: string): boolean => {
  const d = parseSlashDate(dateStr);
  return (
    !!d &&
    d >= parseDashDate(CART_RETURN_FREE_SHIPPING_WINDOW.startDate) &&
    d <= returnWindowEnd()
  );
};

/** 回購免運檔期窗訖日顯示字串。 */
export const returnWindowEndLabel = (): string =>
  formatSlashDate(returnWindowEnd());

/** 回購免運檔期窗距結束剩餘天數（至少 0）。 */
export const returnWindowDaysLeft = (now: Date): number =>
  Math.max(0, Math.ceil((returnWindowEnd().getTime() - now.getTime()) / DAY_IN_MS));
