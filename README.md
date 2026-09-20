# نظام أرشيف الموظفين

نظام أرشيف عربي لتخزين بيانات الموظفين وتقييماتهم، مع بحث وفلترة واستيراد/تصدير Excel.

## التشغيل السريع

    npm install
    npm start

## البناء للويندوز

    npm run build:win

الناتج: dist/EmployeeSystem.exe

## مكان قاعدة البيانات

- في وضع التطوير: database/employees.db
- في النسخة المحمولة: بجانب الملف التنفيذي

## إضافة حقل جديد

كل الحقول معرّفة في ملف واحد فقط: src/shared/fields.js

أضف object جديد في المصفوفة، وبعدها:

- في وضع التطوير: النظام هيضيف العمود تلقائيًا (migration)
- هتلاقي الحقل ظهر في الفورم والجدول والفلاتر والإكسل

بعد التعديل، شغّل:

    npm run sync:fields

لتحديث نسخة الحقول في الواجهة.

## مكوّنات المشروع

- src/shared/fields.js — تعريف كل الحقول (مصدر واحد للحقيقة)
- src/main/database.js — فتح SQLite + migrations
- src/main/excel.js — استيراد/تصدير Excel
- src/main/ipc.js — قنوات IPC
- src/renderer/ — الواجهة (HTML/CSS/JS خام)

## ملاحظات USB

- استخدم "إخراج آمن" قبل فصل الـ USB
- خذ نسخة احتياطية من employees.db
- التطبيق يفعّل synchronous=FULL لتقليل خطر التلف
