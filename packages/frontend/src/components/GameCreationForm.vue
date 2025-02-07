<script lang="ts" setup>
import { useGamesStore } from '@/stores/useGamesStore'
import { reactive } from 'vue'
import DsButton from './ui/DsButton.vue'
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
    <label>
      Players
      <input type="number" v-model="form.playersNumber" />
    </label>
    <label>
      Timer
      <input type="number" v-model="form.timer" />
    </label>
    <fieldset>
      <legend>Game type:</legend>
      <label>
        <input v-model="form.type" type="radio" value="basic" />
        Basic
      </label>
      <label>
        <input v-model="form.type" type="radio" value="ia" />
        Solo
      </label>
    </fieldset>
    <DsButton type="submit">Submit</DsButton>
  </form>
</template>
