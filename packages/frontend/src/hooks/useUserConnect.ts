import { useGamesStore } from '@/stores/useGamesStore'
import { generateUID } from '@word-guesser/shared'
import { nextTick, onMounted } from 'vue'

export function useUserConnect(connectCallback?: () => void) {
  const { connect, state, setUserId } = useGamesStore()
  onMounted(async () => {
    if (!state.socket) {
      const userId = localStorage.getItem('userId') || generateUID()
      const userName = localStorage.getItem('userName') || userId
      await connect(userId, userName)
      setUserId(userId)
    }
    if (connectCallback) {
      await nextTick()
      connectCallback()
    }
  })
}
