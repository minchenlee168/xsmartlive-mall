/**
 * 不適用免運的偏遠地區（外島 / 離島 / 花東地區 / 山區部落）。
 *
 * 原型以「地址字串關鍵字」判定；正式系統應改用郵遞區號 / 行政區對照表，
 * 以免誤判（例如路名、店名剛好含關鍵字）。
 */
export const REMOTE_AREA_KEYWORDS: string[] = [
  // 離島 / 外島
  '澎湖',
  '金門',
  '連江',
  '馬祖',
  '綠島',
  '蘭嶼',
  '琉球',
  // 花東地區
  '花蓮',
  '台東',
  '臺東',
  // 山區部落（原住民族鄉 / 常見山區行政區）
  '仁愛鄉',
  '信義鄉',
  '和平區',
  '尖石鄉',
  '五峰鄉',
  '秀林鄉',
  '卓溪鄉',
  '海端鄉',
  '延平鄉',
  '桃源區',
  '那瑪夏區',
  '茂林區',
  '阿里山',
];

/** 地址字串是否落在不適用免運的偏遠地區。 */
export const isRemoteArea = (address: string | undefined | null): boolean =>
  !!address && REMOTE_AREA_KEYWORDS.some((k) => address.includes(k));
