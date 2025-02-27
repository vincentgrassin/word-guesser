<script lang="ts" setup>
import type { Round } from '@word-guesser/shared'
import RoundItem from '@/components/RoundItem.vue'
import BaseText from '@/components/ui/BaseText.vue'

const { rounds } = defineProps<{
  rounds: Round[]
}>()
</script>

<template>
  <div class="rounded border p-4">
    <ul v-if="rounds?.length">
      <li v-for="(round, index) in rounds" :key="index">
        <RoundItem :round="round" />
      </li>
    </ul>
    <div v-else class="flex justify-center">
      <BaseText as="p" content="Waiting for first round" />
    </div>
  </div>
</template>
