<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import type { GameProperties } from '@word-guesser/shared'
import { computed, reactive } from 'vue'
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
  name: '',
  botLevel: 'normal',
})

// Solo: the player and the bot, so the server fixes the number of players
const isSolo = computed(() => gameSettings.type === 'solo')

const submitForm = () => {
  const { botLevel, ...properties } = gameSettings
  createGame({
    ...properties,
    duration: gameSettings.duration * 1000 * 60,
    ...(isSolo.value && { botLevel }),
  })
  onSubmitProp()
}
</script>

<template>
  <form @submit.prevent="submitForm" class="flex flex-col gap-4 md:gap-8">
    <BaseInputText variant="text" label="Name" v-model="gameSettings.name" />
    <BaseInputText
      v-if="!isSolo"
      variant="number"
      label="Number of players"
      v-model="gameSettings.maxPlayers"
    />
    <BaseInputText variant="number" label="Duration" v-model="gameSettings.duration" />
    <BaseRadioGroup label="Type">
      <BaseRadioItem label="Basic" value="basic" v-model="gameSettings.type" />
      <BaseRadioItem label="Solo (with a bot)" value="solo" v-model="gameSettings.type" />
    </BaseRadioGroup>
    <BaseRadioGroup v-if="isSolo" label="Bot level">
      <BaseRadioItem label="Easy" value="easy" v-model="gameSettings.botLevel" />
      <BaseRadioItem label="Normal" value="normal" v-model="gameSettings.botLevel" />
      <BaseRadioItem label="Hard" value="hard" v-model="gameSettings.botLevel" />
    </BaseRadioGroup>
    <BaseButton type="submit">Submit</BaseButton>
  </form>
</template>
