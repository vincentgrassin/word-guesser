import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, type Pinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import { useGamesStore } from '@/stores/useGamesStore'

// Mounts the whole app (real router, real store) on a given page.
// The store talks to the fake game server, see fakeGameServer.ts.
export async function renderApp(path: string): Promise<{ wrapper: VueWrapper; pinia: Pinia }> {
  await router.push(path)
  await router.isReady()
  const pinia = createPinia()
  const wrapper = mount(App, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, pinia }
}

export function unmountApp({ wrapper, pinia }: { wrapper: VueWrapper; pinia: Pinia }) {
  useGamesStore(pinia).disconnect()
  wrapper.unmount()
}

export const tokenOf = (userId: string) => `${userId}-secret-token-0123456789`

export function logInAs(userId: string, userName: string) {
  localStorage.setItem('userId', userId)
  localStorage.setItem('userName', userName)
  localStorage.setItem('userToken', tokenOf(userId))
}
