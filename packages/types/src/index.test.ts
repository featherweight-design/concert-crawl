import { describe, it, expectTypeOf } from 'vitest'
import type {
  Role,
  ApiResponse,
  PaginatedResponse,
  Venue,
  InviteCode,
} from './index.js'

describe('shared types', () => {
  it('Role is a union of expected string literals', () => {
    expectTypeOf<Role>().toEqualTypeOf<'admin' | 'sub_admin' | 'user'>()
  })

  it('ApiResponse wraps data with success flag', () => {
    expectTypeOf<ApiResponse<string>>().toMatchTypeOf<{
      success: boolean
      data: string
    }>()
  })

  it('PaginatedResponse includes pagination metadata', () => {
    expectTypeOf<PaginatedResponse<string>>().toMatchTypeOf<{
      data: string[]
      total: number
      page: number
      pageSize: number
    }>()
  })
})

describe('venue and invite code types', () => {
  it('Venue has required fields', () => {
    expectTypeOf<Venue>().toMatchTypeOf<{
      id: string
      name: string
      slug: string
      websiteUrl: string
      city: string
      active: boolean
      verified: boolean
    }>()
  })

  it('InviteCode has revocation fields', () => {
    expectTypeOf<InviteCode>().toMatchTypeOf<{
      id: string
      code: string
      createdBy: string
      revokedAt: string | null
      revokedBy: string | null
    }>()
  })
})
