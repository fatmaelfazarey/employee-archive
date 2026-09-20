const { ipcMain, dialog, BrowserWindow } = require('electron');
const { getDb } = require('./database');
const { allKeys, requiredKeys, uniqueKeys, typeMap } = require('../shared/fields');
const { evaluationItems, evaluators, calculateRating, calculateAllTotals } = require('../shared/evaluation-config');
const { exportToExcel, importFromExcel } = require('./excel');

// ========== Employee ==========
function validate(data) {
  const errors = [];
  for (const key of requiredKeys) {
    const v = data[key];
    if (v === undefined || v === null || String(v).trim() === '') errors.push(`الحقل "${key}" مطلوب`);
  }
  return errors;
}

function normalize(data) {
  const out = {};
  for (const key of allKeys) {
    let v = data[key];
    if (v === undefined || v === null || v === '') out[key] = null;
    else if (typeMap[key] === 'number') { const n = Number(v); out[key] = isNaN(n) ? null : n; }
    else out[key] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

function buildSearchWhere(query, filters) {
  const clauses = [];
  const params = [];
  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    const cols = ['name','national_id','phone','job_title','administration','school'];
    clauses.push('(' + cols.map((c) => `${c} LIKE ? COLLATE NOCASE`).join(' OR ') + ')');
    cols.forEach(() => params.push(q));
  }
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      if (!allKeys.includes(key)) continue;
      clauses.push(`${key} = ?`);
      params.push(value);
    }
  }
  return { where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', params };
}

// ========== Evaluation ==========
function evalColumns() {
  const cols = ['employee_id','eval_year','period_from','period_to',
    'total_direct','total_local','total_top','rating',
    'committee_notes','penalties','initiatives','appreciation','notes'];
  for (const item of evaluationItems) {
    for (const ev of evaluators) {
      cols.push(`${item.key}_${ev.key}_num`, `${item.key}_${ev.key}_txt`);
    }
  }
  return cols;
}

function normalizeEvaluation(data) {
  const out = {
    employee_id: Number(data.employee_id),
    eval_year: data.eval_year || null,
    period_from: data.period_from || null,
    period_to: data.period_to || null,
    rating: data.rating || null,
    committee_notes: data.committee_notes || null,
    penalties: data.penalties || null,
    initiatives: data.initiatives || null,
    appreciation: data.appreciation || null,
    notes: data.notes || null,
  };

  for (const item of evaluationItems) {
    for (const ev of evaluators) {
      const numKey = `${item.key}_${ev.key}_num`;
      const txtKey = `${item.key}_${ev.key}_txt`;
      out[numKey] = data[numKey] !== '' && data[numKey] != null ? Number(data[numKey]) : null;
      out[txtKey] = data[txtKey] || null;
    }
  }

  // احسب المجاميع (إلا لو المستخدم مدخلهم)
  const calc = calculateAllTotals(out);
  out.total_direct = (data.total_direct !== '' && data.total_direct != null) ? Number(data.total_direct) : calc.total_direct;
  out.total_local  = (data.total_local  !== '' && data.total_local  != null) ? Number(data.total_local)  : calc.total_local;
  out.total_top    = (data.total_top    !== '' && data.total_top    != null) ? Number(data.total_top)    : calc.total_top;

  // مرتبة التقدير
  if (!out.rating) {
    // مبنية على total_direct افتراضيًا
    out.rating = calculateRating(out.total_direct);
  }

  return out;
}

