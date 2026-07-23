import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { setStudentTokens } from '../../lib/studentApi';
import { useStudentAuth } from '../../lib/StudentAuthContext';
import { OwnerLayout } from './OwnerLayout';

interface UserOption { id: string; name: string; role: string; }
interface StudentRow {
  id: string; name: string; grade: string | null; className: string | null;
  teacher: { name: string } | null; parent: { name: string } | null;
}

export function OwnerStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [teachers, setTeachers] = useState<UserOption[]>([]);
  const [parents, setParents] = useState<UserOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', grade: '', className: '', teacherId: '', parentId: '' });
  const [error, setError] = useState('');
  const { setStudent } = useStudentAuth();
  const navigate = useNavigate();

  function load() {
    api.get('/students').then(res => setStudents(res.data));
    api.get('/users').then(res => {
      setTeachers(res.data.filter((u: any) => u.role === 'teacher'));
      setParents(res.data.filter((u: any) => u.role === 'parent'));
    });
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/students', {
        name: form.name,
        grade: form.grade || undefined,
        className: form.className || undefined,
        teacherId: form.teacherId,
        parentId: form.parentId || undefined,
      });
      setShowForm(false);
      setForm({ name: '', grade: '', className: '', teacherId: '', parentId: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا الطالب وكل تقاريره؟')) return;
    await api.delete(`/students/${id}`);
    load();
  }

  async function handleImpersonate(s: StudentRow) {
    if (!confirm(`عرض حساب الطالب ${s.name} (بوابة الامتحانات)؟`)) return;
    const { data } = await api.post(`/students/${s.id}/impersonate`);
    // Students use a completely separate token/context system, so the
    // owner's own session (staff `api`) is left untouched - no stashing needed.
    setStudentTokens(data.accessToken, '');
    setStudent(data.student);
    sessionStorage.setItem('studentImpersonationByOwner', 'true');
    navigate('/student/dashboard');
  }

  return (
    <OwnerLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy">إدارة الطلاب والربط</h1>
        <button onClick={() => setShowForm(v => !v)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold">
          + طالب جديد
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-5 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">اسم الطالب</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm text-gray-600">الصف الدراسي</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.grade}
              onChange={e => setForm({ ...form, grade: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-600">الفصل</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.className}
              onChange={e => setForm({ ...form, className: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-600">المعلم المسؤول</label>
            <select className="w-full border rounded-lg px-3 py-2 mt-1" value={form.teacherId}
              onChange={e => setForm({ ...form, teacherId: e.target.value })} required>
              <option value="">اختر معلم</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">ولي الأمر (اختياري)</label>
            <select className="w-full border rounded-lg px-3 py-2 mt-1" value={form.parentId}
              onChange={e => setForm({ ...form, parentId: e.target.value })}>
              <option value="">بدون ربط الآن</option>
              {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}
          <div className="col-span-2">
            <button className="bg-navy text-white px-4 py-2 rounded-lg font-semibold">حفظ</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">الطالب</th>
              <th className="text-right p-3">الصف</th>
              <th className="text-right p-3">المعلم</th>
              <th className="text-right p-3">ولي الأمر</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 text-gray-500">{s.grade || '—'} {s.className ? `/ ${s.className}` : ''}</td>
                <td className="p-3">{s.teacher?.name || '—'}</td>
                <td className="p-3">{s.parent?.name || '—'}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => handleImpersonate(s)} className="text-xs border border-navy text-navy rounded-lg px-2 py-1 whitespace-nowrap">
                    عرض بوابة الطالب
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-xs border border-red-300 text-red-600 rounded-lg px-2 py-1">
                    حذف
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">لا يوجد طلاب بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </OwnerLayout>
  );
}
