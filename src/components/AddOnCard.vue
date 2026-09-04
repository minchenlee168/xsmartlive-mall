<script setup lang="ts">
import { useMoney } from '../composables/useMoney';

/** 加購卡商品（與 CartPage 的 ADD_ON_PRODUCTS 結構相容）。 */
interface AddOnCardProduct {
  id: number;
  name: string;
  price: number;
  original?: number;
  image: string;
}

const props = defineProps<{
  product: AddOnCardProduct;
  cartId: number;
  isPc: boolean;
  /** 剛加入的動畫 / 成功態（由父層 justAddedMap 控制）。 */
  justAdded: boolean;
}>();

const emit = defineEmits<{ (e: 'add', ev: MouseEvent): void }>();

const { money } = useMoney();

const handleClick = (e: MouseEvent): void => emit('add', e);
const handleMouseOver = (e: MouseEvent): void => {
  if (props.justAdded) return;
  (e.currentTarget as HTMLElement).style.background = 'var(--primary-hover-bg)';
};
const handleMouseLeave = (e: MouseEvent): void => {
  if (props.justAdded) return;
  (e.currentTarget as HTMLElement).style.background = 'var(--primary-bg)';
};
</script>

<template>
  <div class="flex h-full min-w-0 flex-col gap-1 rounded-lg p-1">
    <div
      class="aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-slate-200"
    >
      <ProductImage :src="product.image" :alt="product.name" size="md" />
    </div>
    <p
      class="line-clamp-2 min-h-[2lh] text-sm leading-snug text-slate-950 @7xl:text-base"
    >
      {{ product.name }}
    </p>
    <span
      class="text-base font-bold @7xl:text-lg"
      style="color: var(--primary)"
    >
      {{ money(product.price) }}
    </span>

    <!-- 加入購物車：外觀對齊分類頁 ProductCard 的 CTA；點按由父層決定跳規格 / 任選組合彈窗 -->
    <button
      class="add-cart-btn mt-auto flex w-full items-center justify-center font-medium whitespace-nowrap transition-all duration-200"
      :class="[
        isPc
          ? 'gap-2 rounded-lg px-1 py-3 text-base'
          : 'min-h-11 gap-1 rounded-lg px-3 py-2 text-sm',
        justAdded ? 'added-pop' : '',
      ]"
      :style="
        justAdded
          ? {
              background: 'var(--success)',
              border: '1px solid var(--success-border)',
              color: '#fff',
            }
          : {
              background: 'var(--primary-bg)',
              border: '1px solid var(--primary)',
              color: '#fff',
            }
      "
      :disabled="justAdded"
      @mouseover="handleMouseOver"
      @mouseleave="handleMouseLeave"
      @click="handleClick"
    >
      <i
        :class="[justAdded ? 'pi pi-check-circle' : 'pi pi-cart-plus', 'text-xl']"
      />
      <span v-if="isPc">
        {{ justAdded ? '已加入購物車' : '加入購物車' }}
      </span>
    </button>
  </div>
</template>
