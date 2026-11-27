<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import { sortPlayers, type Game } from '@word-guesser/shared'
import { computed } from 'vue'
import BaseText from '@/components/ui/BaseText.vue'

const { game } = defineProps<{
  game: Game
}>()

const { state } = useGamesStore()
const me = computed(() => sortPlayers(state.user.userId, game.players)?.me)
const otherPlayers = computed(() => sortPlayers(state.user.userId, game.players)?.others)
</script>

<template>
  <div class="flex justify-evenly gap-2 py-4">
    <div class="flex w-1/2 items-center justify-center">
      <BaseText as="p" :content="`${me?.userName} (me)`" />
    </div>
    <div class="flex w-1/2 flex-col items-center justify-center gap-2">
      <div v-for="(player, index) in otherPlayers" :key="index" class="flex items-center gap-2">
        <BaseText as="p" :content="`${player?.userName}`" />
        <span
          v-if="player.isBot"
          class="border-2 border-black bg-secondary px-1 font-mono text-xs font-bold uppercase"
          >bot</span
        >
      </div>
    </div>
  </div>
</template>
