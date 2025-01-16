<script setup lang="ts">
import GameManager from '@/components/GameManager.vue'
import { generateUID } from '@/utils/helpers'
import { provide, ref } from 'vue'
const userName = ref('')
const uid = generateUID()
provide('userName', userName)
provide('userId', uid)
</script>

<template>
  <main>
    <h1>Word Guesser</h1>
    <p>User: {{ userName }}</p>
    <input v-model="userName" className="text-black" />
    <GameManager :id="123" />
    <GameManager :id="456" />
  </main>
</template>
