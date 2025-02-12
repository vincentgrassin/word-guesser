<script setup lang="ts">
import { computed, defineProps } from 'vue'
import { RouterLink, type RouterLinkProps } from 'vue-router'

const props = defineProps<
  {
    variant?: 'primary' | 'secondary' | 'danger'
  } & RouterLinkProps
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
  <RouterLink :to="props.to" v-bind="$attrs" :class="[baseClasses, variantClasses]">
    <slot />
  </RouterLink>
</template>
