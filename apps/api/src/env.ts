import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: '.env.local' })
dotenv.config() // fallback to .env if present

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
})

// Web Push (#971) VAPID vars are read directly from process.env at runtime
// inside send-push.ts and me-push.ts — not validated here — so that adding
// them didn't force every test-time importer of the route registry through
// env.ts's exit-on-invalid path (unit tests import routes without a
// populated .env). See .env.example for the three names and generation.

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
