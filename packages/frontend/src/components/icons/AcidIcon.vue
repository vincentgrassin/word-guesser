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
      d="M12.25 12.25c0.937 0 1.875 0.937 3.75 0.937s2.813-0.937 3.75-0.937c2.813 0 0.937 1.875 0 2.813 0 9.375 7.5 14.063 7.5 15.937h-22.5c0-1.875 7.5-6.562 7.5-15.937-0.938-0.937-2.813-2.813-0.001-2.813zM16.938 11.313c0 0.518-0.42 0.937-0.937 0.937s-0.937-0.42-0.937-0.937 0.42-0.937 0.937-0.937c0.517-0.001 0.937 0.42 0.937 0.937zM17.875 2.875c0 1.035-0.839 1.875-1.875 1.875s-1.875-0.839-1.875-1.875c0-1.035 0.839-1.875 1.875-1.875s1.875 0.84 1.875 1.875zM15.062 7.563c0 1.035-0.839 1.875-1.875 1.875s-1.875-0.839-1.875-1.875c0-1.035 0.839-1.875 1.875-1.875s1.875 0.839 1.875 1.875zM18.812 8.5c0 0.518-0.42 0.937-0.937 0.937s-0.937-0.42-0.937-0.937 0.42-0.937 0.937-0.937 0.937 0.42 0.937 0.937z"
    ></path>
  </svg>
</template>
