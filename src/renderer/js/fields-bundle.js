// auto-generated from src/shared/fields.js
(function() {
  const module = { exports: {} };
  const exports = module.exports;
/**
 * ============================================================
 *  المصدر الوحيد للحقيقة لكل الحقول
 * ============================================================
 *
 *  لإضافة حقل جديد:
 *  1. أضف object جديد في المصفوفة fields تحت
 *  2. احفظ الملف
 *  3. شغّل التطبيق — النظام هيضيف العمود للجدول لوحده
 *
 *  شرح الخصائص:
 *    key         : اسم الحقل في قاعدة البيانات (إنجليزي، بدون مسافات)
 *    label       : الاسم اللي يظهر للمستخدم (عربي)
 *    type        : text | number | date | select | textarea
 *    inTable     : يظهر في جدول القائمة؟
 *    inForm      : يظهر في فورم الإضافة/التعديل؟
 *    filterable  : يظهر كفلتر في شريط الفلاتر؟
 *    required    : مطلوب في الفورم؟
 *    options     : لو type = select، الخيارات المتاحة
 *    default     : القيمة الافتراضية
 *    width       : عرض العمود في الجدول (px، اختياري)
 */

const fields = [
  // ========== بيانات الموظف ==========
  {
    key: 'name',
    label: 'الاسم',
    type: 'text',
    inTable: true,
    inForm: true,
    filterable: false,
    required: true,
    width: 200,
  },
  {
    key: 'national_id',
    label: 'الرقم القومي',
    type: 'text',
    inTable: true,
    inForm: true,
    filterable: false,
    required: false,
    unique: true,
    width: 140,
  },
  {
    key: 'birth_date',
    label: 'تاريخ الميلاد',
    type: 'date',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'qualification',
    label: 'المؤهل الدراسي',
    type: 'text',
    inTable: true,
    inForm: true,
    filterable: false,
    required: false,
    width: 140,
  },
  {
    key: 'job_title',
    label: 'الوظيفة',
    type: 'text',
    inTable: true,
    inForm: true,
    filterable: true,
    required: false,
    width: 140,
  },
  {
    key: 'grade',
    label: 'الدرجة',
    type: 'text',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'grade_date',
    label: 'تاريخ الدرجة',
    type: 'date',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'administration',
    label: 'الإدارة',
    type: 'text',
    inTable: true,
    inForm: true,
    filterable: true,
    required: false,
    width: 150,
  },
  {
    key: 'school',
    label: 'المدرسة',
    type: 'text',
    inTable: true,
    inForm: true,
    filterable: true,
    required: false,
    width: 150,
  },
  {
    key: 'directorate',
    label: 'المديرية',
    type: 'text',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'education_level',
    label: 'التعليم',
    type: 'select',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
    options: ['', 'ابتدائي', 'إعدادي', 'ثانوي', 'فني', 'أخرى'],
  },
  {
    key: 'phone',
    label: 'الهاتف',
    type: 'text',
    inTable: true,
    inForm: true,
    filterable: false,
    required: false,
    width: 120,
  },
  {
    key: 'address',
    label: 'العنوان',
    type: 'textarea',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'status',
    label: 'الحالة',
    type: 'select',
    inTable: true,
    inForm: true,
    filterable: true,
    required: false,
    options: ['نشط', 'غير نشط'],
    default: 'نشط',
    width: 90,
  },

  // ========== بيانات التقييم ==========
  {
    key: 'eval_period_from',
    label: 'فترة التقييم من',
    type: 'date',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'eval_period_to',
    label: 'فترة التقييم إلى',
    type: 'date',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'eval_year',
    label: 'سنة التقييم',
    type: 'text',
    inTable: true,
    inForm: true,
    filterable: true,
    required: false,
    width: 100,
  },
  {
    key: 'eval_total_score',
    label: 'مجموع الدرجات',
    type: 'number',
    inTable: true,
    inForm: true,
    filterable: false,
    required: false,
    width: 100,
  },
  {
    key: 'eval_rating',
    label: 'مرتبة التقدير',
    type: 'select',
    inTable: true,
    inForm: true,
    filterable: true,
    required: false,
    options: ['', 'ممتاز', 'جيد جدًا', 'جيد', 'مقبول', 'ضعيف'],
    width: 110,
  },
  {
    key: 'eval_penalties',
    label: 'الجزاءات التأديبية',
    type: 'textarea',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'eval_initiatives',
    label: 'الأعمال المبادرة',
    type: 'textarea',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'eval_appreciation',
    label: 'التقدير المادي والأدبي',
    type: 'textarea',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
  {
    key: 'eval_notes',
    label: 'ملاحظات',
    type: 'textarea',
    inTable: false,
    inForm: true,
    filterable: false,
    required: false,
  },
];

// الحقول اللي تظهر في الجدول
const tableFields = fields.filter((f) => f.inTable);

// الحقول اللي تظهر في الفورم
const formFields = fields.filter((f) => f.inForm);

// الحقول اللي تظهر كفلاتر
const filterFields = fields.filter((f) => f.filterable);

// أسماء الحقول فقط (للـ SQL)
const allKeys = fields.map((f) => f.key);

// الحقول المطلوبة
const requiredKeys = fields.filter((f) => f.required).map((f) => f.key);

// الحقول الفريدة
const uniqueKeys = fields.filter((f) => f.unique).map((f) => f.key);

// خريطة key -> label
const labelMap = {};
fields.forEach((f) => { labelMap[f.key] = f.label; });

// خريطة key -> type
const typeMap = {};
fields.forEach((f) => { typeMap[f.key] = f.type; });

module.exports = {
  fields,
  tableFields,
  formFields,
  filterFields,
  allKeys,
  requiredKeys,
  uniqueKeys,
  labelMap,
  typeMap,
};

  window.FIELDS_MODULE = module.exports;
})();