<script setup lang="ts">
import { useGamesStore } from '@/stores/useGamesStore'
import { getGame } from '@word-guesser/shared'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
const { id } = defineProps<{ id: string }>()

const { joinGame, state, connect, setUserId, playRound } = useGamesStore()
const route = useRoute()
const game = computed(() => getGame(state.games, id))
onMounted(() => {
  const savedUserId = localStorage.getItem('userId')
  if (!state.userId && savedUserId) {
    connect(savedUserId)
    setUserId(savedUserId)
  }

  joinGame(route.params.id as string, state.userId)
})

const guess = ref('')
const handleSubmit = () => {
  playRound(id, state.userId, guess.value)
}
</script>

<template>
  <main>
    <div class="p-4 border rounded">
      <h1>Game {{ id }}</h1>
      <p>User: {{ state.userId }}</p>
    </div>
    <div class="p-4 border rounded">
      <h2>Settings</h2>
      {{ game?.settings }}
    </div>
    <div class="p-4 border rounded">
      <h2>Players</h2>
      <ul>
        <li v-for="(player, index) in game?.players" :key="index">
          {{ player }}
        </li>
      </ul>
    </div>
    <div class="p-4 border rounded">
      <h2>Rounds</h2>
      <ul>
        <li v-for="(round, index) in game?.rounds" :key="index">
          {{ round }}
        </li>
      </ul>
    </div>
    <form @submit.prevent="handleSubmit" class="p-4 border rounded">
      <label for="roundField" class="block mb-2">Enter something:</label>
      <input
        id="roundField"
        v-model="guess"
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
  </main>
</template>
