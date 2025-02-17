<script lang="ts" setup>
import { reactive } from 'vue'
import type { PlayerSettings } from '@word-guesser/shared'

import BaseButton from './ui/BaseButton.vue'
import BaseInputText from './ui/BaseInputText.vue'
import { useGamesStore } from '@/stores/useGamesStore'
const { updatePlayerSettings } = useGamesStore()

const { onSubmit: onSubmitProp } = defineProps<{
  onSubmit: () => void
}>()

const form = reactive<PlayerSettings>({
  userName: '',
})

const submitForm = () => {
  localStorage.setItem('userName', form.userName)
  updatePlayerSettings(form)
  onSubmitProp()
}
</script>

<template>
  <form @submit.prevent="submitForm" class="flex flex-col">
    <BaseInputText label="User name" variant="text" v-model="form.userName" />
    <BaseButton type="submit">Submit</BaseButton>
  </form>
</template>
