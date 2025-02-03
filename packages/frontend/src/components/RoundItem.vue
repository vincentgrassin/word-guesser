<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import { sortRoundMessages, type Round } from '@word-guesser/shared'
import BetItem from './BetItem.vue'
const { state } = useGamesStore()

const { round } = defineProps<{
  round: Round
}>()
</script>

<template>
  <div class="p-2">
    <p>{{ round.roundId }}</p>
    <BetItem :bet="sortRoundMessages(state.userId, round)?.me" :isMe="true" :isRevealed="true" />
    <BetItem
      :bet="sortRoundMessages(state.userId, round)?.others[0]"
      :isMe="false"
      :isRevealed="round.isComplete"
    />
  </div>
</template>
