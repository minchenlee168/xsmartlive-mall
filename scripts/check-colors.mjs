#!/usr/bin/env node
/**
 * 寫死顏色檢查 — 掃 .vue 檔裡非白名單的寫死 hex。
 *
 * 規範見 docs/design-tokens.md：主題色走 token、中性灰走 slate 或 surface token、
 * 第三方品牌色集中在 utils/brand-colors.ts。
 *
 * 用法：
 *   node scripts/check-colors.mjs <file...>     檢查指定檔
 *   node scripts/check-colors.mjs               無參數 → 讀 hook stdin(JSON) 取 file_path；
 *                                               非 JSON → 全掃 src/
 *   node scripts/check-colors.mjs --update-baseline   全掃並把現況寫入 baseline（既存視為豁免）
 *   node scripts/check-colors.mjs --all         全掃 src/（含既存，忽略 baseline）
 *
 * baseline 機制：既存的寫死色記在 .claude/color-baseline.json，checker 只擋「新增」的，
 * 不騷擾 legacy。既存要清理時另開工作，見 docs/hardcoded-color-cleanup.md。
 *
 * 退出碼：發現「新增」違規 → 2（PostToolUse hook 把 stderr 回饋給 Claude 自我修正）；否則 0。
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdirSync,
} from 'node:fs';
import { join, dirname, relative } from 'node:path';

// 整檔豁免：純 SVG 插畫、AppToast 自成一套語義色盤、App.vue 裝置框美術
const EXEMPT_FILES = [
  'MemberIcon.vue',
  'PageLoading.vue',
  'AppToast.vue',
  'App.vue',
];
const ALLOWED = new Set(['#fff', '#ffff', '#ffffff']); // 中性白，不需 token
const EXEMPT_MARKS = ['brand-color', 'color-exempt']; // 行內標記 → 該行豁免
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const BASELINE = '.claude/color-baseline.json';

const isExemptFile = (path) => EXEMPT_FILES.some((n) => path.endsWith(n));
const keyOf = (v) => `${v.path}::${v.hex.toLowerCase()}::${v.text}`;

const collectVue = (dir, out) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) collectVue(p, out);
    else if (name.endsWith('.vue')) out.push(p);
  }
};

const checkFile = (path) => {
  if (!path.endsWith('.vue') || isExemptFile(path) || !existsSync(path)) return [];
  // baseline 用相對路徑存 key；hook 傳進來的是絕對路徑 → 統一正規化成相對，兩邊才對得上。
  const rel = path.startsWith('/') ? relative(process.cwd(), path) : path;
  const violations = [];
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const lower = line.toLowerCase();
    if (EXEMPT_MARKS.some((m) => lower.includes(m))) return;
    for (const hex of line.match(HEX_RE) ?? []) {
      if (ALLOWED.has(hex.toLowerCase())) continue;
      violations.push({ path: rel, line: i + 1, hex, text: line.trim() });
    }
  });
  return violations;
};

const loadBaseline = () => {
  if (!existsSync(BASELINE)) return new Set();
  try {
    return new Set(JSON.parse(readFileSync(BASELINE, 'utf8')));
  } catch {
    return new Set();
  }
};

const scanAll = () => {
  const out = [];
  if (existsSync('src')) collectVue('src', out);
  return out.flatMap(checkFile);
};

const args = process.argv.slice(2);

// --- 更新 baseline ---
if (args.includes('--update-baseline')) {
  const keys = [...new Set(scanAll().map(keyOf))].sort();
  if (!existsSync(dirname(BASELINE))) mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(BASELINE, JSON.stringify(keys, null, 2) + '\n');
  process.stderr.write(`✅ baseline 已更新：${keys.length} 筆既存寫死色記入 ${BASELINE}\n`);
  process.exit(0);
}

// --- 決定檢查範圍 ---
let files = args.filter((a) => !a.startsWith('--'));
const scanEverything = args.includes('--all');
if (files.length === 0 && !scanEverything) {
  let stdin = '';
  try {
    stdin = readFileSync(0, 'utf8');
  } catch {
    /* 無 stdin */
  }
  let fp = null;
  try {
    fp = JSON.parse(stdin)?.tool_input?.file_path ?? null;
  } catch {
    /* 非 JSON */
  }
  if (fp) files = [fp];
}

const raw = scanEverything || files.length === 0 ? scanAll() : files.flatMap(checkFile);
// --all 忽略 baseline（列出全部）；其餘只報「不在 baseline」的新增違規
const baseline = scanEverything ? new Set() : loadBaseline();
const all = raw.filter((v) => !baseline.has(keyOf(v)));

if (all.length === 0) process.exit(0);

process.stderr.write(
  `\n⚠️  發現 ${all.length} 處${scanEverything ? '' : '新增'}寫死顏色（違反 docs/design-tokens.md）：\n`,
);
for (const v of all) {
  process.stderr.write(`  ${v.path}:${v.line}  ${v.hex}\n    ${v.text}\n`);
}
process.stderr.write(
  `\n處理方式：主題色→token(var(--primary)…)、中性灰→slate 或 surface token、` +
    `第三方品牌→utils/brand-colors.ts。刻意保留請在該行加 "<!-- color-exempt: 原因 -->" 註解。\n`,
);
process.exit(2);
