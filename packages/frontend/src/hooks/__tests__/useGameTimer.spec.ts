import type { Game } from '@word-guesser/shared'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, nextTick, ref } from 'vue'
import { useGameTimer } from '../useGameTimer'

const NOW = new Date('2026-01-01T12:00:00Z').getTime()
const DURATION = 120_000

const buildGame = (startedAt?: number): Game => ({
  gameId: 'g1',
  rounds: [],
  players: [],
  settings: {
    status: 'started',
    createdBy: 'alice',
    createdAt: 0,
    type: 'basic',
    maxPlayers: 2,
    duration: DURATION,
    name: 'Duo',
    startedAt,
  },
})

// The hook uses watch() and onUnmounted(), so it has to run inside a component.
function mountTimer(initialGame: Game | undefined) {
  const game = ref(initialGame)
  let timer!: ReturnType<typeof useGameTimer>['gameTimer']
  const wrapper = mount(
    defineComponent({
      setup() {
        timer = useGameTimer(computed(() => game.value)).gameTimer
        return () => null
      },
    }),
  )
  return { game, timer, wrapper }
}

describe('useGameTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the full duration while the game has not started', () => {
    const { timer } = mountTimer(buildGame())

    vi.advanceTimersByTime(5_000)

    expect(timer.value).toBe(DURATION)
  })

  it('counts down every second once the game has started', () => {
    const { timer } = mountTimer(buildGame(NOW - 10_000))
    expect(timer.value).toBe(DURATION - 10_000)

    vi.advanceTimersByTime(3_000)

    expect(timer.value).toBe(DURATION - 13_000)
  })

  it('starts counting when the game starts', async () => {
    const { game, timer } = mountTimer(buildGame())

    game.value = buildGame(NOW)
    await nextTick()
    vi.advanceTimersByTime(2_000)

    expect(timer.value).toBe(DURATION - 2_000)
  })

  it('stops at zero', () => {
    const { timer } = mountTimer(buildGame(NOW - DURATION + 2_000))

    vi.advanceTimersByTime(10_000)

    expect(timer.value).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops the interval when the component is unmounted', () => {
    const { wrapper } = mountTimer(buildGame(NOW))
    expect(vi.getTimerCount()).toBe(1)

    wrapper.unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
