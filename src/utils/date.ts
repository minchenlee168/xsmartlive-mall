/** 'YYYY-MM-DD' → Date（本地時區）。 */
export const parseDashDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Date → 'YYYY-MM-DD'。 */
export const formatDashDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY/MM/DD HH:mm' 或 'YYYY/MM/DD' → Date（解析失敗回 null）。 */
export const parseSlashDate = (s: string): Date | null => {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

/** Date → 'YYYY/MM/DD'（null → '—'）。 */
export const formatSlashDate = (d: Date | null): string =>
  d ? `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}` : '—';

/** 兩個 Date → 'YYYY/MM/DD - YYYY/MM/DD'。 */
export const formatDateRange = (range: Array<Date | null>): string =>
  `${formatSlashDate(range[0])} - ${formatSlashDate(range[1])}`;

const pad = (n: number): string => String(n).padStart(2, '0');
