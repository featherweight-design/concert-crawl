import { Hono } from 'hono'
import { validateCodeRouter } from './validate-code.js'
import { redeemCodeRouter } from './redeem-code.js'

export const authRouter = new Hono()
  .route('/validate-code', validateCodeRouter)
  .route('/redeem-code', redeemCodeRouter)
