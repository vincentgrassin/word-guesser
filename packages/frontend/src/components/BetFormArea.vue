<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import type { GameStatus } from '@word-guesser/shared'
import { ref } from 'vue'
import DsButton from '@/components/ui/DsButton.vue'
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
    <label for="roundField" class="mb-2 block">Enter something:</label>
    <input
      id="roundField"
      v-model="bet"
      type="text"
      class="w-full rounded border p-2 text-black"
      placeholder="Type here..."
    />
    <DsButton type="submit"> Submit </DsButton>
  </form>
  <div v-else>
    <p>Game is closed</p>
  </div>
</template>
