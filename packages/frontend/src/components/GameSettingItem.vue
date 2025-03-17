<script setup lang="ts">
import { computed, defineProps } from 'vue'
import BaseIcon, { type IconName } from '@/components/ui/BaseIcon.vue'

const { variant = 'primary' } = defineProps<{
  icon: IconName
  value: string | number
  variant?: 'primary' | 'secondary'
  label: string
}>()

const textClass = computed(() => {
  switch (variant) {
    case 'secondary':
      return 'text-red animate-bounce'
    case 'primary':
    default:
      return 'text-black'
  }
})
</script>

<template>
  <div
    class="flex flex-row items-center justify-between gap-1 rounded-lg border-2 border-borderPrimary bg-white p-4 text-black"
  >
    <div class="flex flex-col items-center justify-center gap-1">
      <BaseIcon width="24px" height="24px" color="#2c3e50" :name="icon" />
      <p class="text-xs uppercase">{{ label }}</p>
    </div>
    <span :class="['text-4xl font-bold', textClass]">{{ value }}</span>
  </div>
</template>
