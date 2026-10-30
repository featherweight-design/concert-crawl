import { describe, expect, it } from 'vitest'

import { isHydratedNode } from './hydration'

describe('isHydratedNode', () => {
  it('is false for server HTML React has not hydrated', () => {
    const node = document.createElement('button')

    expect(isHydratedNode(node)).toBe(false)
  })

  it('is true once React has written its props key onto the node', () => {
    const node = document.createElement('button')
    Object.assign(node, { __reactProps$k3x9q2: { onClick: () => {} } })

    expect(isHydratedNode(node)).toBe(true)
  })

  it('keys on the props key alone, not other React expandos', () => {
    const node = document.createElement('button')
    Object.assign(node, { __reactFiber$k3x9q2: {} })

    expect(isHydratedNode(node)).toBe(false)
  })
})
