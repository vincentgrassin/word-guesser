<script setup lang="ts">
import { computed } from 'vue'

// Other attributes (placeholder, class...) fall through to the input via $attrs.
const { variant } = defineProps<{
  label: string
  variant: 'text' | 'number'
}>()

const inputModel = defineModel<string | number>()

const variantClasses = computed(() => {
  switch (variant) {
    default:
      return 'bg-white text-black'
  }
})

const baseClasses =
  'px-3 py-2 border-[2px] border-black focus:outline-none focus:border-[3px] font-bold'
</script>

<template>
  <label class="flex flex-col gap-1 font-bold">
    {{ label }}
    <input
      :type="variant"
      v-model="inputModel"
      v-bind="$attrs"
      :class="[baseClasses, variantClasses]"
      class="w-fit"
    />
  </label>
</template>
