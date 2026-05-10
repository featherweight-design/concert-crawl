import { describe, it, expect } from 'vitest'
import { NAV } from './nav'

describe('NAV config', () => {
  it('invite-codes item uses Key icon', () => {
    const item = NAV.find((navItem) => navItem.key === 'invite-codes')
    expect(item).toBeDefined()
    expect(item?.iconName).toBe('Key')
  })

  it('all operations items come before account items', () => {
    const sections = NAV.map((navItem) => navItem.section)
    const firstAccount = sections.indexOf('account')
    const lastOperations = sections.lastIndexOf('operations')
    expect(lastOperations).toBeLessThan(firstAccount)
  })

  it('dashboard is the first nav item', () => {
    expect(NAV[0]?.key).toBe('dashboard')
  })
})
