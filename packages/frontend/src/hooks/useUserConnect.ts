import { useGamesStore } from '@/stores/useGamesStore'
import { generateUID } from '@word-guesser/shared'
import { nextTick, onMounted } from 'vue'

export function useUserConnect(callBack?: () => void) {
  const { connect, state } = useGamesStore()
  onMounted(async () => {
    if (!state.socket) {
      const userId = localStorage.getItem('userId') || generateUID()
      await connect(userId)
      state.userId = userId
      localStorage.setItem('userId', userId)
    }
    if (callBack) {
      await nextTick()
      callBack()
    }
  })
}
