<script setup lang="ts">
import { defineProps, type InputHTMLAttributes } from 'vue'

defineProps<
  {
    label: string
  } & /** @vue-ignore */ InputHTMLAttributes
>()
</script>

<template>
  <fieldset class="px-4 py-2">
    <legend>{{ label }}:</legend>
    <slot />
  </fieldset>
</template>
