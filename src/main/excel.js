const ExcelJS = require('exceljs');
const { fields, allKeys, labelMap, typeMap } = require('../shared/fields');
const { getDb } = require('./database');

/**
 * تصدير قائمة الموظفين لملف Excel
 */
async function exportToExcel(employees, filePath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Employee System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('الموظفين', {
    views: [{ rightToLeft: true }],
  });

  // Header row
  sheet.columns = fields.map((f) => ({
    header: f.label,
    key: f.key,
    width: f.width ? f.width / 7 : 20,
  }));

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  // Rows
  for (const emp of employees) {
    const rowData = {};
    for (const f of fields) {
      rowData[f.key] = emp[f.key] !== null && emp[f.key] !== undefined ? emp[f.key] : '';
    }
    sheet.addRow(rowData);
  }

  // Borders
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
  });

  await workbook.xlsx.writeFile(filePath);
  return { success: true, count: employees.length };
}

/**
 * استيراد موظفين من ملف Excel
 * - الصف الأول = عناوين الأعمدة (بالعربي، نفس labels)
 * - يضيف موظفين جداد فقط
 * - يتجاهل المكرر بالرقم القومي (لو موجود)
 */
async function importFromExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { success: false, error: 'الملف لا يحتوي على أي ورقة' };
  }

  // اقرأ صف العناوين
  const headerRow = sheet.getRow(1);
  const headerLabels = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headerLabels[colNumber] = String(cell.value || '').trim();
  });

  // اربط كل عنوان عربي بالـ key
  const colToKey = {};
  for (let i = 1; i < headerLabels.length; i++) {
    const label = headerLabels[i];
    if (!label) continue;
    const field = fields.find((f) => f.label === label);
    if (field) {
      colToKey[i] = field.key;
    }
  }

  if (Object.keys(colToKey).length === 0) {
    return {
      success: false,
      error: 'لم يتم التعرف على أي عمود. تأكد أن عناوين الأعمدة مطابقة للحقول (مثل: الاسم، الرقم القومي، ...)',
    };
  }

  const db = getDb();
  const insertStmt = db.prepare(`
    INSERT INTO employees (${allKeys.join(', ')})
    VALUES (${allKeys.map((k) => '@' + k).join(', ')})
  `);

  const selectByNatId = db.prepare(
    'SELECT id FROM employees WHERE national_id = ?'
  );

  let added = 0;
  let skipped = 0;
  const errors = [];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      const data = {};
      for (const key of allKeys) data[key] = null;

      for (const [colNum, key] of Object.entries(colToKey)) {
        let value = row[colNum];
        if (value === undefined || value === null) continue;

        // ExcelJS بيرجع objects للتواريخ
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        } else if (typeof value === 'object' && value.text) {
          value = value.text;
        } else {
          value = String(value).trim();
        }

        data[key] = value;
      }

      // تجاهل الصفوف الفاضية
      if (!data.name) { skipped++; continue; }

      // تجاهل المكرر بالرقم القومي
      if (data.national_id) {
        const existing = selectByNatId.get(data.national_id);
        if (existing) { skipped++; continue; }
      }

      // تأكد إن الحقول الرقمية أرقام
      if (data.eval_total_score) {
        const n = Number(data.eval_total_score);
        data.eval_total_score = isNaN(n) ? null : n;
      }

      try {
        insertStmt.run(data);
        added++;
      } catch (err) {
        errors.push(`صف ${added + skipped + 1}: ${err.message}`);
      }
    }
  });

  // اجمع كل الصفوف
  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // تخطى العناوين
    const arr = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      arr[colNumber] = cell.value;
    });
    rows.push(arr);
  });

  insertMany(rows);

  return {
    success: true,
    added,
    skipped,
    errors: errors.slice(0, 10),
  };
}

module.exports = { exportToExcel, importFromExcel };
