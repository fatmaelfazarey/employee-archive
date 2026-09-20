const path = require('path');
const fs = require('fs');
const os = require('os');

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'emp-test-'));
const TEST_DB = path.join(TEST_DIR, 'test.db');

console.log('Test DB:', TEST_DB);

const Database = require('better-sqlite3');
const { allKeys } = require('../src/shared/fields');

let passed = 0, failed = 0;
function assert(cond, label) {
  if (cond) { passed++; console.log('  OK   ' + label); }
  else { failed++; console.error('  FAIL ' + label); }
}

function setupDb() {
  const db = new Database(TEST_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');
  const cols = allKeys.map((k) => {
    if (k === 'name') return k + ' TEXT NOT NULL';
    if (k === 'national_id') return k + ' TEXT UNIQUE';
    if (k === 'eval_total_score') return k + ' REAL';
    return k + ' TEXT';
  }).join(', ');
  db.exec(`CREATE TABLE employees (id INTEGER PRIMARY KEY AUTOINCREMENT, ${cols})`);
  return db;
}

function run() {
  console.log('\n=== DB Tests ===\n');
  const db = setupDb();

  console.log('1. Schema');
  const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'").get();
  assert(t && t.name === 'employees', 'employees table exists');

  console.log('\n2. Insert');
  const cols = allKeys.join(', ');
  const ph = allKeys.map((k) => '@' + k).join(', ');
  const ins = db.prepare(`INSERT INTO employees (${cols}) VALUES (${ph})`);
  const data1 = {}; allKeys.forEach((k) => data1[k] = null);
  data1.name = 'أحمد محمد'; data1.national_id = 'NID001'; data1.job_title = 'معلم';
  data1.administration = 'إدارة سنورس'; data1.eval_total_score = 95;
  const r1 = ins.run(data1);
  assert(r1.lastInsertRowid === 1, 'insert returned id 1');

  const data2 = {}; allKeys.forEach((k) => data2[k] = null);
  data2.name = 'محمد علي'; data2.national_id = 'NID002'; data2.job_title = 'مدير';
  ins.run(data2);

  console.log('\n3. Retrieval');
  const all = db.prepare('SELECT * FROM employees ORDER BY id').all();
  assert(all.length === 2, 'returned 2 rows');
  assert(all[0].name === 'أحمد محمد', 'first is أحمد');

  console.log('\n4. Update');
  db.prepare('UPDATE employees SET job_title = ?, eval_total_score = ? WHERE id = ?').run('معلم أول', 98, 1);
  const upd = db.prepare('SELECT * FROM employees WHERE id = ?').get(1);
  assert(upd.job_title === 'معلم أول', 'job_title updated');
  assert(upd.eval_total_score === 98, 'eval_total_score updated');

  console.log('\n5. Duplicate national_id');
  let dupErr = null;
  try { ins.run({ ...data1 }); } catch (e) { dupErr = e; }
  assert(dupErr !== null, 'duplicate throws');

  console.log('\n6. Search');
  const s = db.prepare('SELECT * FROM employees WHERE name LIKE ? COLLATE NOCASE').all('%أحمد%');
  assert(s.length === 1, 'search by name works');

  console.log('\n7. Filter');
  const f = db.prepare('SELECT * FROM employees WHERE job_title = ?').all('مدير');
  assert(f.length === 1, 'filter by job_title works');

  console.log('\n8. Delete');
  const d = db.prepare('DELETE FROM employees WHERE id = ?').run(2);
  assert(d.changes === 1, 'delete affected 1 row');
  const cnt = db.prepare('SELECT COUNT(*) AS c FROM employees').get();
  assert(cnt.c === 1, 'count is 1');

  db.close();
  try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch (_) {}

  console.log('\n=== Results ===');
  console.log('Passed: ' + passed);
  console.log('Failed: ' + failed);
  console.log(failed === 0 ? '\nAll tests passed.\n' : '\nSome tests failed.\n');
  process.exit(failed === 0 ? 0 : 1);
}
run();
