<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'

import { type Round } from '@word-guesser/shared'
import { computed } from 'vue'
import BetItem from './BetItem.vue'
import { sortRoundMessages } from '@/utils/helpers'
const { state } = useGamesStore()

const { round } = defineProps<{
  round: Round
}>()

const myBet = computed(() => sortRoundMessages(state.user.userId, round)?.me)
const teamBets = computed(() => sortRoundMessages(state.user.userId, round)?.others)
</script>

<template>
  <div class="flex justify-evenly gap-2 py-4">
    <div class="w-1/2">
      <BetItem
        v-if="!!myBet"
        :bet="myBet.content"
        :date="myBet.date"
        :isRevealed="true"
        :score="myBet.score"
        position="left"
      />
    </div>
    <div class="flex w-1/2 flex-col gap-4">
      <BetItem
        v-for="(partnerBet, index) in teamBets"
        :key="index"
        :bet="partnerBet.content"
        :date="partnerBet.date"
        :isRevealed="round.isComplete"
        :score="partnerBet.score"
        position="right"
      />
    </div>
  </div>
</template>
