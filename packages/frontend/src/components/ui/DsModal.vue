<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const { isOpen } = defineProps<{
  isOpen: boolean
  close?: () => void
}>()

const modal = ref<HTMLElement | null>(null)
const firstFocusableElement = ref<HTMLElement | null>(null)
const lastFocusableElement = ref<HTMLElement | null>(null)

// Trap focus inside the modal
const trapFocus = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    if (e.shiftKey) {
      // Shift + Tab - focus backwards
      if (document.activeElement === firstFocusableElement.value) {
        e.preventDefault()
        lastFocusableElement.value?.focus()
      }
    } else {
      // Tab - focus forwards
      if (document.activeElement === lastFocusableElement.value) {
        e.preventDefault()
        firstFocusableElement.value?.focus()
      }
    }
  }
}

// When modal opens, find focusable elements and focus the first one
watch(
  () => isOpen,
  async (newValue) => {
    if (newValue) {
      await nextTick() // Wait for DOM to update

      const focusableElements = modal.value?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) as NodeListOf<HTMLElement> | undefined

      if (focusableElements?.length) {
        firstFocusableElement.value = focusableElements[0]
        lastFocusableElement.value = focusableElements[focusableElements.length - 1]
        firstFocusableElement.value.focus() // Move focus into modal
        document.addEventListener('keydown', trapFocus)
      }
    } else {
      document.removeEventListener('keydown', trapFocus)
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', trapFocus)
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="close"
    aria-labelledby="modal-title"
    role="dialog"
    aria-hidden="false"
    tabindex="-1"
    ref="modal"
  >
    <div class="relative w-96 max-w-full rounded-lg bg-white p-4">
      <button class="absolute right-2 top-2 text-xl" aria-label="Close modal" @click="close">
        &times;
      </button>
      <slot />
    </div>
  </div>
</template>
