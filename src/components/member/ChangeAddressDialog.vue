<script setup lang="ts">
import { ref, computed, watch } from 'vue'

/**
 * 更換配送地址彈窗（對齊 Figma 6015-8296）。
 * 顯示原訂單收件資訊（唯讀）+ 新收件資訊輸入；新增國別選擇，
 * 同時切換電話 country code 與地址格式。
 */

interface Original {
  recipient: string
  phoneCode: string
  phone: string
  address: string
}

interface Props {
  visible?: boolean
  original?: Original
}
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  original: () => ({
    recipient: '陳曉娟',
    phoneCode: '+886',
    phone: '912 345 678',
    address: '桃園市桃園區南平路303號',
  }),
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [payload: Record<string, unknown>]
}>()

// 國別選項：每個國家對應 country code 與地址 schema（單行 / 多欄）
type CountryKey = 'TW' | 'HK' | 'CN' | 'JP' | 'US'
interface CountryConfig {
  key: CountryKey
  label: string
  phoneCode: string
  /** 地址欄位定義；undefined → 單一 textarea；array → 多欄 input */
  addressFields?: Array<{ key: string; label: string; placeholder: string }>
}
const countries: CountryConfig[] = [
  {
    key: 'TW',
    label: '台灣',
    phoneCode: '+886',
    // 單一輸入：完整地址
  },
  {
    key: 'HK',
    label: '香港',
    phoneCode: '+852',
  },
  {
    key: 'CN',
    label: '中國',
    phoneCode: '+86',
    addressFields: [
      { key: 'province', label: '省', placeholder: '例：廣東省' },
      { key: 'city',     label: '市', placeholder: '例：深圳市' },
      { key: 'district', label: '區', placeholder: '例：南山區' },
      { key: 'street',   label: '街道', placeholder: '例：科技園XX路X號' },
    ],
  },
  {
    key: 'JP',
    label: '日本',
    phoneCode: '+81',
    addressFields: [
      { key: 'postal',     label: '郵遞區號', placeholder: '〒 000-0000' },
      { key: 'prefecture', label: '都道府縣', placeholder: '例：東京都' },
      { key: 'cityTown',   label: '市區町村', placeholder: '例：渋谷区神宮前 1-2-3' },
    ],
  },
  {
    key: 'US',
    label: '美國',
    phoneCode: '+1',
    addressFields: [
      { key: 'street1', label: 'Street Address', placeholder: '123 Main St' },
      { key: 'city',    label: 'City',           placeholder: 'San Francisco' },
      { key: 'state',   label: 'State',          placeholder: 'CA' },
      { key: 'zip',     label: 'ZIP',            placeholder: '94105' },
    ],
  },
]

const countryKey = ref<CountryKey>('TW')
const country = computed<CountryConfig>(() =>
  countries.find(c => c.key === countryKey.value) ?? countries[0],
)
const countryOptions = computed(() => countries.map(c => ({ label: c.label, value: c.key })))
const phoneCodeOptions = computed(() => countries.map(c => ({ label: c.phoneCode, value: c.phoneCode })))

const recipient = ref('')
const phoneCode = ref(country.value.phoneCode)
const phone = ref('')
const addressSingle = ref('')
const addressFields = ref<Record<string, string>>({})

// 國別變更時：phoneCode 跟著走；地址欄位重置（避免上次值殘留）
watch(country, (c) => {
  phoneCode.value = c.phoneCode
  addressSingle.value = ''
  addressFields.value = {}
})

watch(() => props.visible, (v) => {
  if (v) {
    // 開啟時清空輸入欄位
    recipient.value = ''
    phone.value = ''
    addressSingle.value = ''
    addressFields.value = {}
    countryKey.value = 'TW'
  }
})

function close(): void { emit('update:visible', false) }

function onConfirm(): void {
  emit('confirm', {
    country: countryKey.value,
    recipient: recipient.value,
    phoneCode: phoneCode.value,
    phone: phone.value,
    address: country.value.addressFields
      ? addressFields.value
      : addressSingle.value,
  })
  close()
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :draggable="false"
    :dismissable-mask="true"
    :style="{ width: '640px' }"
    :pt="{
      header: { style: 'padding: 16px 20px' },
      content: { style: 'padding: 0 20px 16px' },
      footer: { style: 'padding: 12px 20px' },
    }"
    @update:visible="(v) => emit('update:visible', v)"
  >
    <template #header>
      <span class="font-bold text-[#020617]" style="font-size: 16px">更換配送地址</span>
    </template>

    <div class="flex flex-col gap-4 pt-2">

      <!-- 原地址資訊（唯讀） -->
      <section class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <p class="text-xs text-[#64748b] mb-1">原收件人</p>
          <p class="text-[#334155]">{{ original.recipient }}</p>
        </div>
        <div>
          <p class="text-xs text-[#64748b] mb-1">原聯絡電話</p>
          <p class="text-[#334155]">({{ original.phoneCode }}) {{ original.phone }}</p>
        </div>
        <div class="col-span-2">
          <p class="text-xs text-[#64748b] mb-1">原配送地址</p>
          <p class="text-[#334155]">{{ original.address }}</p>
        </div>
      </section>

      <hr class="border-t border-[#e2e8f0]" />

      <!-- 國別 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[#334155]">配送國別</label>
        <Select
          v-model="countryKey"
          :options="countryOptions"
          option-label="label"
          option-value="value"
          class="w-[200px]"
        />
      </div>

      <!-- 新收件人 + 新聯絡電話 -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[#334155]">新收件人</label>
          <InputText v-model="recipient" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[#334155]">新聯絡電話</label>
          <div class="flex gap-2">
            <Select
              v-model="phoneCode"
              :options="phoneCodeOptions"
              option-label="label"
              option-value="value"
              class="w-[110px]"
            />
            <InputText
              v-model="phone"
              placeholder="例如：0912345678"
              class="flex-1"
            />
          </div>
        </div>
      </div>

      <!-- 新配送地址：單行或多欄，依國別切換 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[#334155]">新配送地址</label>
        <!-- 多欄式（中、日、美） -->
        <div
          v-if="country.addressFields"
          class="grid grid-cols-2 gap-3"
        >
          <div
            v-for="f in country.addressFields"
            :key="f.key"
            class="flex flex-col gap-1"
          >
            <span class="text-xs text-[#64748b]">{{ f.label }}</span>
            <InputText
              v-model="addressFields[f.key]"
              :placeholder="f.placeholder"
            />
          </div>
        </div>
        <!-- 單行式（台灣、香港） -->
        <InputText v-else v-model="addressSingle" placeholder="完整地址" />
      </div>

    </div>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <Button label="取消" severity="secondary" outlined @click="close" />
        <Button label="確認更新" @click="onConfirm" />
      </div>
    </template>
  </Dialog>
</template>
