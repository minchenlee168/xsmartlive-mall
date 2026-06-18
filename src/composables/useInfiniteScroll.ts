import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

interface UseInfiniteScrollOptions {
  /** sentinel 接近視窗多遠就觸發 loadMore（rootMargin），預設 '300px'。 */
  rootMargin?: string;
}

/**
 * 動態載入用：把 returned sentinelRef 綁到 list 末尾的元素，
 * 進入視窗（含 rootMargin buffer）就呼叫 loadMore。
 * hasMore 變 false 時自動 disconnect，不再觸發。
 */
export const useInfiniteScroll = (
  loadMore: () => void,
  hasMore: () => boolean,
  options: UseInfiniteScrollOptions = {},
) => {
  const sentinelRef = ref<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;

  const disconnect = () => {
    observer?.disconnect();
    observer = null;
  };

  const connect = () => {
    if (observer || !sentinelRef.value) return;
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore()) loadMore();
      },
      { rootMargin: options.rootMargin ?? '300px' },
    );
    observer.observe(sentinelRef.value);
  };

  onMounted(() => {
    watch(sentinelRef, (el) => (el ? connect() : disconnect()), {
      immediate: true,
    });
  });
  onBeforeUnmount(disconnect);

  return { sentinelRef };
};
