<script lang="ts" setup>
import { useGameTimer } from '@/hooks/useGameTimer'
import { useGamesStore } from '@/stores/useGamesStore'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import ActionsArea from '@/components/ActionsArea.vue'
import { computed, watch } from 'vue'
import BaseLink from '@/components/ui/BaseLink.vue'
import BaseText from '@/components/ui/BaseText.vue'
import { formatDuration, computeGameStatusIcon } from '@/utils/helpers'
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
      'flex flex-col gap-8 border-b-4 border-b-borderPrimary bg-white bg-yellow p-4 md:border-r-4 md:border-r-borderPrimary',
      classProp,
    ]"
    v-if="!!game"
  >
    <BaseModal
      :isOpen="game.settings.status === 'loss' || game.settings.status === 'win'"
      title="That's it"
    >
      <div class="flex flex-col items-center py-4">
        <BaseIcon :name="computeGameStatusIcon(game.settings.status)" height="64px" width="64px" />
        <p class="text-2xl font-bold text-text">
          You {{ game.settings.status === 'win' ? 'win' : 'lose' }}
        </p>
        <div class="my-4" @:click="() => deleteGame(gameId)">
          <BaseLink to="/">Go home</BaseLink>
        </div>
      </div>
    </BaseModal>
    <div class="flex flex-row gap-2 md:flex-col">
      <BaseText as="h2" :content="game.settings.name" size="2xl" />
      <ActionsArea :gameId="gameId" />
    </div>
    <div class="grid w-full grid-cols-2 justify-between gap-1 md:grid-cols-1 md:py-4">
      <GameSettingItem
        :value="`${game.players.length} / ${game.settings.maxPlayers}`"
        icon="player"
        :variant="game.players.length === game.settings.maxPlayers ? 'primary' : 'secondary'"
      />
      <GameSettingItem :value="game.rounds.length" icon="bullet" />
      <GameSettingItem
        :value="formatDuration(gameTimer)"
        icon="timer"
        :variant="gameTimer < 30 * 1000 ? 'secondary' : 'primary'"
      />
      <GameSettingItem :value="game.settings.type" icon="acid" />
    </div>
  </div>
</template>
