const path = require('path');
const os = require('os');
const fs = require('fs');
const { BrowserWindow, dialog } = require('electron');
const { getDb } = require('./database'); // عدّل المسار لو الملف مش في نفس الفولدر
const { evaluationItems, evaluators } = require('../shared/evaluation-config');

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
const ratingRules = [
  { min: 90, label: 'كـــــــفء' },
  { min: 80, label: 'جيد جدًا' },
  { min: 65, label: 'جيد' },
  { min: 50, label: 'مقبول' },
  { min: 0, label: 'ضعيف' },
];

// بيدور على أول قاعدة الـ total بتحققها (لازم ratingRules تكون مترتبة من الأعلى للأقل)
function calculateRatingLabel(total) {
  const n = Number(total);
  if (Number.isNaN(n)) return '';
  const rule = ratingRules.find((r) => n >= r.min);
  return rule ? rule.label : '';
}
// بيبني أجزاء جدول "قياس كفاية الأداء" من evaluationItems/evaluators
// الموجودين أصلاً في shared/evaluation-config.js (مفيش أي أسماء متسحبة يدوي)
// function buildEvalTableParts(evalRow) {
//   const evaluatorHeaders = evaluators
//     .map((ev) => `<th colspan="2">${esc(ev.label)}</th>`)
//     .join('');

//   const evaluatorSubheaders = evaluators
//     .map(() => `<th>أرقام</th><th>حروف</th>`)
//     .join('');

//   const rows = evaluationItems
//     .map((item) => {
//       const cells = evaluators
//         .map((ev) => {
//           const num = evalRow ? evalRow[`${item.key}_${ev.key}_num`] : '';
//           const txt = evalRow ? evalRow[`${item.key}_${ev.key}_txt`] : '';
//           return `<td>${esc(num)}</td><td>${esc(txt)}</td>`;
//         })
//         .join('');
//       return `<tr><td class="item-label">${esc(item.label)}</td><td>${esc(
//         item.max ?? ''
//       )}</td>${cells}</tr>`;
//     })
//     .join('\n');

//   const totalCells = evaluators
//     .map((ev) => {
//       const val = evalRow ? evalRow[`total_${ev.key}`] : '';
//       return `<td colspan="2">${esc(val)}</td>`;
//     })
//     .join('');

//   return { evaluatorHeaders, evaluatorSubheaders, rows, totalCells };
// }


function buildEvalTableParts(evalRow) {
  const evaluatorHeaders = evaluators
    .map((ev) => `<th colspan="2">${esc(ev.label)}</th>`)
    .join('');

  const evaluatorSubheaders = evaluators
    .map(() => `<th>أرقام</th><th>حروف</th>`)
    .join('');

  const rows = evaluationItems
    .map((item, index) => {
      // يظهر عنوان الجروب فقط عند بداية كل مجموعة
      const isNewGroup =
        index === 0 ||
        item.group !== evaluationItems[index - 1].group;

      const groupRow =
        isNewGroup && item.group
          ? `
            <tr class="eval-group-row">
              <td colspan="${2 + evaluators.length * 2}">
                ${esc(item.group)}
              </td>
            </tr>
          `
          : '';

      const cells = evaluators
        .map((ev) => {
          const num = evalRow
            ? evalRow[`${item.key}_${ev.key}_num`]
            : '';

          const txt = evalRow
            ? evalRow[`${item.key}_${ev.key}_txt`]
            : '';

          return `<td>${esc(num)}</td><td>${esc(txt)}</td>`;
        })
        .join('');

      const itemRow = `
        <tr>
          <td class="item-label">${esc(item.label)}</td>
          <td>${esc(item.max ?? '')}</td>
          ${cells}
        </tr>
      `;

      return groupRow + itemRow;
    })
    .join('\n');

  const totalCells = evaluators
    .map((ev) => {
      const val = evalRow
        ? evalRow[`total_${ev.key}`]
        : '';

      return `<td colspan="2">${esc(val)}</td>`;
    })
    .join('');

  return {
    evaluatorHeaders,
    evaluatorSubheaders,
    rows,
    totalCells,
  };
}
/**
 * @param {number} employeeId
 * @returns {Promise<{canceled:boolean, filePath?:string}>}
 */
async function exportEmployeePdf(employeeId) {
  const db = getDb();

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
  if (!employee) throw new Error('الموظف غير موجود');

  const evalRow = db
    .prepare('SELECT * FROM evaluations WHERE employee_id = ? ORDER BY id DESC LIMIT 1')
    .get(employeeId);

  const data = { ...employee, ...(evalRow || {}) };
  const DOTS = '.'.repeat(150);
  for (const key of ['penalties', 'initiatives', 'appreciation']) {
    if (!data[key] || String(data[key]).trim() === '') data[key] = DOTS;
  }
    // eval_rating: استخدم عمود rating لو محفوظ بالفعل، وإلا احسبه من total_direct
  data.eval_rating =
    data.rating && String(data.rating).trim() !== ''
      ? data.rating
      : calculateRatingLabel(data.total_direct);
  // عدّل المسار ده لو نقلت ملف employee-pdf.html لمكان تاني
  const templatePath = path.join(__dirname, '..', 'renderer', 'html', 'employee-pdf.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const { evaluatorHeaders, evaluatorSubheaders, rows, totalCells } = buildEvalTableParts(evalRow);
  html = html
    .replace('<!--EVALUATOR_HEADERS-->', evaluatorHeaders)
    .replace('<!--EVALUATOR_SUBHEADERS-->', evaluatorSubheaders)
    .replace('<!--EVAL_ROWS-->', rows)
    .replace('<!--TOTAL_CELLS-->', totalCells);

  // استبدال أي {{field}} بقيمته من الموظف/التقييم (لازم أسماء الحقول تطابق أعمدة الجدولين)
  html = html.replace(/{{(\w+)}}/g, (_, key) => esc(data[key]));

  const tmpFile = path.join(os.tmpdir(), `employee-${employeeId}-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf8');

  const win = new BrowserWindow({ show: false });
  try {
    await win.loadFile(tmpFile);

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'none' }, // الهوامش متحكم فيها من CSS @page
    });

    const defaultName = `${(employee.name || 'موظف').replace(/\s+/g, '_')}.pdf`;
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'حفظ ملف PDF',
      defaultPath: defaultName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (canceled || !filePath) return { canceled: true };

    fs.writeFileSync(filePath, pdfBuffer);
    return { canceled: false, filePath };
  } finally {
    win.close();
    fs.unlinkSync(tmpFile);
  }
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
module.exports = { exportEmployeePdf };