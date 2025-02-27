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
  <form
    v-if="!(gameStatus === 'win' || gameStatus === 'loss')"
    @submit.prevent="handleSubmit"
    class="flex w-full flex-col items-end gap-4 border-t-4 p-4 sm:flex-row md:px-[10%] xl:px-[20%]"
  >
    <BaseInputText
      variant="text"
      label="My bet"
      v-model="bet"
      placeholder="Type here"
      class="w-full"
    />
    <BaseButton type="submit" class="w-fit">Submit </BaseButton>
  </form>
</template>
