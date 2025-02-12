<script lang="ts" setup>
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useToggle } from '@/hooks/useToggle'
import GameCreationForm from './GameCreationForm.vue'
import UserSettingsForm from './UserSettingsForm.vue'

const { isOn: isGameModalOpen, setIsOff: closeGameModal, setIsOn: openGameModal } = useToggle(false)
const { isOn: isUserModalOpen, setIsOff: closeUserModal, setIsOn: openUserModal } = useToggle(false)
</script>

<template>
  <div class="flex justify-end gap-4">
    <BaseModal :isOpen="isGameModalOpen" :close="closeGameModal">
      <GameCreationForm :onSubmit="closeGameModal" />
    </BaseModal>
    <BaseModal :isOpen="isUserModalOpen" :close="closeUserModal">
      <UserSettingsForm :onSubmit="closeUserModal" />
    </BaseModal>
    <BaseButton @:click="openGameModal">Create game</BaseButton>
    <BaseButton @:click="openUserModal">User settings</BaseButton>
  </div>
</template>
