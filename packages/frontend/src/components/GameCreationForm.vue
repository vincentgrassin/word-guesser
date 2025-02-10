<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import type { GameProperties } from '@word-guesser/shared'
import { reactive } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseInputText from './ui/BaseInputText.vue'
import BaseRadioGroup from './ui/BaseRadioGroup.vue'
import BaseRadioItem from './ui/BaseRadioItem.vue'
const { createGame } = useGamesStore()

const { onSubmit: onSubmitProp } = defineProps<{
  onSubmit: () => void
}>()

const gameSettings = reactive<GameProperties>({
  type: 'basic',
  maxPlayers: 2,
  duration: 2,
})

const submitForm = () => {
  console.log(gameSettings.duration)
  createGame({ ...gameSettings, duration: gameSettings.duration * 1000 * 60 })
  onSubmitProp()
}
</script>

<template>
  <form @submit.prevent="submitForm" class="flex flex-col">
    <BaseInputText variant="number" label="Players" v-model="gameSettings.maxPlayers" />
    <BaseInputText variant="number" label="Timer" v-model="gameSettings.duration" />
    <BaseRadioGroup label="Game type">
      <BaseRadioItem label="Basic" value="basic" v-model="gameSettings.type" />
      <BaseRadioItem label="Solo" value="solo" v-model="gameSettings.type" />
    </BaseRadioGroup>
    <BaseButton type="submit">Submit</BaseButton>
  </form>
</template>
