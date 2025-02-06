<script lang="ts" setup>
import { type ResponseMessage } from '@word-guesser/shared'

defineProps<{
  isMe: boolean
  bet: ResponseMessage | undefined
  isRevealed: boolean
}>()
</script>

<template>
  <div v-if="isMe">
    <div v-if="!!bet">
      <p>My bet: {{ bet.content }}</p>
      <p>{{ bet.date }}</p>
    </div>
    <p v-else>Waiting for me</p>
  </div>
  <div v-else>
    <div v-if="!!bet">
      <div v-if="isRevealed">
        <p>My partner bet: {{ bet.content }}</p>
        <p>{{ bet.date }}</p>
      </div>
      <p v-else>My partner is ready</p>
    </div>
    <p v-else>Waiting for my partner</p>
  </div>
</template>
