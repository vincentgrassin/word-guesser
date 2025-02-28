<script setup lang="ts">
import { computed, defineProps } from 'vue'
import TimerIcon from '@/components/icons/TimerIcon.vue'
import BulletIcon from '@/components/icons/BulletIcon.vue'
import AcidIcon from '@/components/icons/AcidIcon.vue'
import PlayerIcon from '@/components/icons/PlayerIcon.vue'
import DiamondIcon from '@/components/icons/DiamondIcon.vue'
import CogIcon from '@/components/icons/CogIcon.vue'
import SkullIcon from '@/components/icons/SkullIcon.vue'
import DoorIcon from '@/components/icons/DoorIcon.vue'
export type IconName = 'bullet' | 'acid' | 'timer' | 'player' | 'skull' | 'diamond' | 'cog' | 'door'

const {
  name,
  width = '24px',
  height = '24px',
  color = '#2c3e50',
} = defineProps<{
  name: IconName
  width?: string
  height?: string
  color?: string
}>()

const iconMap = {
  bullet: BulletIcon,
  acid: AcidIcon,
  timer: TimerIcon,
  player: PlayerIcon,
  skull: SkullIcon,
  cog: CogIcon,
  diamond: DiamondIcon,
  door: DoorIcon,
}

const IconComponent = computed(() => iconMap[name] || TimerIcon)
</script>

<template>
  <component :is="IconComponent" :width="width" :height="height" :color="color" />
</template>
