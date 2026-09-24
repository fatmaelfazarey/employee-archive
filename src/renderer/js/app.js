


// ==================== SETUP ====================
const F = window.FIELDS_MODULE;
const { fields, tableFields, formFields, filterFields, requiredKeys, labelMap, typeMap } = F;

// ==================== STATE ====================
let state = {
  employees: [],
  searchQuery: '',
  filters: {},
  currentEmployee: null,
  pendingDeleteId: null,
};

// ==================== DOM ====================
const $ = (s) => document.querySelector(s);
const tbody         = $('#employee-tbody');
const thead         = $('#table-head');
const searchInput   = $('#search-input');
const clearSearch   = $('#btn-clear-search');
const filtersCont   = $('#filters-container');
const clearFilters  = $('#btn-clear-filters');
const messageArea   = $('#message-area');
const dbStatus      = $('#db-status');
const recordCount   = $('#record-count');
const filterInd     = $('#filter-indicator');

const modalForm     = $('#modal-form');
const modalDetails  = $('#modal-details');
const modalDelete   = $('#modal-delete');
const form          = $('#employee-form');
const formFieldsDiv = $('#form-fields');
const formTitle     = $('#modal-form-title');

// ==================== HELPERS ====================
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showMessage(text, type = 'success', dismissible = true) {
  const div = document.createElement('div');
  div.className = 'message ' + type;
  div.innerHTML = '<span>' + esc(text) + '</span>';
  if (dismissible) {
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.onclick = () => div.remove();
    div.appendChild(btn);
  }
  messageArea.appendChild(div);
  if (type === 'success') {
    setTimeout(() => { if (div.parentNode) div.remove(); }, 4000);
  }
  // Auto-scroll
  div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function openModal(id) { $('#' + id).classList.remove('hidden'); }
function closeModal(id) { $('#' + id).classList.add('hidden'); }

function statusBadge(value) {
  if (!value) return '';
  const v = String(value);
  let cls = 'badge-inactive';
  if (v === 'نشط') cls = 'badge-active';
  return '<span class="badge ' + cls + '">' + esc(v) + '</span>';
}

function ratingBadge(value) {
  if (!value) return '';
  const v = String(value);
  let cls = 'badge-ok';
  if (v === 'كـــــــفء') cls = 'badge-excellent';
  else if (v === 'جيد جدًا' || v === 'جيد جدا') cls = 'badge-good';
  else if (v === 'جيد') cls = 'badge-ok';
  else if (v === 'مقبول' || v === 'ضعيف') cls = 'badge-weak';
  return '<span class="badge ' + cls + '">' + esc(v) + '</span>';
}

function renderCell(field, emp) {
  const v = emp[field.key];
  if (field.key === 'status') return statusBadge(v);
  if (field.key === 'eval_rating') return ratingBadge(v);
  if (v === null || v === undefined || v === '') return '—';
  return esc(v);
}

// ==================== TABLE ====================
function buildTableHead() {
  const cols = tableFields.map((f) => '<th>' + esc(f.label) + '</th>').join('');
  thead.innerHTML = '<tr>' + cols + '<th class="actions-col">إجراءات</th></tr>';
}

function renderTable() {
  const list = state.employees;
  if (!list.length) {
    const msg = (state.searchQuery || Object.keys(state.filters).length)
      ? 'لا توجد نتائج مطابقة للبحث أو الفلترة'
      : 'لا يوجد موظفين بعد. اضغط "+ إضافة موظف" للبدء';
    tbody.innerHTML = '<tr><td colspan="' + (tableFields.length + 1) + '" class="empty-row">' + esc(msg) + '</td></tr>';
  } else {
    // tbody.innerHTML = list.map((emp) => {
    //   const cells = tableFields.map((f) => '<td>' + renderCell(f, emp) + '</td>').join('');
    //   return '<tr data-id="' + emp.id + '">' + cells +
    //     '<td class="actions-col"><div class="row-actions">' +
    //     '<button class="btn btn-outline btn-sm" data-action="view" data-id="' + emp.id + '">عرض</button>' +
    //     '<button class="btn btn-outline btn-sm" data-action="edit" data-id="' + emp.id + '">تعديل</button>' +
    //     '<button class="btn btn-danger btn-sm" data-action="delete" data-id="' + emp.id + '">حذف</button>' +
    //     '</div></td></tr>';
    // }).join('');
  
    tbody.innerHTML = list.map((emp) => {
  const cells = tableFields.map((f) => '<td>' + renderCell(f, emp) + '</td>').join('');
  return '<tr data-id="' + emp.id + '">' + cells +
    '<td class="actions-col"><div class="row-actions">' +
    '<button class="btn btn-outline btn-sm" data-action="view" data-id="' + emp.id + '">عرض</button>' +
    '<button class="btn btn-outline btn-sm" data-action="edit" data-id="' + emp.id + '">تعديل</button>' +
    '<button class="btn btn-outline btn-sm" data-action="pdf" data-id="' + emp.id + '">تحميل PDF</button>' +
    '<button class="btn btn-danger btn-sm" data-action="delete" data-id="' + emp.id + '">حذف</button>' +
    '</div></td></tr>';
}).join('');
  
  }
  recordCount.textContent = list.length + ' سجل';
  const hasFilter = state.searchQuery || Object.keys(state.filters).some((k) => state.filters[k]);
  filterInd.classList.toggle('hidden', !hasFilter);
}

// ==================== FORM ====================
function buildForm() {
  formFieldsDiv.innerHTML = formFields.map((f) => {
    const required = f.required ? '<span class="req">*</span>' : '';
    let input = '';
    const id = 'field-' + f.key;

    if (f.type === 'select') {
      const opts = (f.options || []).map((o) =>
        '<option value="' + esc(o) + '">' + (o ? esc(o) : '— اختر —') + '</option>'
      ).join('');
      input = '<select id="' + id + '" data-key="' + f.key + '">' + opts + '</select>';
    } else if (f.type === 'textarea') {
      input = '<textarea id="' + id + '" data-key="' + f.key + '" rows="2"></textarea>';
    } else if (f.type === 'number') {
      input = '<input type="number" id="' + id + '" data-key="' + f.key + '" step="0.01" />';
    } else if (f.type === 'date') {
      input = '<input type="date" id="' + id + '" data-key="' + f.key + '" />';
    } else {
      input = '<input type="text" id="' + id + '" data-key="' + f.key + '" />';
    }

    const fullClass = f.type === 'textarea' ? ' full-width' : '';
    return '<div class="form-group' + fullClass + '"><label for="' + id + '">' + esc(f.label) + ' ' + required + '</label>' + input + '</div>';
  }).join('');
}

function getFormData() {
  const data = {};
  for (const f of formFields) {
    const el = document.getElementById('field-' + f.key);
    if (el) data[f.key] = el.value;
  }
  return data;
}

function setFormData(emp) {
  for (const f of formFields) {
    const el = document.getElementById('field-' + f.key);
    if (!el) continue;
    el.value = emp[f.key] !== null && emp[f.key] !== undefined ? emp[f.key] : '';
  }
}

function openAddForm() {
  form.reset();
  $('#form-id').value = '';
  formTitle.textContent = 'إضافة موظف';
  // Defaults
  for (const f of formFields) {
    if (f.default) {
      const el = document.getElementById('field-' + f.key);
      if (el) el.value = f.default;
    }
  }
  openModal('modal-form');
  setTimeout(() => {
    const firstInput = formFieldsDiv.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }, 50);
}

function openEditForm(emp) {
  setFormData(emp);
  $('#form-id').value = emp.id;
  formTitle.textContent = 'تعديل موظف';
  openModal('modal-form');
}

// ==================== DETAILS ====================
function showDetails(emp) {
  state.currentEmployee = emp;
  const groups = [
    { title: 'بيانات الموظف', keys: ['name','national_id','birth_date','qualification','job_title','grade','grade_date','administration','school','directorate','education_directorate',
  'education_administration',
  'education_level',
  'school_name','phone','address','status'] },
    { title: 'بيانات التقييم', keys: ['eval_period_from','eval_period_to','eval_year','eval_total_score','eval_rating','eval_penalties','eval_initiatives','eval_appreciation','eval_notes'] },
  ];

  let html = '';
  for (const g of groups) {
    html += '<div class="section-title">' + esc(g.title) + '</div>';
    for (const key of g.keys) {
      const label = labelMap[key] || key;
      const val = emp[key];
      let display = '—';
      if (val !== null && val !== undefined && val !== '') {
        display = esc(val);
      }
      html += '<dt>' + esc(label) + '</dt><dd>' + display + '</dd>';
    }
  }
  $('#details-content').innerHTML = html;
  openModal('modal-details');
}

// ==================== FILTERS ====================
async function buildFilters() {
  filtersCont.innerHTML = '';
  for (const f of filterFields) {
    const select = document.createElement('select');
    select.dataset.key = f.key;
    select.innerHTML = '<option value="">' + esc(f.label) + ' — الكل</option>';

    // جِب القيم الموجودة من الداتا
    try {
      const res = await window.api.distinct(f.key);
      if (res.success) {
        for (const v of res.data) {
          const opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          select.appendChild(opt);
        }
      }
    } catch (_) {}

    select.addEventListener('change', () => {
      if (select.value) state.filters[f.key] = select.value;
      else delete state.filters[f.key];
      refreshList();
    });
    filtersCont.appendChild(select);
  }
}

function clearAllFilters() {
  state.filters = {};
  state.searchQuery = '';
  searchInput.value = '';
  clearSearch.classList.remove('visible');
  filtersCont.querySelectorAll('select').forEach((s) => { s.value = ''; });
  refreshList();
}

// ==================== DATA ====================
async function refreshList() {
  const res = await window.api.list(state.searchQuery, state.filters);
  if (!res.success) {
    showMessage('فشل التحميل: ' + res.error, 'error');
    return;
  }
  state.employees = res.data;
  renderTable();
}

async function loadDbInfo() {
  try {
    const res = await window.api.dbInfo();
    if (res.success) {
      dbStatus.textContent = res.data.employeeCount + ' موظف | ' + res.data.path;
      dbStatus.title = res.data.path;
    }
  } catch (_) {}
}

// ==================== CRUD ====================
async function handleFormSubmit(e) {
  e.preventDefault();
  const data = getFormData();
  // Client-side validation
  for (const k of requiredKeys) {
    if (!data[k] || String(data[k]).trim() === '') {
      showMessage('الحقل "' + (labelMap[k] || k) + '" مطلوب', 'error');
      const el = document.getElementById('field-' + k);
      if (el) el.focus();
      return;
    }
  }

  const id = $('#form-id').value;
  let res;
  if (id) {
    res = await window.api.update(Number(id), data);
  } else {
    res = await window.api.create(data);
  }

  if (!res.success) {
    showMessage(res.error, 'error');
    return;
  }

  closeModal('modal-form');
  showMessage(id ? 'تم تعديل الموظف بنجاح' : 'تم إضافة الموظف بنجاح', 'success');
  await refreshList();
  await loadDbInfo();
  await rebuildFilterOptions();
}

function confirmDelete(emp) {
  state.pendingDeleteId = emp.id;
  $('#delete-message').textContent = 'هل أنت متأكد من حذف "' + (emp.name || 'موظف') + '"؟ لا يمكن التراجع.';
  openModal('modal-delete');
}

async function handleConfirmDelete() {
  if (!state.pendingDeleteId) return;
  const res = await window.api.remove(state.pendingDeleteId);
  state.pendingDeleteId = null;
  closeModal('modal-delete');
  if (!res.success) { showMessage(res.error, 'error'); return; }
  showMessage('تم حذف الموظف بنجاح', 'success');
  await refreshList();
  await loadDbInfo();
  await rebuildFilterOptions();
}

// إعادة بناء الفلاتر بعد إضافة/تعديل
async function rebuildFilterOptions() {
  const current = { ...state.filters };
  await buildFilters();
  // استعد القيم المختارة
  filtersCont.querySelectorAll('select').forEach((s) => {
    if (current[s.dataset.key]) s.value = current[s.dataset.key];
  });
}

// ==================== EXCEL ====================
async function handleExport() {
  const res = await window.api.excelExport(state.searchQuery, state.filters);
  if (res.canceled) return;
  if (!res.success) { showMessage('فشل التصدير: ' + res.error, 'error'); return; }
  showMessage('تم تصدير ' + res.count + ' سجل إلى: ' + res.filePath, 'success', false);
}

async function handleImport() {
  const res = await window.api.excelImport();
  if (res.canceled) return;
  if (!res.success) { showMessage('فشل الاستيراد: ' + res.error, 'error'); return; }

  let msg = 'تم استيراد ' + res.added + ' موظف';
  if (res.skipped > 0) msg += ' | تم تجاهل ' + res.skipped + ' صف (مكرر أو فاضي)';
  if (res.errors && res.errors.length) msg += ' | أخطاء: ' + res.errors.length;

  showMessage(msg, res.added > 0 ? 'success' : 'warning', false);
  await refreshList();
  await loadDbInfo();
  await rebuildFilterOptions();
}
async function handleExportPdf(employeeId) {
  const res = await window.api.exportEmployeePdf(employeeId);
  if (res?.error) { showMessage('حدث خطأ: ' + res.error, 'error'); return; }
  if (res.canceled) return;
  showMessage('تم حفظ الملف في: ' + res.filePath, 'success', false);
}
async function handleTemplate() {
  const res = await window.api.excelTemplate();
  if (res.canceled) return;
  if (!res.success) { showMessage('فشل حفظ القالب: ' + res.error, 'error'); return; }
  showMessage('تم حفظ القالب في: ' + res.filePath, 'success', false);
}

// ==================== EVENTS ====================
function wireEvents() {
  $('#btn-add').addEventListener('click', openAddForm);
  $('#btn-export').addEventListener('click', handleExport);
  $('#btn-import').addEventListener('click', handleImport);
  $('#btn-template').addEventListener('click', handleTemplate);
  $('#btn-clear-filters').addEventListener('click', clearAllFilters);

  // بحث مع debounce
  let t = null;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(t);
    clearSearch.classList.toggle('visible', e.target.value.length > 0);
    t = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      refreshList();
    }, 300);
  });

  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearch.classList.remove('visible');
    refreshList();
  });

  // Table actions
  // tbody.addEventListener('click', (e) => {
  //   const btn = e.target.closest('button[data-action]');
  //   if (!btn) return;
  //   const id = Number(btn.dataset.id);
  //   const emp = state.employees.find((x) => x.id === id);
  //   if (!emp) return;
  //   if (btn.dataset.action === 'view') showDetails(emp);
  //   else if (btn.dataset.action === 'edit') openEditForm(emp);
  //   else if (btn.dataset.action === 'delete') confirmDelete(emp);
  // });
tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const emp = state.employees.find((x) => x.id === id);
  if (!emp) return;
  if (btn.dataset.action === 'view') showDetails(emp);
  else if (btn.dataset.action === 'edit') openEditForm(emp);
  else if (btn.dataset.action === 'delete') confirmDelete(emp);
  else if (btn.dataset.action === 'pdf') handleExportPdf(id);   // ← جديد
});
  // Form submit
  form.addEventListener('submit', handleFormSubmit);

  // Edit from details
  $('#btn-edit-from-details').addEventListener('click', () => {
    if (state.currentEmployee) {
      closeModal('modal-details');
      openEditForm(state.currentEmployee);
    }
  });

  // Confirm delete
  $('#btn-confirm-delete').addEventListener('click', handleConfirmDelete);

  // Close buttons
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Overlay click
  document.querySelectorAll('.modal-overlay').forEach((o) => {
    o.addEventListener('click', (e) => { if (e.target === o) o.classList.add('hidden'); });
  });

  // Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach((m) => m.classList.add('hidden'));
    }
  });
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  buildTableHead();
  buildForm();
  wireEvents();
  await buildFilters();
  await refreshList();
  await loadDbInfo();
});

// ============================================================

// ============================================================

// ============================================================
// PART 3 (v3): Evaluations — 3 columns, no letters in UI
// ============================================================
const EC = window.EVALUATION_CONFIG;

