import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createLogger } from './index.js'

describe('createLogger', () => {
  beforeEach(() => {
    delete process.env['LOG_LEVEL']
  })

  afterEach(() => {
    delete process.env['LOG_LEVEL']
  })

  it('returns a logger with standard methods', () => {
    const logger = createLogger('test')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('defaults to info log level', () => {
    const logger = createLogger('test')
    expect(logger.level).toBe('info')
  })

  it('respects LOG_LEVEL env var', () => {
    process.env['LOG_LEVEL'] = 'debug'
    const logger = createLogger('test')
    expect(logger.level).toBe('debug')
  })

  it('includes the name binding', () => {
    const logger = createLogger('api')
    expect(logger.bindings().name).toBe('api')
  })
})
