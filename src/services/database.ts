import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import databaseUrl from '../../database/crpe.sqlite?url'
import { readDatabaseContent } from './database-reader'
import { hydrateContent } from './content'

export async function initializeContent() {
  const [SQL, response] = await Promise.all([
    initSqlJs({ locateFile: () => wasmUrl }), fetch(databaseUrl),
  ])
  if (!response.ok) throw new Error(`La base de définitions est indisponible (${response.status}).`)
  const database = new SQL.Database(new Uint8Array(await response.arrayBuffer()))
  try {
    hydrateContent(readDatabaseContent(database))
  } finally {
    database.close()
  }
}
