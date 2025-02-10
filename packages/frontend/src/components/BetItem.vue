<script lang="ts" setup>
import { formatTime } from '@/utils/helpers'

const { date } = defineProps<{
  bet: string | undefined
  date?: number
  isRevealed: boolean
}>()
</script>

<template>
  <div
    class="flex items-center justify-between gap-4 rounded-3xl bg-gradient-to-b from-red-900 to-red-800 px-6 py-2 shadow-lg transition-all duration-1000 ease-in-out"
  >
    <p
      :class="{
        'blur-sm': !isRevealed,
        'transition-all duration-1000 ease-in-out': true,
      }"
      class="text-xl"
    >
      {{ bet }}
    </p>
    <p
      v-if="!!date"
      :class="{
        'blur-sm': !isRevealed,
        'transition-all duration-1000 ease-in-out': true,
      }"
    >
      {{ formatTime(date) }}
    </p>
  </div>
</template>
