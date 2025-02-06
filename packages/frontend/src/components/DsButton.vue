<script setup lang="ts">
import { computed, defineProps, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'vue'

const props = defineProps<
  {
    as?: 'button' | 'a'
    variant?: 'primary' | 'secondary' | 'danger'
  } & /** @vue-ignore */ (AnchorHTMLAttributes | ButtonHTMLAttributes)
>()

const baseClasses = 'px-4 py-2 font-semibold rounded-lg transition-colors duration-200'
const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-gray-500 text-white hover:bg-gray-600'
    case 'primary':
    default:
      return 'bg-blue-500 text-white hover:bg-blue-600'
  }
})
</script>

<template>
  <component :is="as || 'button'" v-bind="$attrs" :class="[baseClasses, variantClasses]">
    <slot />
  </component>
</template>
