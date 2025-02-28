<script lang="ts" setup>
import BaseText from '@/components/ui/BaseText.vue'
import { useGamesStore } from '@/stores/useGamesStore'
const { state } = useGamesStore()
</script>

<template>
  <div class="flex flex-col gap-2">
    <BaseText as="h1" content="Word guesser" size="2xl" />
    <BaseText as="p" :content="`${state.user.userName}`" />
  </div>
</template>
