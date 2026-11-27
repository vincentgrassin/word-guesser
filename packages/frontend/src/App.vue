<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useGamesStore } from '@/stores/useGamesStore'

const { state } = useGamesStore()
</script>

<template>
  <p
    v-if="state.connectionLost"
    role="status"
    class="bg-secondary border-b-4 border-black p-2 text-center font-bold"
  >
    Connection lost, reconnecting…
  </p>
  <RouterView />
</template>
