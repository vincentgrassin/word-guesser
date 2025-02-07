<script lang="ts" setup>
import DsButton from '@/components/ui/DsButton.vue'
import DsModal from '@/components/ui/DsModal.vue'
import { ref } from 'vue'
import GameCreationForm from './GameCreationForm.vue'

const isModalOpen = ref(false)
const setModal = (value: boolean) => {
  isModalOpen.value = value
}
const userName = ref('')
</script>

<template>
  <DsModal :isOpen="isModalOpen" :close="() => setModal(false)">
    <GameCreationForm />
  </DsModal>
  <div>
    <DsButton @:click="() => setModal(true)">Create game</DsButton>
    <p>User: {{ userName }}</p>
    <input v-model="userName" className="text-black" />
  </div>
</template>
