<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseText from '@/components/ui/BaseText.vue'

const { isOpen, close } = defineProps<{
  title?: string
  isOpen: boolean
  close?: () => void
}>()

const modal = ref<HTMLElement | null>(null)
const firstFocusableElement = ref<HTMLElement | null>(null)
const lastFocusableElement = ref<HTMLElement | null>(null)

// Trap focus inside the modal
const trapFocus = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && close) {
    close()
  }

  if (e.key === 'Tab') {
    if (e.shiftKey) {
      if (document.activeElement === firstFocusableElement.value) {
        e.preventDefault()
        lastFocusableElement.value?.focus()
      }
    } else {
      if (document.activeElement === lastFocusableElement.value) {
        e.preventDefault()
        firstFocusableElement.value?.focus()
      }
    }
  }
}

// Watch for modal open/close state
watch(
  () => isOpen,
  async (newValue) => {
    if (newValue) {
      await nextTick()
      const focusableElements = modal.value?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) as NodeListOf<HTMLElement> | undefined

      if (focusableElements?.length) {
        firstFocusableElement.value = focusableElements[0]
        lastFocusableElement.value = focusableElements[focusableElements.length - 1]
        firstFocusableElement.value.focus()
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
  <Transition
    enter-active-class="duration-300 ease-out"
    enter-from-class="transform opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="transform opacity-0"
  >
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
      <div
        v-if="isOpen"
        class="relative max-h-[95vh] w-3/4 max-w-full overflow-y-auto rounded-lg border-[3px] border-black bg-background px-8 py-16 lg:w-1/2"
      >
        <BaseButton
          v-if="!!close"
          class="absolute right-4 top-4"
          variant="secondary"
          aria-label="Close modal"
          @click="close"
          >&times;
        </BaseButton>
        <BaseText v-if="!!title" as="h2" :content="title" size="xl" class="absolute left-4 top-4" />
        <div class="pt-8">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>
