import initSqlJs from 'sql.js';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const defaultPath = fileURLToPath(new URL('../data/proyecta.sqlite', import.meta.url));
const databasePath = process.env.DATABASE_PATH ? resolve(process.env.DATABASE_PATH) : defaultPath;
mkdirSync(dirname(databasePath), { recursive: true });

const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
const SQL = await initSqlJs({ locateFile: () => wasmPath });
const sqlite = existsSync(databasePath)
  ? new SQL.Database(new Uint8Array(readFileSync(databasePath)))
  : new SQL.Database();
sqlite.run('PRAGMA foreign_keys = ON;');

function persist() {
  writeFileSync(databasePath, Buffer.from(sqlite.export()));
}

function queryRows(query, parameters = []) {
  const statement = sqlite.prepare(query);
  try {
    if (parameters.length) statement.bind(parameters);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

sqlite.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    technologies TEXT NOT NULL,
    image_url TEXT NOT NULL DEFAULT '',
    media_url TEXT NOT NULL DEFAULT '',
    demo_url TEXT NOT NULL DEFAULT '',
    repo_url TEXT NOT NULL DEFAULT '',
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    owner_key_hash TEXT
  );
  CREATE TABLE IF NOT EXISTS app_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
`);

const projectColumns = queryRows('PRAGMA table_info(projects)').map((column) => column.name);
if (!projectColumns.includes('owner_key_hash')) sqlite.run('ALTER TABLE projects ADD COLUMN owner_key_hash TEXT');

sqlite.run(`
  CREATE TABLE IF NOT EXISTS project_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    voter_key_hash TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(project_id, voter_key_hash)
  );
`);

// One-time cleanup for the six synthetic records inserted by older versions.
// This exact-pair migration never seeds new projects or deletes other registrations.
const cleanupVersion = 'remove-synthetic-demo-projects-v1';
if (queryRows('SELECT version FROM app_migrations WHERE version = ?', [cleanupVersion]).length === 0) {
  const oldSyntheticRecords = [
    ['Verde cerca', 'verde@example.com'],
    ['Pulso de datos', 'camila@example.com'],
    ['Ruta clara', 'ruta@example.com'],
    ['Aire vivo', 'daniel@example.com'],
    ['Pausa', 'lucia@example.com'],
    ['Cero merma', 'cero@example.com'],
  ];
  for (const [title, email] of oldSyntheticRecords) {
    sqlite.run('DELETE FROM projects WHERE title = ? AND contact_email = ?', [title, email]);
  }
  sqlite.run('INSERT INTO app_migrations (version) VALUES (?)', [cleanupVersion]);
}
persist();

export const db = {
  all(query, parameters = []) { return queryRows(query, parameters); },
  get(query, parameters = []) { return queryRows(query, parameters)[0]; },
  run(query, parameters = []) {
    sqlite.run(query, parameters);
    const lastInsertRowid = queryRows('SELECT last_insert_rowid() AS id')[0]?.id;
    persist();
    return { lastInsertRowid };
  },
  close() {
    persist();
    sqlite.close();
  },
};

export function serializeProject(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    technologies: JSON.parse(row.technologies),
    imageUrl: row.image_url,
    mediaUrl: row.media_url,
    demoUrl: row.demo_url,
    repoUrl: row.repo_url,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactUrl: row.contact_url,
    createdAt: row.created_at,
    ownershipEnabled: Boolean(row.owner_key_hash),
    ratingAverage: Number(row.rating_average || 0),
    ratingCount: Number(row.rating_count || 0),
  };
}
