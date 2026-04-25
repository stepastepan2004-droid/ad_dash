import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, pgClient } from './index'

export async function runMigrations() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './drizzle/migrations' })
  console.log('Migrations complete.')
}

if (import.meta.main) {
  await runMigrations()
  await pgClient.end()
}
