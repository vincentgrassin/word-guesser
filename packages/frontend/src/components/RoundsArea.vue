<script lang="ts" setup>
import type { Round } from '@word-guesser/shared'
import RoundItem from '@/components/RoundItem.vue'

const { rounds } = defineProps<{
  rounds: Round[]
}>()
</script>

<template>
  <div class="p-4 border rounded">
    <h2>Rounds</h2>
    <ul v-if="rounds?.length">
      <li v-for="(round, index) in rounds" :key="index">
        <RoundItem :round="round" />
      </li>
    </ul>
    <p v-else>Waiting first round</p>
  </div>
</template>
