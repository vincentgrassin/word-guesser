<script setup lang="ts">
import { computed, defineProps, type InputHTMLAttributes } from 'vue'

const { variant } = defineProps<
  {
    label: string
    modelValue: string | number
    variant: 'text' | 'number'
  } & /** @vue-ignore */ InputHTMLAttributes
>()

const inputModel = defineModel<string | number>()

const variantClasses = computed(() => {
  switch (variant) {
    default:
      return 'bg-background'
  }
})

const baseClasses = 'px-4 py-2'
</script>

<template>
  <label>
    {{ label }}
    <input
      :type="variant"
      v-model="inputModel"
      v-bind="$attrs"
      :class="[baseClasses, variantClasses]"
    />
  </label>
</template>
