<script setup lang="ts">
import ActionsArea from '@/components/ActionsArea.vue'
import BetFormArea from '@/components/BetFormArea.vue'
import GameSettingsArea from '@/components/GameSettingsArea.vue'
import PlayersArea from '@/components/PlayersArea.vue'
import RoundsArea from '@/components/RoundsArea.vue'
import { useUserConnect } from '@/hooks/useUserConnect'
import router from '@/router'
import { useGamesStore } from '@/stores/useGamesStore'
import { findGame } from '@word-guesser/shared'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
const { id } = defineProps<{ id: string }>()

const { joinGame, state } = useGamesStore()
const route = useRoute()
useUserConnect(() => joinGame(route.params.id as string))

const game = computed(() => findGame(id, state.games))
watch(
  () => game.value?.gameId,
  (newGameId) => {
    if (!newGameId) {
      router.push('/404')
    }
  },
)
</script>

<template>
  <main>
    <div v-if="!!game">
      <ActionsArea :gameId="id" />
      <h1>Game {{ id }}</h1>
      <p>User: {{ state.userId }}</p>
      <div class="flex flex-col md:flex-row">
        <GameSettingsArea :gameId="game.gameId" />
        <div>
          <PlayersArea :game="game" />
          <RoundsArea :rounds="[...game.rounds].reverse()" />
          <BetFormArea :gameId="id" :gameStatus="game.settings.status" />
        </div>
      </div>
    </div>
    <div v-else>
      Oops this game does not exist
      <RouterLink :to="`/`"> Home </RouterLink>
    </div>
  </main>
</template>
