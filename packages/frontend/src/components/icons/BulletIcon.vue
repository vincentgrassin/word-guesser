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
      d="M15.64 23.282l-3.012 5.217-10.678-6.165 3.012-5.217 10.678 6.165zM22.314 4.772l-1.559 5.819-11.91-3.191 1.559-5.819 11.91 3.191zM19.638 14.251l-2.303 5.567-11.394-4.713 2.303-5.567 11.394 4.713zM22.428 6.125l-0.903 3.369c3.417 0.893 6.51 1.322 9.538 0.714-2.342-2.061-5.21-3.148-8.636-4.083zM19.644 15.64l-1.333 3.222c3.244 1.313 6.234 2.127 9.293 1.92-2.039-2.331-4.717-3.778-7.96-5.142zM13.819 27.735c3.007 1.696 5.835 2.871 8.862 3.064-1.698-2.55-4.129-4.324-7.119-6.082l-1.742 3.018z"
    ></path>
  </svg>
</template>
