<script lang="ts" setup>
import { formatTime, type MessageScore } from '@/utils/helpers'
import { scoreLevel } from '@word-guesser/shared'
import { computed } from 'vue'

const { date, score, position } = defineProps<{
  bet: string | undefined
  date?: number
  isRevealed: boolean
  score?: MessageScore
  position: 'left' | 'right'
}>()

const levelClass = computed(() => {
  // No score (unknown word, or nothing to show): the neutral look
  if (typeof score !== 'number') return 'border-primary shadow-primary'
  switch (scoreLevel(score)) {
    case 'medium':
      return 'border-yellow shadow-yellow'
    case 'high':
      return 'border-orange shadow-orange'
    case 'extreme':
      return 'border-red shadow-red'
    case 'low':
    default:
      return 'border-primary shadow-primary'
  }
})

const positionClass = computed(() => {
  switch (position) {
    case 'right':
      return 'right-6'
    case 'left':
    default:
      return 'left-6'
  }
})
</script>

<template>
  <div
    :class="[
      levelClass,
      'relative flex items-center justify-between gap-4 border-[4px] bg-white px-6 py-3 shadow-[4px_4px_0]',
    ]"
  >
    <div
      :class="[
        levelClass,
        positionClass,
        'absolute bottom-[-10px] h-4 w-4 -rotate-45 border-b-[4px] border-l-[4px] bg-white shadow-[0px_4px_0]',
      ]"
    ></div>
    <p
      :class="{
        'blur-sm': !isRevealed,
        'transition-all duration-700 ease-in-out': true,
      }"
      class="text-xl font-bold"
    >
      {{ isRevealed ? bet : 'placeholder' }}
    </p>
    <span
      v-if="isRevealed && score === null"
      title="Unknown word: no proximity score"
      aria-label="Unknown word: no proximity score"
      class="font-mono text-xl font-bold"
      >?</span
    >
    <p
      v-if="!!date"
      :class="{
        'blur-sm': !isRevealed,
        'transition-all duration-700 ease-in-out': true,
      }"
      class="font-mono text-sm"
    >
      {{ formatTime(date) }}
    </p>
  </div>
</template>
