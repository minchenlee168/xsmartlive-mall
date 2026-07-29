import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Currency, Language } from '../types/prefs';

export type { Currency, Language } from '../types/prefs';

// 匯率為原型示範用約略值（以台幣為基準：1 TWD = rate 單位此貨幣）
export const currencies: Currency[] = [
  { symbol: 'NT$', code: 'TWD', label: '新台幣', rate: 1, decimals: 0 },
  { symbol: 'US$', code: 'USD', label: '美元', rate: 0.031, decimals: 2 },
  { symbol: 'HK$', code: 'HKD', label: '港幣', rate: 0.243, decimals: 2 },
  { symbol: '¥', code: 'JPY', label: '日圓', rate: 4.7, decimals: 0 },
];

export const languages: Language[] = [
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'en', label: 'English' },
];

export const usePrefsStore = defineStore('prefs', () => {
  const currency = ref<Currency>(currencies[0]);
  const language = ref<Language>(languages[0]);

  function setCurrency(c: Currency) {
    currency.value = c;
  }
  function setLanguage(l: Language) {
    language.value = l;
  }

  return {
    currency,
    language,
    currencies,
    languages,
    setCurrency,
    setLanguage,
  };
});
