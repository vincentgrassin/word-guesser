import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BetItem from '../BetItem.vue'
import type { MessageScore } from '@/utils/helpers'

const renderBet = (score: MessageScore, isRevealed = true) =>
  mount(BetItem, { props: { bet: 'mer', isRevealed, score, position: 'left' } })

const unknownMark = (wrapper: ReturnType<typeof renderBet>) =>
  wrapper.find('[aria-label="Unknown word: no proximity score"]')

describe('BetItem', () => {
  it('shows the level of a scored word', () => {
    const wrapper = renderBet(0.62)

    expect(wrapper.classes()).toContain('border-red')
    expect(unknownMark(wrapper).exists()).toBe(false)
  })

  it('shows "?" for an unknown word, with the neutral look', () => {
    const wrapper = renderBet(null)

    expect(unknownMark(wrapper).text()).toBe('?')
    expect(wrapper.classes()).toContain('border-primary')
  })

  it('shows no indicator when there is no score', () => {
    const wrapper = renderBet(undefined)

    expect(unknownMark(wrapper).exists()).toBe(false)
    expect(wrapper.classes()).toContain('border-primary')
  })

  it('hides "?" until the word is revealed', () => {
    expect(unknownMark(renderBet(null, false)).exists()).toBe(false)
  })
})
