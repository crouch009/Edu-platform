import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { TeacherLayout } from './TeacherLayout';

interface CurriculumRow {
  id: string;
  title: string;
  _count: { questions: number };
}
interface GeneratedQuestion {
  type: 'mcq' | 'truefalse' | 'short';
  text: string;
  options?: string[];
  correctAnswer: string;
}

export function TeacherCurriculaPage() {
  const [curricula, setCurricula] = useState<CurriculumRow[]>([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [count, setCount] = useState(8);
  const [difficulty, setDifficulty] = useState('متوسط');
  const [method, setMethod] = useState<'ai' | 'heuristic'>('ai');
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);
  const [savedCurriculumId, setSavedCurriculumId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [extracting, setExtracting] = useState(false);

  function load() {
    api.get('/curricula').then(res => setCurricula(res.data));
  }
  useEffect(load, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/curricula/extract-text', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setText(data.text);
    } catch (err: any) {
      setError(err.response?.data?.message || 'تعذر استخراج النص من هذا الملف');
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerate() {
    setError('');
    if (!title.trim() || !text.trim()) {
      setError('من فضلك أدخل عنوان المنهج والنص');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/questions/generate/${method}`, {
        curriculumTitle: title, curriculumText: text, count, difficulty,
      });
      // Create the curriculum record first, then hold questions in memory for review
      const curriculum = await api.post('/curricula', { title, text });
      setSavedCurriculumId(curriculum.data.id);
      setGenerated(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء التوليد');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveQuestions() {
    if (!savedCurriculumId) return;
    setLoading(true);
    try {
      await api.post(`/curricula/${savedCurriculumId}/questions/bulk`, { questions: generated });
      setGenerated([]);
      setSavedCurriculumId(null);
      setTitle('');
      setText('');
      load();
      alert('تم حفظ الأسئلة في بنك الأسئلة');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا المنهج وكل أسئلته؟')) return;
    await api.delete(`/curricula/${id}`);
    load();
  }

  return (
    <TeacherLayout>
      <h1 className="text-xl font-bold text-navy mb-6">رفع منهج وتوليد أسئلة</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <label className="text-sm text-gray-600">عنوان المنهج / الدرس</label>
        <input className="w-full border rounded-lg px-3 py-2 mt-1 mb-4" value={title}
          onChange={e => setTitle(e.target.value)} placeholder="مثال: الوحدة الأولى - الخلية النباتية" />

        <label className="text-sm text-gray-600">ارفع ملف (TXT, PDF, DOCX) أو الصق النص</label>
        <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFileUpload} className="mb-2 block" disabled={extracting} />
        {extracting && <p className="text-sm text-gray-500 mb-2">جارٍ استخراج النص من الملف...</p>}
        <textarea className="w-full border rounded-lg px-3 py-2 mb-4" rows={8} value={text}
          onChange={e => setText(e.target.value)} placeholder="الصق نص الدرس هنا..." />

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-sm text-gray-600">عدد الأسئلة</label>
            <input type="number" min={1} max={30} className="w-full border rounded-lg px-3 py-2 mt-1"
              value={count} onChange={e => setCount(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm text-gray-600">الصعوبة</label>
            <select className="w-full border rounded-lg px-3 py-2 mt-1" value={difficulty}
              onChange={e => setDifficulty(e.target.value)}>
              <option value="سهل">سهل</option>
              <option value="متوسط">متوسط</option>
              <option value="صعب">صعب</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">طريقة التوليد</label>
            <select className="w-full border rounded-lg px-3 py-2 mt-1" value={method}
              onChange={e => setMethod(e.target.value as any)}>
              <option value="ai">بالذكاء الاصطناعي</option>
              <option value="heuristic">تلقائي بسيط</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button onClick={handleGenerate} disabled={loading}
          className="bg-accent text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60">
          {loading ? 'جارٍ التوليد...' : 'توليد الأسئلة'}
        </button>
      </div>

      {generated.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-bold mb-4">{generated.length} سؤال تم توليده - راجعها ثم احفظ</h3>
          <div className="flex flex-col gap-3 mb-4">
            {generated.map((q, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="font-medium">{i + 1}. {q.text}</div>
                {q.options && <div className="text-sm text-gray-500 mt-1">{q.options.join(' / ')}</div>}
                <div className="text-sm text-green-700 mt-1">الإجابة: {q.correctAnswer}</div>
              </div>
            ))}
          </div>
          <button onClick={handleSaveQuestions} disabled={loading}
            className="bg-navy text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60">
            حفظ الأسئلة في بنك الأسئلة
          </button>
        </div>
      )}

      <h2 className="font-bold text-lg mb-3">المناهج المحفوظة</h2>
      <div className="flex flex-col gap-2">
        {curricula.map(c => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
            <div>
              <span className="font-medium">{c.title}</span>
              <span className="text-xs text-gray-400 mr-2">{c._count.questions} سؤال</span>
            </div>
            <button onClick={() => handleDelete(c.id)} className="text-xs border border-red-300 text-red-600 rounded-lg px-3 py-1">
              حذف
            </button>
          </div>
        ))}
        {curricula.length === 0 && <p className="text-gray-400 text-sm">لا يوجد مناهج بعد</p>}
      </div>
    </TeacherLayout>
  );
}
