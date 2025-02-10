<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import { reactive } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseInputText from './ui/BaseInputText.vue'
import BaseRadioGroup from './ui/BaseRadioGroup.vue'
import BaseRadioItem from './ui/BaseRadioItem.vue'
const { createGame } = useGamesStore()

const form = reactive({
  type: 'basic',
  playersNumber: 2,
  timer: 2,
})

const submitForm = () => {
  createGame()
}
</script>

<template>
  <form @submit.prevent="submitForm" class="flex flex-col">
    <BaseInputText variant="number" label="Players" v-model="form.playersNumber" />
    <BaseInputText variant="number" label="Timer" v-model="form.timer" />
    <BaseRadioGroup label="Game type">
      <BaseRadioItem label="Basic" value="basic" v-model="form.type" />
      <BaseRadioItem label="Solo" value="solo" v-model="form.type" />
    </BaseRadioGroup>
    <BaseButton type="submit">Submit</BaseButton>
  </form>
</template>
