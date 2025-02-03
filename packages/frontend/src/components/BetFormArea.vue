<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import type { GameStatus } from '@word-guesser/shared'
import { ref } from 'vue'
const { gameId, gameStatus } = defineProps<{ gameId: string; gameStatus: GameStatus }>()

const { playRound, state } = useGamesStore()

const bet = ref('')
const handleSubmit = () => {
  playRound(gameId, state.userId, bet.value)
}
</script>

<template>
  <form v-if="!(gameStatus === 'closed')" @submit.prevent="handleSubmit" class="p-4 border rounded">
    <label for="roundField" class="block mb-2">Enter something:</label>
    <input
      id="roundField"
      v-model="bet"
      type="text"
      class="border p-2 w-full rounded text-black"
      placeholder="Type here..."
    />
    <button
      type="submit"
      class="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
    >
      Submit
    </button>
  </form>
  <div v-else>
    <p>Game is closed</p>
  </div>
</template>
