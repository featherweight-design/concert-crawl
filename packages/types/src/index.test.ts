import { describe, it, expectTypeOf } from 'vitest'
import type { Role, ApiResponse, PaginatedResponse } from './index.js'

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
