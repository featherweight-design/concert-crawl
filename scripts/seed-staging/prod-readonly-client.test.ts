import { describe, it, expect } from 'vitest'
import { openProdReadonly } from './prod-readonly-client.js'

describe('openProdReadonly', () => {
  it('throws if the url is empty', () => {
    expect(() => openProdReadonly('')).toThrow(/NEON_PROD_DIRECT/i)
  })

  it('exposes select but not insert/update/delete on the returned surface', async () => {
    const client = openProdReadonly(
      'postgres://user:pw@example/db?sslmode=require',
    )
    try {
      expect(typeof client.select).toBe('function')
      expect(typeof client.close).toBe('function')
      expect('insert' in client).toBe(false)
      expect('update' in client).toBe(false)
      expect('delete' in client).toBe(false)
    } finally {
      // Close in finally so a leaked connection doesn't hang Vitest.
      await client.close()
    }
  })

  it('throws at runtime if the callback attempts a write method', async () => {
    const client = openProdReadonly(
      'postgres://user:pw@example/db?sslmode=require',
    )
    try {
      await expect(
        client.select(async (db) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(db as any).insert({})
        }),
      ).rejects.toThrow(/ProdReadonlyClient.*insert/)
    } finally {
      await client.close()
    }
  })

  it('throws for update, delete, transaction, execute, and batch', async () => {
    const client = openProdReadonly(
      'postgres://user:pw@example/db?sslmode=require',
    )
    try {
      for (const method of [
        'update',
        'delete',
        'transaction',
        'execute',
        'batch',
      ]) {
        await expect(
          client.select(async (db) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(db as any)[method]
          }),
        ).rejects.toThrow(new RegExp(`ProdReadonlyClient.*${method}`))
      }
    } finally {
      await client.close()
    }
  })

  it('does not throw when select is accessed normally', async () => {
    const client = openProdReadonly(
      'postgres://user:pw@example/db?sslmode=require',
    )
    try {
      // Accessing 'select' on the db inside the callback must not throw.
      await expect(
        client.select(async (db) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const selectFn = (db as any).select
          return selectFn
        }),
      ).resolves.toBeDefined()
    } finally {
      await client.close()
    }
  })

  it('lets select() dispatch through the proxy (this-binding intact)', async () => {
    const client = openProdReadonly(
      'postgres://user:pw@example/db?sslmode=require',
    )
    try {
      // Actually CALL select() through the proxy — this catches
      // Proxy get-trap bugs where the returned method loses its `this`
      // binding and fails when Drizzle reads internal state via `this`.
      // We only need proof that the call itself dispatches without
      // throwing at the proxy layer; we don't need a real query to run
      // (the returned chain is discarded before any DB round-trip).
      await expect(
        client.select(async (db) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const chain = (db as any).select({})
          return typeof chain
        }),
      ).resolves.toBe('object')
    } finally {
      await client.close()
    }
  })
})
