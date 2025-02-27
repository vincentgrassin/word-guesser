<script setup lang="ts">
import { computed, defineProps, type ButtonHTMLAttributes } from 'vue'

const props = defineProps<
  {
    variant?: 'primary' | 'secondary'
  } & /** @vue-ignore */ ButtonHTMLAttributes
>()

const baseClasses =
  'px-4 py-2 rounded-md transition-all duration-200 border-2 font-bold active:translate-x-1 active:translate-y-1 border-black shadow-[6px_6px_0px_black] hover:shadow-none hover:translate-x-1 hover:translate-y-1'
const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-secondary'
    case 'primary':
    default:
      return 'bg-primary'
  }
})
</script>

<template>
  <button v-bind="$attrs" :class="[baseClasses, variantClasses]">
    <slot />
  </button>
</template>
