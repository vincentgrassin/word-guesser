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
      d="M26.	 5.915h-21.485l-4.543 6.12 15.344 16.815 15.344-16.815-4.659-6.12zM16.024 28.671l-6.021-16.523 6.021-6.146 6.021 6.146-6.021 16.523zM9.541 11.822l-4.633-6.114zM22.4 11.822l4.56-6.114zM9.541 12.137h12.86v0.574h-12.86v-0.574z"
    ></path>
  </svg>
</template>