function buildEvalForm() {
  const tbody = document.getElementById('eval-items-body');
  if (!tbody) return;
  tbody.innerHTML = EC.evaluationItems.map((item) => {
    const cells = [];
    for (const ev of EC.evaluators) {
      cells.push(`<td class="col-${ev.key}"><input type="number" step="0.01" min="0" max="${item.max}" data-num="${item.key}_${ev.key}" class="eval-num-input" /></td>`);
      cells.push(`<td class="col-${ev.key}"><input type="text" data-txt="${item.key}_${ev.key}" class="eval-txt-input" placeholder="حروف" /></td>`);
    }
    return `<tr>
      <td>${esc(item.label)}</td>
      <td class="col-max">${item.max}</td>
      ${cells.join('')}
    </tr>`;
  }).join('');

  document.getElementById('eval-max-total').textContent = EC.maxTotal;

  tbody.querySelectorAll('input[data-num]').forEach((inp) => {
    inp.addEventListener('input', () => {
      autoCalcEval();
      updateFormStatus();
    });
  });
}

function autoCalcEval() {
  const scores = {};
  for (const item of EC.evaluationItems) {
    for (const ev of EC.evaluators) {
      const inp = document.querySelector(`#eval-items-body input[data-num="${item.key}_${ev.key}"]`);
      scores[`${item.key}_${ev.key}`] = inp && inp.value !== '' ? Number(inp.value) : 0;
    }
  }
  const totals = EC.calculateAllTotals(scores);
  document.getElementById('total_direct').value = totals.total_direct;
  document.getElementById('total_local').value  = totals.total_local;
  document.getElementById('total_top').value    = totals.total_top;
  document.getElementById('eval-rating').value  = EC.calculateRating(totals.total_direct);
}

