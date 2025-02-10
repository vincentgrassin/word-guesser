<script lang="ts" setup>
import { reactive } from 'vue'
import BaseButton from './ui/BaseButton.vue'
import BaseInputText from './ui/BaseInputText.vue'

const { onSubmit: onSubmitProp } = defineProps<{
  onSubmit: () => void
}>()

const form = reactive({
  username: '',
})

const submitForm = () => {
  console.log(form)
  onSubmitProp()
}
</script>

<template>
  <form @submit.prevent="submitForm" class="flex flex-col">
    <BaseInputText label="User name" variant="text" v-model="form.username" />
    <BaseButton type="submit">Submit</BaseButton>
  </form>
</template>
