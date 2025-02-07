<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'

import { sortRoundMessages, type Round } from '@word-guesser/shared'
import { computed } from 'vue'
import BetItem from './BetItem.vue'
const { state } = useGamesStore()

const { round } = defineProps<{
  round: Round
}>()

const myBet = computed(() => sortRoundMessages(state.userId, round)?.me)

const partnerBet = computed(() => sortRoundMessages(state.userId, round)?.others[0])
</script>

<template>
  <div class="flex justify-evenly gap-2 py-4">
    <div class="w-1/2">
      <BetItem v-if="!!myBet" :bet="myBet.content" :date="myBet.date" :isRevealed="true" />
    </div>
    <div class="w-1/2">
      <BetItem
        v-if="!!partnerBet"
        :bet="partnerBet.content"
        :date="partnerBet.date"
        :isRevealed="round.isComplete"
      />
    </div>
  </div>
</template>
