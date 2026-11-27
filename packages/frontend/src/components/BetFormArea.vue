<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import { isSingleWord, type GameStatus } from '@word-guesser/shared'
import { computed, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInputText from '@/components/ui/BaseInputText.vue'
const { gameId, gameStatus } = defineProps<{ gameId: string; gameStatus: GameStatus }>()

const { playRound } = useGamesStore()

const bet = ref('')
// The server refuses it too: checking here tells the player before sending.
const isRefused = computed(() => !isSingleWord(bet.value))

const handleSubmit = () => {
  if (isRefused.value) return
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
    <div class="flex w-full flex-col gap-1">
      <BaseInputText
        variant="text"
        label="My bet"
        v-model="bet"
        placeholder="Type here"
        class="w-full"
        :aria-invalid="isRefused"
      />
      <p v-if="isRefused" role="alert" class="font-bold text-red">
        One word only (hyphens and apostrophes are fine)
      </p>
    </div>
    <BaseButton type="submit" class="w-fit" :disabled="isRefused">Submit </BaseButton>
  </form>
</template>
