<script setup lang="ts">
import GameItem from '@/components/GameItem.vue'
import SettingsArea from '@/components/SettingsArea.vue'
import WelcomeArea from '@/components/WelcomeArea.vue'
import { useUserConnect } from '@/hooks/useUserConnect'
import { useGamesStore } from '@/stores/useGamesStore'
const { state } = useGamesStore()
useUserConnect()
</script>

<template>
  <main class="p-4 md:p-8">
    <div class="flex flex-col justify-between md:flex-row">
      <WelcomeArea />
      <SettingsArea />
    </div>
    <ul class="lg:grid-cols- mt-4 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
      <li v-for="(game, index) in state.games" :key="index">
        <GameItem :game="game" />
      </li>
    </ul>
  </main>
</template>