function updateFormStatus() {
  const el = document.getElementById('eval-form-status');
  if (!el) return;
  const direct = document.getElementById('total_direct').value;
  const local  = document.getElementById('total_local').value;
  const top    = document.getElementById('total_top').value;
  const rating = document.getElementById('eval-rating').value;
  el.textContent = `مباشر: ${direct || 0} | محلي: ${local || 0} | أعلى: ${top || 0} | التقدير: ${rating || '—'}`;
}

function clearEvalForm() {
  document.getElementById('eval-id').value = '';
  document.getElementById('eval-employee-id').value = '';
  ['eval_year','period_from','period_to','total_direct','total_local','total_top','eval-rating',
   'committee_notes','penalties','initiatives','appreciation','notes'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('#eval-items-body input').forEach((inp) => { inp.value = ''; });
  updateFormStatus();
}

function fillEvalForm(ev) {
  document.getElementById('eval-id').value = ev.id;
  document.getElementById('eval-employee-id').value = ev.employee_id;
  document.getElementById('eval_year').value = ev.eval_year || '';
  document.getElementById('period_from').value = ev.period_from || '';
  document.getElementById('period_to').value = ev.period_to || '';
  document.getElementById('total_direct').value = ev.total_direct ?? '';
  document.getElementById('total_local').value  = ev.total_local ?? '';
  document.getElementById('total_top').value    = ev.total_top ?? '';
  document.getElementById('eval-rating').value  = ev.rating || '';
  document.getElementById('committee_notes').value = ev.committee_notes || '';
  document.getElementById('penalties').value = ev.penalties || '';
  document.getElementById('initiatives').value = ev.initiatives || '';
  document.getElementById('appreciation').value = ev.appreciation || '';
  document.getElementById('notes').value = ev.notes || '';

  for (const item of EC.evaluationItems) {
    for (const ev2 of EC.evaluators) {
      const numInp = document.querySelector(`#eval-items-body input[data-num="${item.key}_${ev2.key}"]`);
      if (numInp) numInp.value = ev[`${item.key}_${ev2.key}_num`] ?? '';
      const txtInp = document.querySelector(`#eval-items-body input[data-txt="${item.key}_${ev2.key}"]`);
      if (txtInp) txtInp.value = ev[`${item.key}_${ev2.key}_txt`] ?? '';
    }
  }
  updateFormStatus();
}

function collectEvalForm() {
  const data = {
    employee_id: Number(document.getElementById('eval-employee-id').value),
    eval_year: document.getElementById('eval_year').value,
    period_from: document.getElementById('period_from').value,
    period_to: document.getElementById('period_to').value,
    total_direct: document.getElementById('total_direct').value,
    total_local:  document.getElementById('total_local').value,
    total_top:    document.getElementById('total_top').value,
    rating: document.getElementById('eval-rating').value,
    committee_notes: document.getElementById('committee_notes').value,
    penalties: document.getElementById('penalties').value,
    initiatives: document.getElementById('initiatives').value,
    appreciation: document.getElementById('appreciation').value,
    notes: document.getElementById('notes').value,
  };
  for (const item of EC.evaluationItems) {
    for (const ev of EC.evaluators) {
      const numInp = document.querySelector(`#eval-items-body input[data-num="${item.key}_${ev.key}"]`);
      data[`${item.key}_${ev.key}_num`] = numInp ? numInp.value : '';
      const txtInp = document.querySelector(`#eval-items-body input[data-txt="${item.key}_${ev.key}"]`);
      data[`${item.key}_${ev.key}_txt`] = txtInp && txtInp.value.trim() !== '' ? txtInp.value.trim() : null;
    }
  }
  return data;
}

// ==== جدول تفصيلي لكل تقييم (بند × 3 مقيّمين × 2 عمود: أرقام/حروف) ====
// function buildEvalDetailTable(ev) {
//   const rows = EC.evaluationItems.map((item) => {
//     const cells = EC.evaluators.map((evltr) => {
//       const num = ev[`${item.key}_${evltr.key}_num`];
//       const txt = ev[`${item.key}_${evltr.key}_txt`];
//       const numDisplay = (num !== null && num !== undefined && num !== '') ? esc(num) : '—';
//       const txtDisplay = (txt !== null && txt !== undefined && txt !== '') ? esc(txt) : '—';
//       return '<td class="col-' + evltr.key + '">' + numDisplay + '</td>' +
//              '<td class="col-' + evltr.key + '">' + txtDisplay + '</td>';
//     }).join('');
//     return '<tr><td class="eval-item-label">' + esc(item.label) + '</td>' +
//       '<td class="col-max">' + item.max + '</td>' + cells + '</tr>';
//   }).join('');

//   const groupHeaders = EC.evaluators.map((e) =>
//     '<th class="col-' + e.key + '" colspan="2">' + esc(e.label) + '</th>'
//   ).join('');
//   const subHeaders = EC.evaluators.map((e) =>
//     '<th class="col-' + e.key + ' sub-head">أرقام</th><th class="col-' + e.key + ' sub-head">حروف</th>'
//   ).join('');

//   const totalsRow = '<tr class="eval-totals-row">' +
//     '<td><strong>الإجمالي</strong></td>' +
//     '<td class="col-max">' + EC.maxTotal + '</td>' +
//     '<td colspan="2">' + (ev.total_direct ?? '—') + '</td>' +
//     '<td colspan="2">' + (ev.total_local ?? '—') + '</td>' +
//     '<td colspan="2">' + (ev.total_top ?? '—') + '</td>' +
//     '</tr>';

//   return '<table class="eval-detail-table">' +
//     '<thead>' +
//       '<tr><th rowspan="2">البند</th><th rowspan="2">الحد الأقصى</th>' + groupHeaders + '</tr>' +
//       '<tr>' + subHeaders + '</tr>' +
//     '</thead>' +
//     '<tbody>' + rows + totalsRow + '</tbody></table>';
// }

function buildEvalDetailTable(ev) {
  const rows = EC.evaluationItems
    .map((item, index) => {
      const isNewGroup =
        index === 0 ||
        item.group !== EC.evaluationItems[index - 1].group;

      const groupRow = isNewGroup && item.group
        ? '<tr class="eval-group-row">' +
            '<td colspan="' + (2 + EC.evaluators.length * 2) + '">' +
              esc(item.group) +
            '</td>' +
          '</tr>'
        : '';

      const cells = EC.evaluators
        .map((evltr) => {
          const num = ev[`${item.key}_${evltr.key}_num`];
          const txt = ev[`${item.key}_${evltr.key}_txt`];

          const numDisplay =
            num !== null && num !== undefined && num !== ''
              ? esc(num)
              : '—';

          const txtDisplay =
            txt !== null && txt !== undefined && txt !== ''
              ? esc(txt)
              : '—';

          return (
            '<td class="col-' + evltr.key + '">' + numDisplay + '</td>' +
            '<td class="col-' + evltr.key + '">' + txtDisplay + '</td>'
          );
        })
        .join('');

      const itemRow =
        '<tr>' +
          '<td class="eval-item-label">' + esc(item.label) + '</td>' +
          '<td class="col-max">' + item.max + '</td>' +
          cells +
        '</tr>';

      return groupRow + itemRow;
    })
    .join('');

  const groupHeaders = EC.evaluators
    .map((e) =>
      '<th class="col-' + e.key + '" colspan="2">' +
        esc(e.label) +
      '</th>'
    )
    .join('');

  const subHeaders = EC.evaluators
    .map((e) =>
      '<th class="col-' + e.key + ' sub-head">أرقام</th>' +
      '<th class="col-' + e.key + ' sub-head">حروف</th>'
    )
    .join('');

  const totalsRow =
    '<tr class="eval-totals-row">' +
      '<td><strong>الإجمالي</strong></td>' +
      '<td class="col-max">' + EC.maxTotal + '</td>' +
      '<td colspan="2">' + (ev.total_direct ?? '—') + '</td>' +
      '<td colspan="2">' + (ev.total_local ?? '—') + '</td>' +
      '<td colspan="2">' + (ev.total_top ?? '—') + '</td>' +
    '</tr>';

  return (
    '<table class="eval-detail-table">' +
      '<thead>' +
        '<tr>' +
          '<th rowspan="2">البند</th>' +
          '<th rowspan="2">الحد الأقصى</th>' +
          groupHeaders +
        '</tr>' +
        '<tr>' + subHeaders + '</tr>' +
      '</thead>' +
      '<tbody>' +
        rows +
        totalsRow +
      '</tbody>' +
    '</table>'
  );
}



function buildEvalExtraInfo(ev) {
  const items = [
    ['الفترة', (ev.period_from || '—') + ' إلى ' + (ev.period_to || '—')],
    ['الجزاءات', ev.penalties],
    ['المبادرات', ev.initiatives],
    ['التقدير/الشكر', ev.appreciation],
    ['ملاحظات اللجنة', ev.committee_notes],
    ['ملاحظات', ev.notes],
  ];
  return items
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(([label, v]) => '<div class="eval-extra-row"><strong>' + esc(label) + ':</strong> ' + esc(v) + '</div>')
    .join('');
}

async function renderEvalsList(employeeId) {
  const container = document.getElementById('evals-container');
  if (!container) return;
  const res = await window.api.evalList(employeeId);
  if (!res.success) {
    container.innerHTML = '<div class="eval-empty">فشل التحميل: ' + esc(res.error) + '</div>';
    return;
  }
  const list = res.data;
  let html = '';
  if (list.length === 0) {
    html += '<div class="eval-empty">لا توجد تقييمات بعد</div>';
  } else {
    html += '<div class="eval-list">' + list.map((ev) => `
      <div class="eval-card eval-card-detailed">
        <div class="eval-card-header">
          <span><strong>السنة:</strong> ${esc(ev.eval_year) || '—'}</span>
          <span>${ev.rating ? '<span class="badge badge-good">' + esc(ev.rating) + '</span>' : '—'}</span>
          <div class="eval-card-actions">
            <button class="btn btn-outline btn-sm" data-eval-action="edit" data-eval-id="${ev.id}">تعديل</button>
            <button class="btn btn-danger btn-sm" data-eval-action="delete" data-eval-id="${ev.id}">حذف</button>
          </div>
        </div>
        ${buildEvalDetailTable(ev)}
        <div class="eval-extra-info">${buildEvalExtraInfo(ev)}</div>
      </div>
    `).join('') + '</div>';
  }
  html += '<button class="btn btn-primary btn-add-eval" id="btn-add-eval">+ إضافة تقييم</button>';
  container.innerHTML = html;

  document.getElementById('btn-add-eval').addEventListener('click', () => {
    clearEvalForm();
    document.getElementById('eval-employee-id').value = employeeId;
    document.getElementById('eval-modal-title').textContent = 'إضافة تقييم';
    openModal('modal-eval');
  });

  container.querySelectorAll('button[data-eval-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.evalId);
      if (btn.dataset.evalAction === 'edit') {
        const r = await window.api.evalGet(id);
        if (!r.success) { showMessage(r.error, 'error'); return; }
        fillEvalForm(r.data);
        document.getElementById('eval-modal-title').textContent = 'تعديل تقييم';
        openModal('modal-eval');
      } else if (btn.dataset.evalAction === 'delete') {
        if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
        const r = await window.api.evalRemove(id);
        if (!r.success) { showMessage(r.error, 'error'); return; }
        showMessage('تم حذف التقييم', 'success');
        await renderEvalsList(employeeId);
      }
    });
  });
}

