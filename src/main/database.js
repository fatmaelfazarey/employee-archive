const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { allKeys } = require('../shared/fields');
const { evaluationItems, evaluators } = require('../shared/evaluation-config');

let db = null;

function getDatabasePath() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'employees.db');
  }
  return path.join(__dirname, '..', '..', 'database', 'employees.db');
}

function initDatabase() {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  console.log('[DB] Opening:', dbPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');
  db.pragma('foreign_keys = ON');

  createSchema();
  runMigrations();
  return db;
}

function createSchema() {
  const baseCols = allKeys.map((k) => {
    if (k === 'name') return `${k} TEXT NOT NULL`;
    if (k === 'national_id') return `${k} TEXT UNIQUE`;
    if (k === 'eval_total_score') return `${k} REAL`;
    return `${k} TEXT`;
  }).join(',\n      ');

  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${baseCols},
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // أعمدة التقييم: لكل بند × 3 مُقيّمين × 2 (رقم + حرف)
  const evalCols = [];
  for (const item of evaluationItems) {
    for (const ev of evaluators) {
      evalCols.push(`      ${item.key}_${ev.key}_num REAL`);
      evalCols.push(`      ${item.key}_${ev.key}_txt TEXT`);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      eval_year TEXT,
      period_from TEXT,
      period_to TEXT,
${evalCols.join(',\n')},
      total_direct REAL,
      total_local REAL,
      total_top REAL,
      rating TEXT,
      committee_notes TEXT,
      penalties TEXT,
      initiatives TEXT,
      appreciation TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_eval_employee ON evaluations(employee_id);
    CREATE INDEX IF NOT EXISTS idx_eval_year     ON evaluations(eval_year);
    CREATE INDEX IF NOT EXISTS idx_employees_name           ON employees(name);
    CREATE INDEX IF NOT EXISTS idx_employees_administration ON employees(administration);
    CREATE INDEX IF NOT EXISTS idx_employees_school         ON employees(school);
    CREATE INDEX IF NOT EXISTS idx_employees_job_title      ON employees(job_title);
    CREATE INDEX IF NOT EXISTS idx_employees_status         ON employees(status);
  `);
  console.log('[DB] Schema ready.');
}

function runMigrations() {
  // migrations لجدول employees
  const existing = db.prepare('PRAGMA table_info(employees)').all();
  const existingNames = new Set(existing.map((c) => c.name));
  let added = 0;
  for (const key of allKeys) {
    if (!existingNames.has(key)) {
      db.exec(`ALTER TABLE employees ADD COLUMN ${key} TEXT`);
      added++;
    }
  }

  // migrations لجدول evaluations
  const evalExisting = db.prepare('PRAGMA table_info(evaluations)').all();
  const evalNames = new Set(evalExisting.map((c) => c.name));

  for (const item of evaluationItems) {
    for (const ev of evaluators) {
      const numCol = `${item.key}_${ev.key}_num`;
      const txtCol = `${item.key}_${ev.key}_txt`;
      if (!evalNames.has(numCol)) { db.exec(`ALTER TABLE evaluations ADD COLUMN ${numCol} REAL`); added++; }
      if (!evalNames.has(txtCol)) { db.exec(`ALTER TABLE evaluations ADD COLUMN ${txtCol} TEXT`); added++; }
    }
  }

  const extraCols = ['eval_year','period_from','period_to','total_direct','total_local','total_top','rating','committee_notes','penalties','initiatives','appreciation','notes'];
  for (const col of extraCols) {
    if (!evalNames.has(col)) { db.exec(`ALTER TABLE evaluations ADD COLUMN ${col} TEXT`); added++; }
  }

  if (added > 0) console.log(`[DB] Migration: ${added} column(s) added.`);
}

function getDb() {
  if (!db) throw new Error('Database not initialized.');
  return db;
}

function closeDatabase() {
  if (db) { db.close(); db = null; console.log('[DB] Closed.'); }
}

module.exports = { initDatabase, getDb, closeDatabase, getDatabasePath };