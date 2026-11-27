<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useGamesStore } from '@/stores/useGamesStore'

const { state } = useGamesStore()
</script>

<template>
  <p
    v-if="state.connectionLost"
    role="status"
    class="border-b-4 border-black bg-secondary p-2 text-center font-bold"
  >
    Connection lost, reconnecting…
  </p>
  <div
    v-if="state.serverError"
    role="alert"
    class="flex items-center justify-center gap-4 border-b-4 border-black bg-red p-2 font-bold"
  >
    <p>{{ state.serverError }}</p>
    <button type="button" class="underline" @click="state.serverError = null">Dismiss</button>
  </div>
  <RouterView />
</template>
