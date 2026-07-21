import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { TeacherLayout } from './TeacherLayout';

interface QuestionRow {
  id: string;
  type: 'mcq' | 'truefalse' | 'short';
  text: string;
  options: string[] | null;
  correctAnswer: string;
}

const TYPE_LABEL: Record<string, string> = { mcq: 'اختيار من متعدد', truefalse: 'صح / خطأ', short: 'إجابة قصيرة' };

export function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'mcq', text: '', options: '', correctAnswer: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/questions').then(res => setQuestions(res.data));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const options = form.type === 'mcq'
        ? form.options.split('\n').map(s => s.trim()).filter(Boolean)
        : form.type === 'truefalse' ? ['صح', 'خطأ'] : undefined;

      if (form.type === 'mcq' && (!options || options.length < 2)) {
        setError('أضف خيارين على الأقل'); return;
      }
      if (options && !options.includes(form.correctAnswer)) {
        setError('الإجابة الصحيحة يجب أن تكون من ضمن الخيارات'); return;
      }

      await api.post('/questions', {
        type: form.type, text: form.text, options, correctAnswer: form.correctAnswer,
      });
      setForm({ type: 'mcq', text: '', options: '', correctAnswer: '' });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/questions/${id}`);
    load();
  }

  return (
    <TeacherLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-navy">بنك الأسئلة ({questions.length})</h1>
        <button onClick={() => setShowForm(v => !v)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold text-sm">
          + سؤال يدوي
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <label className="text-sm text-gray-600">نوع السؤال</label>
          <select className="w-full border rounded-lg px-3 py-2 mt-1 mb-4" value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="mcq">اختيار من متعدد</option>
            <option value="truefalse">صح / خطأ</option>
            <option value="short">إجابة قصيرة</option>
          </select>

          <label className="text-sm text-gray-600">نص السؤال</label>
          <textarea className="w-full border rounded-lg px-3 py-2 mt-1 mb-4" rows={2} value={form.text}
            onChange={e => setForm({ ...form, text: e.target.value })} required />

          {form.type === 'mcq' && (
            <>
              <label className="text-sm text-gray-600">الخيارات (كل خيار في سطر)</label>
              <textarea className="w-full border rounded-lg px-3 py-2 mt-1 mb-4" rows={4} value={form.options}
                onChange={e => setForm({ ...form, options: e.target.value })} />
            </>
          )}

          <label className="text-sm text-gray-600">الإجابة الصحيحة</label>
          <input className="w-full border rounded-lg px-3 py-2 mt-1 mb-4" value={form.correctAnswer}
            onChange={e => setForm({ ...form, correctAnswer: e.target.value })} required />

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <button className="bg-navy text-white px-5 py-2 rounded-lg font-semibold">حفظ السؤال</button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {questions.map(q => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-start gap-3">
            <div>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{TYPE_LABEL[q.type]}</span>
              <div className="font-medium mt-2">{q.text}</div>
              {q.options && <div className="text-sm text-gray-500 mt-1">{q.options.join(' / ')}</div>}
              <div className="text-sm text-green-700 mt-1">الإجابة: {q.correctAnswer}</div>
            </div>
            <button onClick={() => handleDelete(q.id)} className="text-xs border border-red-300 text-red-600 rounded-lg px-3 py-1 whitespace-nowrap">
              حذف
            </button>
          </div>
        ))}
        {questions.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
            لا يوجد أسئلة بعد. ارفع منهج أو أضف سؤالًا يدويًا.
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
