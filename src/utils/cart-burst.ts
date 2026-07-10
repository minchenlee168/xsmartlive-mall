import confetti from 'canvas-confetti';

/**
 * 「加入購物車」按鈕的視覺反饋：
 * - Ripple：從點擊位置擴散水波紋（附加到按鈕內部，600ms 後移除）
 * - Confetti：從按鈕中心爆一小把彩帶
 *
 * 使用：直接把 event 傳進來就好；成功後才呼叫，別在被 disable 的按鈕上跑。
 *
 * 尊重 `prefers-reduced-motion: reduce`：偵測到就整個略過，避免動暈。
 */
export const burstAddToCartFromEvent = (event: MouseEvent): void => {
  if (
    typeof window === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;

  addRipple(target, event);
  fireConfettiAt(target);
};

/** 水波紋：<span> 從點擊位置放大 + 淡出，600ms 後移除。 */
const addRipple = (host: HTMLElement, event: MouseEvent): void => {
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const ripple = document.createElement('span');
  ripple.className = 'add-cart-ripple';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x - size / 2}px`;
  ripple.style.top = `${y - size / 2}px`;
  // 保證主機 overflow-hidden；沒設定的話就地補一下（不動原有 class）
  const prevOverflow = host.style.overflow;
  host.style.overflow = 'hidden';
  const prevPosition = getComputedStyle(host).position;
  if (prevPosition === 'static') host.style.position = 'relative';
  host.appendChild(ripple);
  window.setTimeout(() => {
    ripple.remove();
    host.style.overflow = prevOverflow;
  }, 600);
};

/** 從按鈕中心放一小把 confetti；粒子數量壓在 20~30，避免搶戲。 */
const fireConfettiAt = (host: HTMLElement): void => {
  const rect = host.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  const primaryColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim() || '#8b5cf6';
  confetti({
    particleCount: 24,
    spread: 55,
    startVelocity: 32,
    scalar: 0.85,
    ticks: 100,
    gravity: 1.1,
    origin: { x, y },
    colors: [primaryColor, '#fbbf24', '#10b981', '#f472b6'],
    disableForReducedMotion: true,
  });
};
