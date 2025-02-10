<script setup lang="ts">
import { defineProps, type InputHTMLAttributes } from 'vue'

defineProps<
  {
    label: string
    value: string
  } & /** @vue-ignore */ InputHTMLAttributes
>()

const radioModel = defineModel<string | number>()
</script>

<template>
  <label>
    <input v-bind="$attrs" v-model="radioModel" type="radio" :value="value" />
    {{ label }}
  </label>
</template>
