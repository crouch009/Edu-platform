import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { TeacherLayout } from './TeacherLayout';

interface SubjectRow {
  id: string;
  name: string;
  _count: { assessments: number };
}

export function TeacherSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.get('/subjects').then(res => setSubjects(res.data));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/subjects', { name });
      setName('');
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذه المادة وكل تقييماتها ودرجاتها؟')) return;
    await api.delete(`/subjects/${id}`);
    load();
  }

  return (
    <TeacherLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-navy">موادي الدراسية</h1>
        <button onClick={() => setShowForm(v => !v)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold text-sm">
          + مادة جديدة
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-5 mb-6 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-gray-600">اسم المادة</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={name}
              onChange={e => setName(e.target.value)} required placeholder="مثال: الرياضيات" />
          </div>
          <button className="bg-navy text-white px-5 py-2 rounded-lg font-semibold">حفظ</button>
        </form>
      )}
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {subjects.map(s => (
          <Link key={s.id} to={`/teacher/subjects/${s.id}`}
            className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition flex justify-between items-center">
            <div>
              <div className="font-bold text-navy">{s.name}</div>
              <div className="text-xs text-gray-500 mt-1">{s._count.assessments} تقييم</div>
            </div>
            <button onClick={e => { e.preventDefault(); handleDelete(s.id); }}
              className="text-xs border border-red-300 text-red-600 rounded-lg px-2 py-1">
              حذف
            </button>
          </Link>
        ))}
        {subjects.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400 md:col-span-2">
            لا يوجد مواد بعد، أضف مادة جديدة للبدء
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
