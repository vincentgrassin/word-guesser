<script lang="ts" setup>
import { useGameTimer } from '@/hooks/useGameTimer'
import { useGamesStore } from '@/stores/useGamesStore'
import BaseModal from '@/components/ui/BaseModal.vue'
import ActionsArea from '@/components/ActionsArea.vue'
import { computed, watch } from 'vue'
import BaseLink from '@/components/ui/BaseLink.vue'
import { formatDuration } from '@/utils/helpers'
import GameSettingItem from '@/components/GameSettingItem.vue'

const { gameId, class: classProp } = defineProps<{ gameId: string; class?: string }>()
const { state, endGame, deleteGame } = useGamesStore()
const game = computed(() => state.games.find((g) => g.gameId === gameId))
const { gameTimer } = useGameTimer(game)

watch(gameTimer, (newTimer) => {
  if (newTimer === 0) {
    endGame(gameId, 'loss')
  }
})
</script>

<template>
  <div
    :class="[
      'border-b-borderPrimary md:border-r-borderPrimary bg-yellow border-b-4 bg-white p-4 md:border-r-4',
      classProp,
    ]"
    v-if="!!game"
  >
    <BaseModal :isOpen="game.settings.status === 'loss' || game.settings.status === 'win'">
      <p>Your game status is {{ game.settings.status }}</p>
      <BaseLink to="/"> <span @:click="() => deleteGame(gameId)"> Go home </span> </BaseLink>
    </BaseModal>
    <ActionsArea :gameId="gameId" />
    <div class="flex flex-row gap-1 px-2 md:flex-col md:py-4">
      <GameSettingItem
        :value="`${game.players.length} / ${game.settings.maxPlayers}`"
        icon="player"
      />
      <GameSettingItem :value="game.rounds.length" icon="bullet" />
      <GameSettingItem :value="formatDuration(gameTimer)" icon="timer" />
      <GameSettingItem :value="game.settings.type" icon="acid" />
    </div>
  </div>
</template>
