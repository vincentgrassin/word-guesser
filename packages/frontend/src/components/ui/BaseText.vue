<script setup lang="ts">
import { computed, defineProps } from 'vue'

const {as, size, class:classProp} = defineProps<{
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
  content: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  class?:string
}>()

const tag = computed(() => as || 'p')
const sizeClasses = computed(() => {
  return {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  }[size || 'md']
})
</script>

<template>
  <component
    :is="tag"
    :class="[
      'w-fit border-[3px] border-black bg-white px-2 py-1 font-bold text-black shadow-[4px_4px_0_black]',
      sizeClasses,
      classProp
    ]"
  >
    {{ content }}
  </component>
</template>
