# المنصة التعليمية — Owner / Teacher / Parent Platform

منصة تعليمية كاملة: مالك نظام يدير المعلمين وأولياء الأمور، معلمين ينشئون تقارير للطلاب مع ملفات مرفقة (PDF/Word/PPT/فيديو)، وأولياء أمور يشوفوا تقارير أبنائهم بأمان.

## البنية

```
edu-platform/
├── backend/     → NestJS + Prisma + PostgreSQL
└── frontend/    → React + TypeScript + Vite + Tailwind
```

---

## 0) الطريقة السريعة — سكريبت أتمتة كامل

بدل ما تعمل كل خطوات التثبيت يدويًا، فيه سكريبت واحد بيعمل كل حاجة (تثبيت الحزم، ملفات `.env`، بناء المشروع، تجهيز git، ودفعه لـ GitHub لو حبيت):

```bash
# macOS / Linux
chmod +x scripts/setup.sh && ./scripts/setup.sh

# Windows (PowerShell)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup.ps1
```

التفاصيل الكاملة وأي تحذيرات في [`scripts/README.md`](scripts/README.md). السكريبت مش هيعمل حاجة خطيرة (زي migration على قاعدة بيانات حقيقية أو إنشاء repo على GitHub) من غير ما يسألك أول.

---

## 1) تشغيل الـ Backend (يدويًا)

