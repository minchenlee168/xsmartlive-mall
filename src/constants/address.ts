/**
 * 收件地址（宅配）四國別共用常數與工具。
 * 會員中心（新增 / 編輯地址）與結帳頁（新增宅配地址）共讀同一份，
 * 避免菲律賓逐層連動、馬來西亞州屬等假資料在兩頁分叉。
 *
 * 四國別規格：
 * - 台灣：郵遞 6 碼必填；城市 / 區（下拉 ×2）→ 詳細收件地址
 * - 新加坡：郵遞 6 碼必填；無城市、無州省，直接詳細收件地址
 * - 馬來西亞：郵遞 5 碼必填；城市（文字）→ 州 / 省 / 地區（下拉）→ 詳細收件地址
 * - 菲律賓：郵遞 4 碼非必填；大區 → 省 → 市 → 村里（皆下拉）→ 詳細收件地址
 */

export const TAIWAN = '台灣';
export const MALAYSIA = '馬來西亞';
export const SINGAPORE = '新加坡';
export const PHILIPPINES = '菲律賓';

// 國別清單為原型展示用。實際上非台灣的跨境國別，須待系統支援跨境配送後才會出現。
export const COUNTRIES = [TAIWAN, MALAYSIA, SINGAPORE, PHILIPPINES];

/** 國別 → 電話國碼（選國別時自動帶入）。 */
export const COUNTRY_DIAL_CODES: Record<string, string> = {
  [TAIWAN]: '+886',
  [MALAYSIA]: '+60',
  [SINGAPORE]: '+65',
  [PHILIPPINES]: '+63',
};

/** 國別 → 郵遞區號碼數（InputText maxlength 與碼數驗證共用）。 */
export const POSTAL_LENGTH: Record<string, number> = {
  [TAIWAN]: 6,
  [SINGAPORE]: 6,
  [MALAYSIA]: 5,
  [PHILIPPINES]: 4,
};

/** 台灣：縣市 → 區連動。 */
export const CITIES = ['台北市', '新北市', '桃園市', '台中市', '高雄市'];
export const DISTRICT_MAP: Record<string, string[]> = {
  台北市: ['信義區', '大安區', '中山區', '內湖區'],
  新北市: ['板橋區', '新莊區', '三重區', '中和區'],
  桃園市: ['桃園區', '中壢區', '平鎮區', '龜山區'],
  台中市: ['西屯區', '北屯區', '南屯區', '大里區'],
  高雄市: ['三民區', '前鎮區', '左營區', '鳳山區'],
};

/**
 * 台灣：區 → 3 碼郵遞區號（區級前綴）。
 * 選定城市 / 區後自動帶入前 3 碼，使用者可續補成 6 碼（3+3 新制）路段碼。
 */
export const TW_DISTRICT_POSTAL: Record<string, string> = {
  信義區: '110',
  大安區: '106',
  中山區: '104',
  內湖區: '114',
  板橋區: '220',
  新莊區: '242',
  三重區: '241',
  中和區: '235',
  桃園區: '330',
  中壢區: '320',
  平鎮區: '324',
  龜山區: '333',
  西屯區: '407',
  北屯區: '406',
  南屯區: '408',
  大里區: '412',
  三民區: '807',
  前鎮區: '806',
  左營區: '813',
  鳳山區: '830',
};

/** 馬來西亞：州屬（州 / 省 / 地區）。 */
export const MY_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Kuala Lumpur',
  'Labuan',
  'Putrajaya',
];

