<script setup lang="ts">
import GameItem from '@/components/GameItem.vue'
import SettingsArea from '@/components/SettingsArea.vue'
import { useUserConnect } from '@/hooks/useUserConnect'
import { useGamesStore } from '@/stores/useGamesStore'
const { state } = useGamesStore()
useUserConnect()
</script>

<template>
  <main>
    <h1>Word Guesser</h1>
    <p>User: {{ state.user.userId }}</p>
    <SettingsArea />
    <ul class="lg:grid-cols- grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
      <li v-for="(game, index) in state.games" :key="index">
        <GameItem :game="game" />
      </li>
    </ul>
  </main>
</template>