### المتطلبات
- Node.js 18+
- قاعدة بيانات PostgreSQL (محلية أو مستضافة زي [Neon](https://neon.tech) أو [Supabase](https://supabase.com) — كلاهما فيه خطة مجانية)
- حساب Cloudflare R2 (أو AWS S3) لتخزين الملفات

### الخطوات

```bash
cd backend
npm install
cp .env.example .env
```

عدّل ملف `.env` وحط فيه:
- `DATABASE_URL`: رابط قاعدة البيانات بتاعتك
- `JWT_SECRET`: نص عشوائي طويل (استخدم `openssl rand -hex 32`)
- `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET`: بيانات Cloudflare R2

```bash
# إنشاء الجداول في قاعدة البيانات
npm run prisma:migrate

# إنشاء أول مدرسة + أول حساب مالك لها
npm run seed -- --school="مدرسة النور" --email="owner@noor.com" --password="ChangeMe123!"

# تشغيل السيرفر (وضع التطوير)
npm run start:dev
```

السيرفر هيشتغل على `http://localhost:4000/api`

**لإضافة مدرسة ثانية (tenant جديد) على نفس المنصة:**
```bash
npm run seed -- --school="مدرسة الأمل" --email="owner@amal.com" --password="AnotherPass123!"
```
كل مدرسة معزولة تمامًا عن التانية — المستخدمون، الطلاب، التقارير، والملفات كلها مقيّدة بـ `schoolId` على مستوى كل استعلام وكل route guard، فمالك مدرسة النور مينفعش يشوف ولا حرف من بيانات مدرسة الأمل حتى لو حاول يعدّل الـ URL يدويًا.

**مهم:** بعد أول تسجيل دخول بحساب المالك، لازم:
1. تغيّر الباسورد فورًا (لسه مفيش endpoint لتغيير الباسورد الذاتي — أضفه قبل الإنتاج، أو استخدم Prisma Studio مؤقتًا: `npm run prisma:studio`)
2. تفعّل الـ 2FA عبر `/auth/2fa/generate` ثم `/auth/2fa/confirm`

### إعداد قاعدة البيانات — Neon أو Supabase (خطوة بخطوة)

**الخيار أ: Neon (أبسط)**
1. روح [neon.tech](https://neon.tech) → سجّل حساب مجاني
2. "Create a project" → اختار اسم ومنطقة قريبة جغرافيًا
3. هتاخد connection string جاهز شكله:
   `postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/dbname?sslmode=require`
4. حطه في `DATABASE_URL` بملف `backend/.env`
5. Neon فيه نسخ احتياطي تلقائي (point-in-time restore) حتى في الخطة المجانية

**الخيار ب: Supabase**
1. روح [supabase.com](https://supabase.com) → "New Project"
2. اختار اسم، باسورد لقاعدة البيانات (احفظه)، والمنطقة
3. من Settings → Database → انسخ "Connection string" (اختار URI مش Session pooler)
4. حطه في `DATABASE_URL`

بعد أي منهم:
```bash
cd backend
npm run prisma:migrate   # ينشئ كل الجداول تلقائيًا
npm run seed              # ينشئ أول حساب مالك
```

---

### إعداد Cloudflare R2 (خطوة بخطوة)
1. روح [dash.cloudflare.com](https://dash.cloudflare.com) → سجّل / سجّل دخول
2. من القائمة الجانبية: **R2 Object Storage** → "Create bucket"
3. اسم الـ Bucket (مثلاً `edu-platform-files`) → Location: Automatic
4. **لا تفعّل "Public Access" أبدًا** — سيب الإعداد الافتراضي Private (أهم خطوة أمنية هنا)
5. روح **R2 → Manage API Tokens** → "Create API Token"
   - الصلاحية: **Object Read & Write** فقط (مش Admin)
6. هتاخد: `Access Key ID`, `Secret Access Key`, والـ `Endpoint` (`https://<account-id>.r2.cloudflarestorage.com`)
7. حطهم في `backend/.env`:
   ```
   R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
   R2_ACCESS_KEY_ID="..."
   R2_SECRET_ACCESS_KEY="..."
   R2_BUCKET="edu-platform-files"
   ```

#### تأكيد إن الـ Bucket مش Public (مراجعة أمنية)
- من صفحة الـ Bucket → **Settings** → تأكد إن **"Public Access" = Disabled** (الافتراضي، لكن راجعه بنفسك)
- **لا تربط** الـ bucket بـ "Custom Domain" أو "R2.dev subdomain" — النظام يعتمد بالكامل على presigned URLs مؤقتة (15 دقيقة) من الباك اند
- الحماية الفعلية طبقات: (١) الـ bucket نفسه private (٢) كل رابط تحميل بيتولد من endpoint محمي بـ JWT + StudentOwnershipGuard (٣) الرابط صالح 15 دقيقة بس
- للتأكد عمليًا: جرّب تفتح رابط الملف مباشرة بدون presigned params في المتصفح — المفروض "Access Denied"

---

---

## 2) تشغيل الـ Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

هيشتغل على `http://localhost:5173`

---

## 3) تسلسل الاستخدام المتوقع

1. **المالك** يسجّل دخول → يروح لـ "المستخدمون" → يضيف معلمين وأولياء أمور
2. **المالك** يروح لـ "الطلاب" → يضيف طالب ويربطه بمعلم (وولي أمر لو موجود)
3. **المعلم** يسجّل دخول → يشوف طلابه → يفتح صفحة طالب → ينشئ تقرير → يرفع ملفات
4. **المعلم** يضغط "نشر" على التقرير عشان يظهر لولي الأمر، أو يولّد "رابط مشاركة" مؤقت (٧ أيام) لإرساله مباشرة
5. **ولي الأمر** يسجّل دخول (لو عنده حساب) ويشوف تقارير ابنه ويحمّل الملفات، أو يفتح رابط المشاركة مباشرة بدون تسجيل دخول

---

## 4) الأمان — ملخص ما هو مُطبّق

| البند | الحالة |
|---|---|
| تشفير كلمات المرور | ✅ bcrypt (12 rounds) |
| 2FA (TOTP) | ✅ إجباري للمالك، اختياري للمعلمين |
| JWT access/refresh | ✅ access 15 دقيقة / refresh 7 أيام |
| حماية IDOR (وصول لبيانات الغير) | ✅ StudentOwnershipGuard على مستوى كل route |
| تشفير الملفات عند التخزين | ✅ SSE-AES256 على S3/R2 |
| روابط تحميل مؤقتة | ✅ presigned URLs صلاحية 15 دقيقة |
| فحص نوع وحجم الملف | ✅ whitelist للأنواع + حد أقصى 200MB |
| سجل النشاط (Audit Log) | ✅ يسجّل كل عملية حساسة |
| Rate limiting أساسي | ✅ ThrottlerModule (100 طلب/دقيقة) |

تحديث: `POST /auth/change-password` (للمستخدم المسجّل دخول) و`POST /auth/forgot-password` + `POST /auth/reset-password` (رابط بريد إلكتروني صالح ساعة واحدة) أصبحوا مطبّقين بالكامل في الباك اند والفرونت اند.

**ملاحظة مهمة:** في وضع التطوير (بدون `RESEND_API_KEY`)، رابط إعادة التعيين بيتطبع في الـ console بتاع الباك اند مش بيتبعت بريد فعلي. قبل الإنتاج لازم:
1. تسجّل في [Resend](https://resend.com) (خطة مجانية كافية للبداية — 100 إيميل/يوم)
2. تشغّل `npm install resend` في مجلد `backend`
3. تحط `RESEND_API_KEY` و`MAIL_FROM` في `.env`

الكود بقى جاهز بالكامل في `backend/src/auth/mailer.service.ts` — مفيش حاجة تعدّلها، مجرد تثبيت الحزمة وإضافة الـ API key والإيميل هيبدأ يتبعت فعليًا تلقائيًا.

### قبل الإنتاج — أضف كمان
- [ ] HTTPS إجباري (عادة تلقائي من منصة الاستضافة)
- [ ] نسخ احتياطي مجدول لقاعدة البيانات (Neon/Supabase بيوفروا ده تلقائيًا، أو `pg_dump` مجدول لو مستضاف بنفسك)
- [ ] مراجعة صلاحيات R2 Bucket (تأكد إنه مش public)
- [ ] Helmet middleware + CSRF protection لو هتستخدم cookies بدل localStorage للتوكن

---

## 5) الإشعارات (مُطبّقة — بريد إلكتروني + SMS)

عند نشر المعلم لتقرير (تغيير الحالة من "مسودة" إلى "منشور")، النظام تلقائيًا:
- يبحث عن ولي الأمر المرتبط بالطالب
- يبعتله **إيميل** فيه رابط مباشر للتقرير (`MailerService` — Resend)
- لو عنده رقم تليفون مسجّل، يبعتله كمان **رسالة SMS** (`SmsService` — Twilio)
- يسجّل كل عملية في سجل النشاط (`notification_sent`)

كلاهما بنفس النمط: بدون مفاتيح API، بيتطبعوا في الـ console بدل ما يتبعتوا فعليًا (وضع تطوير آمن بدون تسجيل حسابات).

**لتفعيل SMS فعليًا:**
1. تسجّل في [Twilio](https://www.twilio.com) واحصل على رقم مرسل
2. `npm install twilio`
3. حط `TWILIO_ACCOUNT_SID` و`TWILIO_AUTH_TOKEN` و`TWILIO_FROM_NUMBER` في `.env`

لو الطالب مش مربوط بولي أمر لسه، مفيش إشعار بيتبعت (متوقع، مفيش حد يستقبله).

---

## 6) تحليلات الأداء (مُطبّقة)

لوحة "تحليلات الأداء" في واجهة المالك (`/owner/analytics`) بتعرض:
- **التقارير عبر الوقت** — عدد التقارير المُنشأة شهريًا لآخر 6 أشهر (رسم خطي)
- **نمو التخزين** — حجم الملفات المرفوعة شهريًا بالميجابايت (رسم أعمدة)
- **نشاط المعلمين** — ترتيب المعلمين حسب عدد التقارير وعدد الطلاب المرتبطين
- **حالة التقارير** — نسبة المنشور مقابل المسودات (رسم دائري)

كل البيانات مبنية على `analytics.service.ts` في الباك اند، ومقيّدة تلقائيًا بمدرسة المالك (schoolId) — نفس عزل البيانات المطبّق في باقي النظام.

---

## 7) دعم أكثر من مدرسة — Multi-tenancy (مُطبّق)

المنصة بقت تدعم عدة مدارس (tenants) مستقلة تمامًا عن بعضها على نفس الـ deployment:

- كل `User` و`Student` مرتبط إجباريًا بـ `schoolId`
- الـ JWT بيحمل `schoolId` جوه الـ payload، وكل الاستعلامات (`UsersService`, `StudentsService`, `AuditService`, `AnalyticsService`) مفلترة بيه تلقائيًا
- `StudentOwnershipGuard` بقى يتحقق كمان إن الطالب تابع لنفس مدرسة المستخدم الحالي، **حتى لو كان مالك النظام** — يعني مالك مدرسة (أ) مينفعش يوصل لبيانات مدرسة (ب) نهائيًا
- إنشاء مدرسة جديدة بيتم حاليًا عبر seed script بس (`npm run seed -- --school=... --email=... --password=...`) مش عبر API عام — قرار متعمد لمنع أي حد يسجّل مدرسة جديدة بنفسه بدون مراجعة، ولو حبيت تفتحها كـ self-service لاحقًا هتحتاج تضيف صفحة تسجيل + تحقق بريد إلكتروني

---

## 8) نظام التقييم والدرجات (مُطبّق)

نظام كامل لرصد ومتابعة درجات الطلاب:

- **المواد الدراسية** — المعلم (أو المالك بالنيابة عنه) ينشئ مواد دراسية (`/teacher/subjects`)
- **التقييمات** — لكل مادة، المعلم ينشئ تقييمات (امتحان / اختبار قصير / واجب / مشاركة) بدرجة نهائية وتاريخ
- **رصد الدرجات** — المعلم يرصد درجة كل طالب مرتبط بيه لكل تقييم دفعة واحدة (bulk entry) مع إمكانية إضافة ملاحظة نصية لكل طالب
- **العرض للطالب/ولي الأمر** — صفحة درجات لكل طالب بتحسب تلقائيًا:
  - **المعدل لكل مادة** كنسبة مئوية (مجموع الدرجات ÷ مجموع الدرجات النهائية)
  - **المعدل العام** عبر كل المواد
  - سجل كامل لكل تقييم ودرجته وملاحظاته

**نموذج البيانات:** `Subject` (مادة تابعة لمعلم ومدرسة) ← `Assessment` (تقييم تابع لمادة) ← `Grade` (درجة طالب في تقييم معيّن، بقيد فريد assessment+student يمنع التكرار).

**الحماية:** `SubjectOwnershipGuard` جديد بيتحقق إن المادة/التقييم تابعين لنفس مدرسة المستخدم، وإن المعلم صاحب المادة فعلًا (المالك بيشوف كل مواد مدرسته). عرض درجات طالب معيّن بيستخدم نفس `StudentOwnershipGuard` المستخدم في التقارير، فمفيش تكرار في منطق الحماية.

---

## 9) الاستضافة الموصى بها

| المكوّن | الخيار | التكلفة التقريبية |
|---|---|---|
| Backend | Render / Railway | مجاني للبداية، ثم ~$7/شهر |
| قاعدة البيانات | Neon (Postgres) | مجاني حتى حجم معيّن |
| تخزين الملفات | Cloudflare R2 | مجاني حتى 10GB + بدون رسوم egress |
| Frontend | Vercel / Netlify | مجاني |

---

## 10) خطوات النشر (مختصر)

```bash
# Backend على Render:
# 1. اربط الـ repo
# 2. Build command: npm install && npm run build && npx prisma migrate deploy
# 3. Start command: npm run start:prod
# 4. أضف كل الـ env vars من .env

# Frontend على Vercel:
# 1. اربط الـ repo، حدد مجلد frontend كـ root
# 2. Build command: npm run build
# 3. أضف VITE_API_URL = رابط الباك اند بتاع Render
```
