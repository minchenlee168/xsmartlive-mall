<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 倒數計時
const hours = ref(2)
const minutes = ref(8)
const seconds = ref(46)
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  timer = setInterval(() => {
    if (seconds.value > 0) seconds.value--
    else if (minutes.value > 0) { minutes.value--; seconds.value = 59 }
    else if (hours.value > 0) { hours.value--; minutes.value = 59; seconds.value = 59 }
  }, 1000)
})
onUnmounted(() => clearInterval(timer))
const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <!-- 紅色 header bar：比照 Figma（1280:53），限時搶購靠左、倒數靠右；內部用 cqh 等比例縮放 -->
  <div
    class="bg-red-300 rounded-[0.5rem] w-full flex items-center justify-between"
    style="aspect-ratio: 1280 / 53; min-height: 40px; container-type: size; padding-inline: 1rem;"
  >
    <!-- 靠左：限時搶購（緊貼左側） -->
    <div class="flex items-center" style="gap: 19cqh;">
      <i class="pi pi-stopwatch text-[#334155]" style="font-size: 41cqh;" />
      <span class="font-bold text-[#334155] whitespace-nowrap" style="font-size: 45cqh;">限時搶購</span>
    </div>
    <!-- 靠右：倒數時間（緊貼右側） -->
    <div class="flex items-center" style="gap: 30cqh;">
      <span class="font-bold text-[#334155] whitespace-nowrap" style="font-size: 45cqh;">倒數</span>
      <div class="flex items-center" style="gap: 7cqh;">
        <span class="bg-red-400 text-white font-bold flex items-center justify-center tabular-nums"
          style="font-size: 45cqh; padding: 7cqh; min-width: 60cqh; border-radius: 11cqh;">{{ pad(hours) }}</span>
        <span class="font-bold text-[#334155]" style="font-size: 45cqh;">:</span>
        <span class="bg-red-400 text-white font-bold flex items-center justify-center tabular-nums"
          style="font-size: 45cqh; padding: 7cqh; min-width: 60cqh; border-radius: 11cqh;">{{ pad(minutes) }}</span>
        <span class="font-bold text-[#334155]" style="font-size: 45cqh;">:</span>
        <span class="bg-red-400 text-white font-bold flex items-center justify-center tabular-nums"
          style="font-size: 45cqh; padding: 7cqh; min-width: 60cqh; border-radius: 11cqh;">{{ pad(seconds) }}</span>
      </div>
    </div>
  </div>
</template>
