export interface Currency {
  symbol: string;
  code: string;
  label: string;
  /** 對台幣的匯率：1 TWD = rate 單位此貨幣（TWD 基準 = 1）。 */
  rate: number;
  /** 顯示小數位數（TWD / JPY 為 0，USD / HKD 為 2）。 */
  decimals: number;
}

export interface Language {
  code: string;
  label: string;
}
