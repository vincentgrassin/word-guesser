<script lang="ts" setup>
import type { Game } from '@word-guesser/shared'
import { RouterLink } from 'vue-router'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import { computeGameStatusIcon, formatDuration } from '@/utils/helpers'
import BaseText from './ui/BaseText.vue'

const { game } = defineProps<{
  game: Game
}>()
</script>

<template>
  <RouterLink :to="`/game/${game.gameId}`">
    <div
      className="flex flex-col h-full bg-primary text-black px-4 py-2 rounded-md transition-all duration-200 border-2 font-bold active:translate-x-1 active:translate-y-1 border-black shadow-[3px_3px_0px_black] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
    >
      <div class="mb-4 flex items-center justify-between gap-2">
        <BaseText as="p" :content="game.settings.name" size="sm" />
        <BaseIcon :name="computeGameStatusIcon(game.settings.status)" height="32px" width="32px" />
      </div>
      <ul class="mt-4 flex items-start justify-between gap-4">
        <li class="flex flex-col">
          <span class="flex flex-row items-center gap-1">
            <BaseIcon name="player" height="16px" width="16px" />
            <p class="text-sm font-bold text-text">
              {{ game.players.length }}/{{ game.settings.maxPlayers }}
            </p>
          </span>
          <ul v-if="game.players.length > 0">
            <li
              v-for="(player, index) in game.players"
              :key="index"
              class="text-xs font-bold text-text"
            >
              {{ player.userName }}
            </li>
          </ul>
        </li>
        <li class="flex flex-row items-center gap-1">
          <BaseIcon name="timer" height="16px" width="16px" />
          <p class="text-sm font-bold text-text">{{ formatDuration(game.settings.duration) }}</p>
        </li>
        <li class="flex flex-row items-center gap-1">
          <BaseIcon name="acid" height="16px" width="16px" />
          <p class="text-sm font-bold text-text">{{ game.settings.type }}</p>
        </li>
      </ul>
    </div>
  </RouterLink>
</template>
