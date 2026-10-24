import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { mkdir, readdir, readFile } from 'node:fs/promises'

const databaseUrl = new URL('../database/crpe.sqlite', import.meta.url)
await mkdir(new URL('../database/', import.meta.url), { recursive: true })
const db = new DatabaseSync(fileURLToPath(databaseUrl))
try {
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL);')
  const directory = new URL('../database/migrations/', import.meta.url)
  const migrations = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()
  for (const name of migrations) {
    const sql = await readFile(new URL(name, directory), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const applied = db.prepare('SELECT sha256 FROM migrations WHERE name = ?').get(name)
    if (applied) {
      if (applied.sha256 !== checksum) throw new Error(`La migration ${name} a changé après application. Ajouter une nouvelle migration.`)
      continue
    }
    db.exec('BEGIN IMMEDIATE;')
    try {
      db.exec(sql)
      db.prepare('INSERT INTO migrations(name, sha256) VALUES (?, ?)').run(name, checksum)
      db.exec('COMMIT;')
      console.log(`Migration appliquée : ${name}`)
    } catch (error) {
      db.exec('ROLLBACK;')
      throw error
    }
  }
  const issues = db.prepare('PRAGMA foreign_key_check').all()
  if (issues.length) throw new Error('La base contient des références invalides.')
  console.log(db.prepare('SELECT COUNT(*) AS definitions, COUNT(DISTINCT chapter_id) AS chapitres FROM definitions').get())
} finally {
  db.close()
}
