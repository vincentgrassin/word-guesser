<script setup lang="ts">
import BaseLink from '@/components/ui/BaseLink.vue'
import BaseText from '@/components/ui/BaseText.vue'
</script>
<template>
  <main class="p-8">
    <BaseText as="h1" content="Oops this game does not exist" class="my-8" />
    <BaseLink to="/">Go home</BaseLink>
  </main>
</template>
