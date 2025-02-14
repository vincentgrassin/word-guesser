import { useGamesStore } from '@/stores/useGamesStore'
import { generateUID } from '@word-guesser/shared'
import { nextTick, onMounted } from 'vue'

export function useUserConnect(callBack?: () => void) {
  const { connect, state, setUserId } = useGamesStore()
  onMounted(async () => {
    if (!state.socket) {
      const savedUserId = localStorage.getItem('userId')
      if (savedUserId) {
        await connect(savedUserId)
        setUserId(savedUserId)
      } else {
        const uid = generateUID()
        await connect(uid)
        setUserId(uid)
      }
    }
    if (callBack) {
      await nextTick()
      callBack()
    }
  })
}
