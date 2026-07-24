import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { TeacherLayout } from './TeacherLayout';

export function TeacherNewReportPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/reports', { studentId, title, content });
      navigate(`/teacher/reports/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout>
      <h1 className="text-xl font-bold text-navy mb-6">تقرير جديد</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <label className="text-sm text-gray-600">عنوان التقرير</label>
        <input className="w-full border rounded-lg px-3 py-2 mt-1 mb-4" value={title}
          onChange={e => setTitle(e.target.value)} required />

        <label className="text-sm text-gray-600">محتوى التقرير</label>
        <textarea className="w-full border rounded-lg px-3 py-2 mt-1 mb-4" rows={8} value={content}
          onChange={e => setContent(e.target.value)} required />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button disabled={saving} className="bg-navy text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-60">
          {saving ? 'جارٍ الحفظ...' : 'حفظ التقرير'}
        </button>
        <p className="text-xs text-gray-400 mt-3">يمكنك رفع الملفات المرفقة بعد حفظ التقرير</p>
      </form>
    </TeacherLayout>
  );
}
