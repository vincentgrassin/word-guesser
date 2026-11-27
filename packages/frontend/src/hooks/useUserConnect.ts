import { useGamesStore } from '@/stores/useGamesStore'
import { generateToken } from '@/utils/helpers'
import { generateUID } from '@word-guesser/shared'
import { nextTick, onMounted } from 'vue'

export function useUserConnect(connectCallback?: () => void) {
  const { connect, state, setUserId, setUserName, setUserToken } = useGamesStore()
  onMounted(async () => {
    if (!state.socket) {
      const userId = localStorage.getItem('userId') || generateUID()
      const userName = localStorage.getItem('userName') || userId
      // Secret proving this browser owns userId: never shown, never sent to other players
      const token = localStorage.getItem('userToken') || generateToken()
      // Saved before connecting: the server reserves userId for this token at once
      setUserId(userId)
      setUserName(userName)
      setUserToken(token)
      await connect(userId, userName, token)
    }
    if (connectCallback) {
      await nextTick()
      connectCallback()
    }
  })
}
