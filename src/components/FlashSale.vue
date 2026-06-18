<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

const hours = ref(2);
const minutes = ref(34);
const seconds = ref(59);

let timer: ReturnType<typeof setInterval>;

onMounted(() => {
  timer = setInterval(() => {
    if (seconds.value > 0) {
      seconds.value--;
    } else if (minutes.value > 0) {
      minutes.value--;
      seconds.value = 59;
    } else if (hours.value > 0) {
      hours.value--;
      minutes.value = 59;
      seconds.value = 59;
    }
  }, 1000);
});
onUnmounted(() => clearInterval(timer));

const pad = (n: number) => String(n).padStart(2, '0');

const items = [
  {
    id: 1,
    name: '韓系寬鬆上衣',
    price: 299,
    original: 599,
    sold: 72,
    color: 'bg-pink-100',
  },
  {
    id: 2,
    name: '防曬乳 SPF50+',
    price: 189,
    original: 380,
    sold: 88,
    color: 'bg-yellow-100',
  },
  {
    id: 3,
    name: '無線藍牙耳機',
    price: 890,
    original: 1580,
    sold: 45,
    color: 'bg-blue-100',
  },
  {
    id: 4,
    name: '保溼面膜 10片',
    price: 149,
    original: 299,
    sold: 91,
    color: 'bg-green-100',
  },
];
</script>

<template>
  <section class="mx-3 mt-3">
    <!-- header -->
    <div
      class="flex items-center justify-between rounded-t-2xl bg-red-500 px-4 py-3"
    >
      <div class="flex items-center gap-2">
        <i class="pi pi-bolt text-base text-yellow-300" />
        <span class="text-base font-bold text-white">限時秒殺</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-xs text-white/80">距結束</span>
        <span
          class="rounded bg-black/30 px-1.5 py-0.5 text-xs font-bold text-white tabular-nums"
          >{{ pad(hours) }}</span
        >
        <span class="text-xs text-white">:</span>
        <span
          class="rounded bg-black/30 px-1.5 py-0.5 text-xs font-bold text-white tabular-nums"
          >{{ pad(minutes) }}</span
        >
        <span class="text-xs text-white">:</span>
        <span
          class="rounded bg-black/30 px-1.5 py-0.5 text-xs font-bold text-white tabular-nums"
          >{{ pad(seconds) }}</span
        >
      </div>
    </div>

    <!-- cards -->
    <div class="overflow-x-auto rounded-b-2xl bg-white px-4 pt-3 pb-4">
      <div class="flex w-max gap-3">
        <div
          v-for="item in items"
          :key="item.id"
          class="flex w-28 cursor-pointer flex-col gap-1"
          @click="router.push(`/product/${item.id}`)"
        >
          <!-- image placeholder -->
          <div
            class="flex h-28 w-28 items-center justify-center rounded-xl"
            :class="item.color"
          >
            <i class="pi pi-image text-2xl text-gray-400" />
          </div>
          <p class="line-clamp-2 text-xs leading-snug text-gray-700">
            {{ item.name }}
          </p>
          <div class="flex items-baseline gap-1">
            <span class="text-sm font-bold text-red-500"
              >${{ item.price }}</span
            >
            <span class="text-xs text-gray-400 line-through"
              >${{ item.original }}</span
            >
          </div>
          <!-- sold progress -->
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              class="h-full rounded-full bg-red-400"
              :style="{ width: item.sold + '%' }"
            />
          </div>
          <span class="text-xs text-gray-400">已搶 {{ item.sold }}%</span>
        </div>
      </div>
    </div>
  </section>
</template>
