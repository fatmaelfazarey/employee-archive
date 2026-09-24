/**
 * ============================================================
 *  إعدادات نظام التقييمات — 3 أعمدة
 * ============================================================
 *  لكل بند: الرئيس المباشر + المدير المحلي + الرئيس الأعلى
 *  كل عمود بيتجمع لوحده
 */

// البنود — الحد الأقصى لكل بند (والحد الأقصى للمجموع = 100)
const evaluationItems = [
  {
    key: 'work_quantity',
    label: 'كمية العمل',
    max: 15,
    group: 'أولاً: أداء العمل ومستواه',
  },
  {
    key: 'work_quality',
    label: 'درجة إتقان العمل',
    max: 15,
    group: 'أولاً: أداء العمل ومستواه',
  },

  {
    key: 'improvement',
    label: 'درجة مشاركته في تحسين مستوى أداء العمل',
    max: 20,
    group: 'ثانيًا: القدرات الإدارية والفنية',
  },
  {
    key: 'followup',
    label: 'درجة متابعة أداء المعلمين',
    max: 10,
    group: 'ثانيًا: القدرات الإدارية والفنية',
  },
  {
    key: 'leadership',
    label: 'القدرة على القيادة والتوجيه',
    max: 10,
    group: 'ثانيًا: القدرات الإدارية والفنية',
  },
  {
    key: 'qualifications',
    label: 'الشهادات والدرجات العلمية والدورات التدريبية',
    max: 10,
    group: 'ثانيًا: القدرات الإدارية والفنية',
  },

  {
    key: 'behavior',
    label: 'سلوكياته مع إدارة المدرسة والإدارة التعليمية',
    max: 10,
    group: 'ثالثًا: المهارات السلوكية',
  },
  {
    key: 'discipline',
    label: 'الانضباط في العمل',
    max: 10,
    group: 'ثالثًا: المهارات السلوكية',
  },
];
const maxTotal = evaluationItems.reduce((s, it) => s + it.max, 0); // 100

// الأعمدة الثلاثة
const evaluators = [
  { key: 'direct', label: 'الرئيس المباشر' },
  { key: 'local', label: 'المدير المحلي' },
  { key: 'top', label: 'الرئيس الأعلى' },
];

// قواعد مرتبة التقدير (مبنية على total_direct افتراضيًا — المستخدم يقدر يعدّل)
const ratingRules = [
  { min: 90, label: 'كـــــــفء' },
  { min: 80, label: 'جيد جدًا' },
  { min: 65, label: 'جيد' },
  { min: 50, label: 'مقبول' },
  { min: 0, label: 'ضعيف' },
];

function calculateRating(total) {
  if (total === null || total === undefined || isNaN(total)) return '';
  const n = Number(total);
  for (const rule of ratingRules) if (n >= rule.min) return rule.label;
  return '';
}

// احسب مجموع عمود واحد
function calculateColumn(scores, evaluatorKey) {
  let sum = 0;
  for (const item of evaluationItems) {
    const v = Number(scores[`${item.key}_${evaluatorKey}`]);
    if (!isNaN(v)) sum += v;
  }
  return sum;
}

// احسب المجاميع الثلاثة
function calculateAllTotals(scores) {
  return {
    total_direct: calculateColumn(scores, 'direct'),
    total_local: calculateColumn(scores, 'local'),
    total_top: calculateColumn(scores, 'top'),
  };
}

module.exports = {
  evaluationItems,
  evaluators,
  maxTotal,
  ratingRules,
  calculateRating,
  calculateColumn,
  calculateAllTotals,
};