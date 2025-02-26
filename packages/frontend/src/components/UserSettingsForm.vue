<script lang="ts" setup>
import { reactive } from 'vue'

import { useGamesStore } from '@/stores/useGamesStore'
import BaseButton from './ui/BaseButton.vue'
import BaseInputText from './ui/BaseInputText.vue'
const { updatePlayerSettings, setUserName } = useGamesStore()

const { onSubmit: onSubmitProp } = defineProps<{
  onSubmit: () => void
}>()

const form = reactive({
  userName: localStorage.getItem('userName') || '',
})

const submitForm = () => {
  setUserName(form.userName)
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
