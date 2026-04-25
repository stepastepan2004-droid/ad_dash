import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { runMigrations } from './db/migrate'
import { uploadRoutes } from './routes/upload'
import { campaignRoutes } from './routes/campaigns'

await runMigrations()

function getCorsOrigin(): string | RegExp | true {
  const env = process.env.CORS_ORIGIN
  if (!env) return /localhost/
  if (env === '*') return true
  return env
}

const app = new Elysia()
  .use(cors({
    origin: getCorsOrigin(),
  }))
  .use(uploadRoutes)
  .use(campaignRoutes)
  .listen(3001)

console.log(`Elysia API running on http://localhost:${app.server?.port}`)
