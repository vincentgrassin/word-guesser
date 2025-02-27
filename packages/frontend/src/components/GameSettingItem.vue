<script setup lang="ts">
import { computed, defineProps } from 'vue'
import TimerIcon from '@/components/icons/TimerIcon.vue'
import BulletIcon from '@/components/icons/BulletIcon.vue'
import AcidIcon from '@/components/icons/AcidIcon.vue'
import PlayerIcon from '@/components/icons/PlayerIcon.vue'

const props = defineProps<{
  icon: 'bullet' | 'acid' | 'timer' | 'player'
  value: string | number
}>()

const iconMap = {
  bullet: BulletIcon,
  acid: AcidIcon,
  timer: TimerIcon,
  player: PlayerIcon,
}

const IconComponent = computed(() => iconMap[props.icon] || TimerIcon)
</script>

<template>
  <div
    class="border-borderPrimary flex flex-row items-center justify-between rounded-lg border-2 bg-white p-4 text-black"
  >
    <component :is="IconComponent" width="24px" height="24px" color="#2c3e50" />
    <span class="text-4xl font-bold">{{ value }}</span>
  </div>
</template>