// ------- Override showDetails -------
window.showDetails = async function(emp) {
  state.currentEmployee = emp;
  const groups = [
    { title: 'بيانات الموظف', keys: ['name','national_id','birth_date','qualification','job_title','grade','grade_date','administration','school','directorate','education_directorate',
  'education_administration',
  'education_level',
  'school_name','phone','address','status'] },
    { title: 'بيانات التقييم (القديمة)', keys: ['eval_period_from','eval_period_to','eval_year','eval_total_score','eval_rating'] },
  ];

  let html = '';
  for (const g of groups) {
    html += '<div class="section-title">' + esc(g.title) + '</div>';
    for (const key of g.keys) {
      const label = labelMap[key] || key;
      const val = emp[key];
      let display = '—';
      if (val !== null && val !== undefined && val !== '') display = esc(val);
      html += '<dt>' + esc(label) + '</dt><dd>' + display + '</dd>';
    }
  }

  html += '<div class="section-title" style="grid-column: 1 / -1;">التقييمات</div>';
  html += '<div id="evals-container" style="grid-column: 1 / -1;"></div>';

  document.getElementById('details-content').innerHTML = html;
  openModal('modal-details');
  await renderEvalsList(emp.id);
};

// ------- Eval submit -------
async function handleEvalSubmit(e) {
  e.preventDefault();
  const data = collectEvalForm();
  if (!data.employee_id) { showMessage('اختر موظف', 'error'); return; }

  const statusEl = document.getElementById('eval-form-status');
  if (statusEl) statusEl.textContent = 'جاري الحفظ...';

  const id = document.getElementById('eval-id').value;
  let res = id ? await window.api.evalUpdate(Number(id), data) : await window.api.evalCreate(data);

  if (!res.success) {
    showMessage(res.error, 'error');
    if (statusEl) statusEl.textContent = 'فشل الحفظ';
    return;
  }
  closeModal('modal-eval');
  showMessage(id ? 'تم تعديل التقييم' : 'تم إضافة التقييم', 'success');
  if (state.currentEmployee) await renderEvalsList(state.currentEmployee.id);
}

// ------- Init -------
document.addEventListener('DOMContentLoaded', () => {
  if (typeof EC === 'undefined') { console.error('evaluation-config-bundle.js not loaded'); return; }
  buildEvalForm();
  updateFormStatus();
  const evalForm = document.getElementById('eval-form');
  if (evalForm) evalForm.addEventListener('submit', handleEvalSubmit);
  const recalcBtn = document.getElementById('btn-recalc');
  if (recalcBtn) recalcBtn.addEventListener('click', () => { autoCalcEval(); updateFormStatus(); });

  ['total_direct','total_local','total_top','eval-rating'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateFormStatus);
  });
});