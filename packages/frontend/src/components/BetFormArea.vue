<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import type { GameStatus } from '@word-guesser/shared'
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInputText from '@/components/ui/BaseInputText.vue'
const { gameId, gameStatus } = defineProps<{ gameId: string; gameStatus: GameStatus }>()

const { playRound } = useGamesStore()

const bet = ref('')
const handleSubmit = () => {
  playRound(gameId, bet.value)
  bet.value = ''
}
</script>

<template>
  <form v-if="!(gameStatus === 'closed')" @submit.prevent="handleSubmit" class="rounded border p-4">
    <BaseInputText variant="text" label="My bet" v-model="bet" placeholder="Type here" />
    <BaseButton type="submit">Submit </BaseButton>
  </form>
  <div v-else>
    <p>Game is closed</p>
  </div>
</template>