function registerIpcHandlers() {
  // ============ EMPLOYEES ============
  ipcMain.handle('employees:list', (_e, query, filters) => {
    try {
      const db = getDb();
      const { where, params } = buildSearchWhere(query, filters);
      const rows = db.prepare(`SELECT * FROM employees ${where} ORDER BY name COLLATE NOCASE ASC`).all(...params);
      return { success: true, data: rows };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('employees:get', (_e, id) => {
    try {
      const row = getDb().prepare('SELECT * FROM employees WHERE id = ?').get(id);
      if (!row) return { success: false, error: 'الموظف غير موجود' };
      return { success: true, data: row };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('employees:create', (_e, data) => {
    try {
      const errors = validate(data);
      if (errors.length) return { success: false, error: errors.join(' | ') };
      const n = normalize(data);
      const db = getDb();
      for (const key of uniqueKeys) {
        if (n[key]) {
          const dup = db.prepare(`SELECT id FROM employees WHERE ${key} = ?`).get(n[key]);
          if (dup) return { success: false, error: `القيمة موجودة بالفعل في "${key}"` };
        }
      }
      const cols = allKeys.join(', ');
      const ph = allKeys.map((k) => '@' + k).join(', ');
      const info = db.prepare(`INSERT INTO employees (${cols}) VALUES (${ph})`).run(n);
      return { success: true, data: { id: info.lastInsertRowid } };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) return { success: false, error: 'القيمة موجودة بالفعل' };
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('employees:update', (_e, id, data) => {
    try {
      const errors = validate(data);
      if (errors.length) return { success: false, error: errors.join(' | ') };
      const n = normalize(data);
      const db = getDb();
      const existing = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
      if (!existing) return { success: false, error: 'الموظف غير موجود' };
      for (const key of uniqueKeys) {
        if (n[key]) {
          const dup = db.prepare(`SELECT id FROM employees WHERE ${key} = ? AND id != ?`).get(n[key], id);
          if (dup) return { success: false, error: `القيمة موجودة بالفعل في "${key}"` };
        }
      }
      const setClause = allKeys.map((k) => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE employees SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run({ ...n, id });
      return { success: true, data: { id } };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) return { success: false, error: 'القيمة موجودة بالفعل' };
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('employees:delete', (_e, id) => {
    try {
      const info = getDb().prepare('DELETE FROM employees WHERE id = ?').run(id);
      if (info.changes === 0) return { success: false, error: 'الموظف غير موجود' };
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('employees:distinctValues', (_e, fieldKey) => {
    try {
      if (!allKeys.includes(fieldKey)) return { success: false, error: 'حقل غير معروف' };
      const rows = getDb().prepare(`SELECT DISTINCT ${fieldKey} AS v FROM employees WHERE ${fieldKey} IS NOT NULL AND ${fieldKey} != '' ORDER BY ${fieldKey} COLLATE NOCASE`).all();
      return { success: true, data: rows.map((r) => r.v) };
    } catch (err) { return { success: false, error: err.message }; }
  });

  // ============ EVALUATIONS ============
  ipcMain.handle('evaluations:listByEmployee', (_e, employeeId) => {
    try {
      const rows = getDb().prepare('SELECT * FROM evaluations WHERE employee_id = ? ORDER BY eval_year DESC, id DESC').all(employeeId);
      return { success: true, data: rows };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('evaluations:get', (_e, id) => {
    try {
      const row = getDb().prepare('SELECT * FROM evaluations WHERE id = ?').get(id);
      if (!row) return { success: false, error: 'التقييم غير موجود' };
      return { success: true, data: row };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('evaluations:create', (_e, data) => {
    try {
      if (!data.employee_id) return { success: false, error: 'اختر موظف' };
      const db = getDb();
      const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(data.employee_id);
      if (!emp) return { success: false, error: 'الموظف غير موجود' };

      const n = normalizeEvaluation(data);
      const cols = evalColumns();
      const ph = cols.map((c) => '@' + c).join(', ');
      const info = db.prepare(`INSERT INTO evaluations (${cols.join(', ')}) VALUES (${ph})`).run(n);
      return { success: true, data: { id: info.lastInsertRowid } };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('evaluations:update', (_e, id, data) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT id FROM evaluations WHERE id = ?').get(id);
      if (!existing) return { success: false, error: 'التقييم غير موجود' };
      const n = normalizeEvaluation(data);
      n.id = id;
      const cols = evalColumns();
      const setClause = cols.map((c) => `${c} = @${c}`).join(', ');
      db.prepare(`UPDATE evaluations SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`).run(n);
      return { success: true, data: { id } };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('evaluations:delete', (_e, id) => {
    try {
      const info = getDb().prepare('DELETE FROM evaluations WHERE id = ?').run(id);
      if (info.changes === 0) return { success: false, error: 'التقييم غير موجود' };
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  });

  // ============ EXCEL ============
  ipcMain.handle('excel:export', async (e, query, filters) => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender);
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'حفظ ملف Excel',
        defaultPath: `employees-${new Date().toISOString().split('T')[0]}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      const db = getDb();
      const { where, params } = buildSearchWhere(query, filters);
      const rows = db.prepare(`SELECT * FROM employees ${where}`).all(...params);
      const result = await exportToExcel(rows, filePath);
      return { ...result, filePath };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('excel:import', async (e) => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender);
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'اختر ملف Excel',
        filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
        properties: ['openFile'],
      });
      if (canceled || !filePaths.length) return { success: false, canceled: true };
      const result = await importFromExcel(filePaths[0]);
      return { ...result, filePath: filePaths[0] };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('excel:template', async (e) => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender);
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'حفظ قالب فارغ',
        defaultPath: 'employees-template.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      if (canceled || !filePath) return { success: false, canceled: true };
      const result = await exportToExcel([], filePath);
      return { ...result, filePath };
    } catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('db:info', () => {
    try {
      const db = getDb();
      const c = db.prepare('SELECT COUNT(*) AS c FROM employees').get();
      return { success: true, data: { path: require('./database').getDatabasePath(), employeeCount: c.c } };
    } catch (err) { return { success: false, error: err.message }; }
  });

  console.log('[IPC] Handlers registered.');
}

module.exports = { registerIpcHandlers };