// 菲律賓行政區假資料（原型用），大區 → 省 → 市 → 村里 逐層連動。
export const PH_REGIONS = ['Metro Manila', 'Calabarzon', 'Central Luzon'];
export const PH_PROVINCE_MAP: Record<string, string[]> = {
  'Metro Manila': ['METRO-MANILA'],
  Calabarzon: ['CAVITE', 'LAGUNA', 'BATANGAS'],
  'Central Luzon': ['BULACAN', 'PAMPANGA'],
};
export const PH_CITY_MAP: Record<string, string[]> = {
  'METRO-MANILA': ['BINONDO', 'MAKATI', 'QUEZON CITY'],
  CAVITE: ['BACOOR', 'IMUS'],
  LAGUNA: ['CALAMBA', 'SANTA ROSA'],
  BATANGAS: ['BATANGAS CITY', 'LIPA'],
  BULACAN: ['MALOLOS', 'MEYCAUAYAN'],
  PAMPANGA: ['ANGELES', 'SAN FERNANDO'],
};
export const PH_BARANGAY_MAP: Record<string, string[]> = {
  BINONDO: ['BARANGAY 287', 'BARANGAY 288', 'BARANGAY 289'],
};
export const PH_DEFAULT_BARANGAYS = ['BARANGAY 1', 'BARANGAY 2', 'BARANGAY 3'];

/**
 * 宅配地址欄位組合（各國別用各自命名欄位，未使用者留空）。
 * city：台灣縣市 / 馬來西亞城市；district：台灣區；state：馬來西亞州；
 * phRegion/phProvince/phCity/phBarangay：菲律賓逐層。
 */
export interface HomeAddressParts {
  country: string;
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  detail?: string;
  phRegion?: string;
  phProvince?: string;
  phCity?: string;
  phBarangay?: string;
}

const joinParts = (parts: Array<string | undefined>): string =>
  parts
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');

/**
 * 依該國標準地址書寫順序組出顯示字串。
 * - 台灣（大→小）：郵遞 縣市區 詳細
 * - 新加坡（小→大）：詳細 國別 郵遞
 * - 馬來西亞（小→大）：詳細 郵遞 城市 州 國別
 * - 菲律賓（小→大）：詳細 村里 市 省 大區 郵遞 國別
 */
export const composeHomeAddress = (parts: HomeAddressParts): string => {
  const {
    country,
    city,
    district,
    state,
    postalCode,
    detail,
    phRegion,
    phProvince,
    phCity,
    phBarangay,
  } = parts;
  if (country === PHILIPPINES) {
    return joinParts([
      detail,
      phBarangay,
      phCity,
      phProvince,
      phRegion,
      postalCode,
      country,
    ]);
  }
  if (country === MALAYSIA) {
    return joinParts([detail, postalCode, city, state, country]);
  }
  if (country === SINGAPORE) {
    return joinParts([detail, country, postalCode]);
  }
  // 台灣
  return joinParts([
    postalCode,
    `${(city ?? '').trim()}${(district ?? '').trim()}`,
    detail,
  ]);
};

/** 郵遞區號是否符合該國碼數（未填回傳 false）。 */
export const isPostalLengthValid = (
  country: string,
  postalCode: string,
): boolean => {
  const len = POSTAL_LENGTH[country];
  if (!len) return postalCode.trim().length > 0;
  return postalCode.trim().length === len;
};

/**
 * 宅配地址欄位是否填寫完整（不含收件人姓名 / 電話，由呼叫端另外驗）。
 * 菲律賓：郵遞選填（若填需符合碼數）；其餘國別：郵遞必填且需符合碼數。
 */
export const isHomeAddressComplete = (parts: HomeAddressParts): boolean => {
  const { country, postalCode = '', detail = '' } = parts;
  if (country === PHILIPPINES) {
    // 郵遞選填；若有填需為 4 碼
    if (postalCode.trim() && !isPostalLengthValid(country, postalCode)) {
      return false;
    }
    return !!(
      parts.phRegion &&
      parts.phProvince &&
      parts.phCity &&
      parts.phBarangay &&
      detail.trim()
    );
  }
  if (country === TAIWAN) {
    // 台灣：郵遞 3 碼（區級）或 6 碼（3+3 新制）皆可
    const len = postalCode.trim().length;
    if (len !== 3 && len !== 6) return false;
    return !!detail.trim();
  }
  if (!isPostalLengthValid(country, postalCode)) return false;
  if (country === MALAYSIA) {
    return !!(parts.city?.trim() && parts.state?.trim() && detail.trim());
  }
  if (country === SINGAPORE) {
    return !!detail.trim();
  }
  return !!detail.trim();
};
