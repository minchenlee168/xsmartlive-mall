import { ref, computed, onBeforeUnmount } from 'vue';

/**
 * 倒數計時器（OTP / 驗證碼 resend cooldown 用）。
 * `start(seconds)` 啟動倒數，每秒 -1 到 0；`reset()` 立刻歸零並清 timer。
 * `isActive` 為 true 表示還在倒數中（給按鈕 disabled 用）。
 */
export const useCountdown = () => {
  const remaining = ref(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  const clearTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const start = (seconds: number) => {
    clearTimer();
    remaining.value = seconds;
    timer = setInterval(() => {
      remaining.value -= 1;
      if (remaining.value <= 0) clearTimer();
    }, 1000);
  };

  const reset = () => {
    clearTimer();
    remaining.value = 0;
  };

  onBeforeUnmount(clearTimer);

  return {
    remaining,
    isActive: computed(() => remaining.value > 0),
    start,
    reset,
  };
};
