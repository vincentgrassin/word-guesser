<script setup lang="ts">
import { defineProps, computed } from 'vue'

const props = defineProps<{
  width?: string
  height?: string
  color?: string
}>()

const svgStyle = computed(() => ({
  width: props.width || '24px',
  height: props.height || '24px',
  color: props.color || 'black',
}))
</script>

<template>
  <svg
    :width="svgStyle.width"
    :height="svgStyle.height"
    :fill="svgStyle.color"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15.915 8.358c-4.269 0-7.994 2.525-9.982 6.279h-3.51v5.812h7.020c0.198-3.703 3.014-6.642 6.471-6.642s6.273 2.939 6.471 6.642h7.020v-5.812h-3.51c-1.987-3.754-5.713-6.279-9.982-6.279v0zM2.423 21.484v9.375h7.028v-9.375h-7.028zM22.379 21.484v9.375h7.028v-9.375h-7.028z"
    ></path>
  </svg>
</template>
