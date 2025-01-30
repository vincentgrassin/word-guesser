<script setup lang="ts">
import { useGamesStore } from '@/composable/useGamesStore'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

const { joinGame, state } = useGamesStore()
const route = useRoute()
onMounted(() => {
  joinGame(route.params.id as string, state.userId)
})
</script>

<template>
  <main>
    <h1>Game {{ $route.params.id }}</h1>
  </main>
</template>
