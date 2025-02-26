<script setup lang="ts">
import { defineProps, type InputHTMLAttributes } from 'vue'

defineProps<
  {
    label: string
  } & /** @vue-ignore */ InputHTMLAttributes
>()
</script>

<template>
  <fieldset>
    <legend class="font-bold">{{ label }}</legend>
    <slot />
  </fieldset>
</template>
