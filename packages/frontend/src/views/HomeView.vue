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
    <ul class="mt-4 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <li v-for="(game, index) in state.games" :key="index" class="h-full min-h-[150px]">
        <GameItem :game="game" />
      </li>
    </ul>
    <!-- Required by the Creative Commons licences of the word vectors (see the README) -->
    <footer class="mt-8 text-sm">
      Word proximity:
      <a
        class="underline"
        href="https://fasttext.cc/docs/en/crawl-vectors.html"
        target="_blank"
        rel="noopener"
        >fastText</a
      >
      (Facebook AI Research, CC BY-SA 3.0) and
      <a class="underline" href="http://www.lexique.org" target="_blank" rel="noopener"
        >Lexique 3.83</a
      >
      (Boris New, Christophe Pallier, CC BY-SA 4.0).
    </footer>
  </main>
</template>
