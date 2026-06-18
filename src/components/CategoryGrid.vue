<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const categories = [
  { icon: 'pi-star', label: '精選推薦', color: 'bg-red-50 text-red-500' },
  { icon: 'pi-bolt', label: '限時秒殺', color: 'bg-orange-50 text-orange-500' },
  { icon: 'pi-tag', label: '品牌特賣', color: 'bg-pink-50 text-pink-500' },
  { icon: 'pi-gift', label: '新人禮包', color: 'bg-purple-50 text-purple-500' },
  { icon: 'pi-shopping-bag', label: '服飾穿搭', color: 'bg-blue-50 text-blue-500' },
  { icon: 'pi-heart', label: '美妝保養', color: 'bg-rose-50 text-rose-500' },
  { icon: 'pi-home', label: '居家生活', color: 'bg-green-50 text-green-500' },
  { icon: 'pi-ellipsis-h', label: '更多分類', color: 'bg-gray-100 text-gray-500' },
]
</script>

<template>
  <section class="bg-white mx-3 mt-3 rounded-2xl p-4">
    <div class="grid grid-cols-4 gap-y-4">
      <div
        v-for="cat in categories"
        :key="cat.label"
        class="flex flex-col items-center gap-1.5 cursor-pointer"
        @click="router.push({ path: '/search', query: { q: cat.label } })"
      >
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center" :class="cat.color">
          <i :class="`pi ${cat.icon} text-xl`" />
        </div>
        <span class="text-xs text-gray-600">{{ cat.label }}</span>
      </div>
    </div>
  </section>
</template>
