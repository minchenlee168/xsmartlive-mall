<script setup lang="ts">
import { ref, watch } from 'vue';

/**
 * 更換配送地址彈窗（對齊 Figma 6015-8296）。
 * 上半顯示原訂單收件資訊（唯讀），下半單行填新收件人 / 新電話 / 新地址。
 */

interface Original {
  recipient: string;
  phoneCode: string;
  phone: string;
  address: string;
}

interface Props {
  visible?: boolean;
  original?: Original;
}
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  original: () => ({
    recipient: '陳曉娟',
    phoneCode: '+886',
    phone: '912 345 678',
    address: '桃園市桃園區南平路303號',
  }),
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  confirm: [payload: Record<string, unknown>];
}>();

const PHONE_CODES = ['+886', '+852', '+86', '+81'];

const recipient = ref('');
const phoneCode = ref('+886');
const phone = ref('');
const address = ref('');

// 開啟時清空輸入欄位
watch(
  () => props.visible,
  (v) => {
    if (v) {
      recipient.value = '';
      phone.value = '';
      address.value = '';
      phoneCode.value = '+886';
    }
  },
);

const handleClose = (): void => {
  emit('update:visible', false);
};

const handleConfirm = (): void => {
  emit('confirm', {
    recipient: recipient.value,
    phoneCode: phoneCode.value,
    phone: phone.value,
    address: address.value,
  });
  handleClose();
};
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :draggable="false"
    :dismissable-mask="true"
    header="更換配送地址"
    :breakpoints="{ '768px': '90vw' }"
    :style="{ width: '640px' }"
    @update:visible="(v) => emit('update:visible', v)"
  >
    <div class="flex flex-col gap-4">
      <!-- 原地址資訊（唯讀） -->
      <section class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <p class="mb-1 text-xs text-slate-500">原收件人</p>
          <p class="text-slate-700">{{ original.recipient }}</p>
        </div>
        <div>
          <p class="mb-1 text-xs text-slate-500">原聯絡電話</p>
          <p class="text-slate-700">
            ({{ original.phoneCode }}) {{ original.phone }}
          </p>
        </div>
        <div class="col-span-2">
          <p class="mb-1 text-xs text-slate-500">原配送地址</p>
          <p class="text-slate-700">{{ original.address }}</p>
        </div>
      </section>

      <!-- 新收件人 + 新聯絡電話 -->
      <div class="grid grid-cols-1 gap-4 @md:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">新收件人</label>
          <InputText v-model="recipient" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-slate-700">新聯絡電話</label>
          <div class="flex gap-2">
            <Select
              v-model="phoneCode"
              :options="PHONE_CODES"
              class="w-[110px]"
            />
            <InputText
              v-model="phone"
              placeholder="例如：0912345678"
              class="min-w-0 flex-1"
            />
          </div>
        </div>
      </div>

      <!-- 新配送地址 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-slate-700">新配送地址</label>
        <InputText v-model="address" class="w-full" />
      </div>
    </div>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <Button
          label="取消"
          severity="secondary"
          outlined
          @click="handleClose"
        />
        <Button label="確認更新" @click="handleConfirm" />
      </div>
    </template>
  </Dialog>
</template>
