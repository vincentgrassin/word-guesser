<script lang="ts" setup>
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { ref } from 'vue'
import GameCreationForm from './GameCreationForm.vue'
import UserSettingsForm from './UserSettingsForm.vue'

const isModalOpen = ref(false)
const setModal = (value: boolean) => {
  isModalOpen.value = value
}

const isUserModalOpen = ref(false)
const setUserModal = (value: boolean) => {
  isUserModalOpen.value = value
}
</script>

<template>
  <BaseModal :isOpen="isModalOpen" :close="() => setModal(false)">
    <GameCreationForm />
  </BaseModal>
  <BaseModal :isOpen="isUserModalOpen" :close="() => setUserModal(false)">
    <UserSettingsForm />
  </BaseModal>
  <div>
    <BaseButton @:click="() => setModal(true)">Create game</BaseButton>
    <BaseButton @:click="() => setUserModal(true)">User settings</BaseButton>
  </div>
</template>
