import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { TeacherLayout } from './TeacherLayout';

interface QuestionRow { id: string; type: string; text: string; }
interface ExamRow {
  id: string; title: string; duration: number;
  questions: QuestionRow[]; _count: { results: number };
}
interface ResultRow {
  id: string; score: number; total: number; percent: number; submittedAt: string;
  student: { name: string };
}

const TYPE_LABEL: Record<string, string> = { mcq: 'اختيار من متعدد', truefalse: 'صح / خطأ', short: 'إجابة قصيرة' };

export function TeacherExamsPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [openResults, setOpenResults] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importDuration, setImportDuration] = useState(20);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  function load() {
    api.get('/exams').then(res => setExams(res.data));
    api.get('/questions').then(res => setQuestions(res.data));
  }
  useEffect(load, []);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (selected.size === 0) { setError('اختر سؤالًا واحدًا على الأقل'); return; }
    try {
      await api.post('/exams', { title, duration, questionIds: Array.from(selected) });
      setTitle(''); setDuration(20); setSelected(new Set());
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا الامتحان؟')) return;
    await api.delete(`/exams/${id}`);
    load();
  }

  async function viewResults(examId: string) {
    const { data } = await api.get(`/exams/${examId}/results`);
    setResults(data);
    setOpenResults(examId);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setImportError('');
    if (!importFile) { setImportError('اختر ملفًا أولًا'); return; }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('title', importTitle);
      formData.append('duration', String(importDuration));
      await api.post('/exams/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowImport(false);
      setImportTitle(''); setImportDuration(20); setImportFile(null);
      load();
    } catch (err: any) {
      setImportError(err.response?.data?.message || 'حدث خطأ أثناء الاستيراد');
    } finally {
      setImporting(false);
    }
  }

  return (
    <TeacherLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-navy">الامتحانات</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(v => !v)} className="border border-navy text-navy px-4 py-2 rounded-lg font-semibold text-sm">
            استيراد من ملف
          </button>
          <button onClick={() => setShowForm(v => !v)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold text-sm">
            + امتحان جديد
          </button>
        </div>
      </div>

      {showImport && (
        <form onSubmit={handleImport} className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-bold mb-3">استيراد امتحان جاهز من ملف</h3>
          <p className="text-sm text-gray-500 mb-4">
            الملف يجب أن يتبع صيغة محددة (كل سؤال في كتلة، مفصولة بسطر من الشرطات <code>-----</code>):
          </p>
          <pre className="bg-gray-50 rounded-lg p-3 text-xs mb-4 overflow-auto" dir="ltr">
{`نوع: mcq
سؤال: ما هي عاصمة مصر؟
خيارات: القاهرة | الإسكندرية | الأقصر | أسوان
الإجابة: القاهرة
-----
نوع: truefalse
سؤال: الأرض كروية الشكل
الإجابة: صح
-----
نوع: short
سؤال: عرّف التمثيل الضوئي
الإجابة: عملية تحويل الطاقة الضوئية إلى طاقة كيميائية
-----`}
          </pre>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600">عنوان الامتحان</label>
              <input className="w-full border rounded-lg px-3 py-2 mt-1" value={importTitle}
                onChange={e => setImportTitle(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-gray-600">المدة (بالدقائق)</label>
              <input type="number" min={1} className="w-full border rounded-lg px-3 py-2 mt-1"
                value={importDuration} onChange={e => setImportDuration(Number(e.target.value))} required />
            </div>
          </div>

          <label className="text-sm text-gray-600">ملف الأسئلة (TXT, PDF, DOCX)</label>
          <input type="file" accept=".txt,.pdf,.doc,.docx" className="block mt-1 mb-4"
            onChange={e => setImportFile(e.target.files?.[0] || null)} required />

          {importError && <p className="text-red-600 text-sm mb-3">{importError}</p>}
          <button disabled={importing} className="bg-navy text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60">
            {importing ? 'جارٍ الاستيراد...' : 'استيراد وإنشاء الامتحان'}
          </button>
        </form>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600">عنوان الامتحان</label>
              <input className="w-full border rounded-lg px-3 py-2 mt-1" value={title}
                onChange={e => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-gray-600">المدة (بالدقائق)</label>
              <input type="number" min={1} className="w-full border rounded-lg px-3 py-2 mt-1"
                value={duration} onChange={e => setDuration(Number(e.target.value))} required />
            </div>
          </div>

          <h3 className="font-semibold mb-2">اختر الأسئلة ({questions.length} متاح)</h3>
          <div className="flex flex-col gap-2 max-h-80 overflow-auto mb-4">
            {questions.map(q => (
              <label key={q.id} className="flex items-start gap-2 border rounded-lg p-2 cursor-pointer">
                <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="mt-1" />
                <div>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{TYPE_LABEL[q.type]}</span>
                  <div className="text-sm mt-1">{q.text}</div>
                </div>
              </label>
            ))}
            {questions.length === 0 && <p className="text-gray-400 text-sm">لا يوجد أسئلة، أضف أسئلة أولًا</p>}
          </div>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <button className="bg-navy text-white px-5 py-2 rounded-lg font-semibold">حفظ الامتحان</button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {exams.map(e => (
          <div key={e.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">{e.title}</div>
                <div className="text-xs text-gray-500 mt-1">{e.questions.length} سؤال · {e.duration} دقيقة · {e._count.results} محاولة</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => viewResults(e.id)} className="text-xs border border-navy text-navy rounded-lg px-3 py-2">
                  النتائج
                </button>
                <button onClick={() => handleDelete(e.id)} className="text-xs border border-red-300 text-red-600 rounded-lg px-3 py-2">
                  حذف
                </button>
              </div>
            </div>

            {openResults === e.id && (
              <div className="mt-4 border-t pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-right py-1">الطالب</th>
                      <th className="text-right py-1">الدرجة</th>
                      <th className="text-right py-1">النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2">{r.student.name}</td>
                        <td className="py-2">{r.score}/{r.total}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${r.percent >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {r.percent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {results.length === 0 && (
                      <tr><td colSpan={3} className="text-center py-4 text-gray-400">لا يوجد محاولات بعد</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {exams.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">لا يوجد امتحانات بعد</div>
        )}
      </div>
    </TeacherLayout>
  );
}
