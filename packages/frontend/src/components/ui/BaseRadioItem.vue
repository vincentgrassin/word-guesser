<script setup lang="ts">
import { defineProps, type InputHTMLAttributes } from 'vue'

defineProps<
  {
    label: string
    value: string
  } & /** @vue-ignore */ InputHTMLAttributes
>()

const radioModel = defineModel<string | number>()
</script>

<template>
  <label class="flex cursor-pointer items-center gap-2 font-bold">
    <input
      v-bind="$attrs"
      v-model="radioModel"
      type="radio"
      :value="value"
      class="h-5 w-5 cursor-pointer appearance-none rounded-full border-[1px] border-black bg-white checked:border-[3px] focus:outline-none"
    />
    <span>{{ label }}</span>
  </label>
</template>
