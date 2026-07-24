import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, saveImpersonationOriginal, setImpersonatedSession } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { OwnerLayout } from './OwnerLayout';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'teacher' | 'parent';
  status: 'active' | 'suspended';
  totpEnabled: boolean;
  lastLoginAt: string | null;
  stages: string[];
}

const STAGE_OPTIONS = ['رياض أطفال', 'ابتدائي', 'إعدادي', 'ثانوي'];

export function OwnerUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'teacher',
    subjectNames: '', stages: [] as string[],
  });
  const [error, setError] = useState('');
  const { user: currentUser, setUser } = useAuth();
  const navigate = useNavigate();

  function load() {
    api.get('/users').then(res => setUsers(res.data));
  }
  useEffect(load, []);

  function toggleStage(stage: string) {
    setForm(prev => ({
      ...prev,
      stages: prev.stages.includes(stage) ? prev.stages.filter(s => s !== stage) : [...prev.stages, stage],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const subjectNames = form.subjectNames.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      await api.post('/users', {
        name: form.name, email: form.email, password: form.password, role: form.role,
        subjectNames: form.role === 'teacher' ? subjectNames : undefined,
        stages: form.role === 'teacher' ? form.stages : undefined,
      });
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'teacher', subjectNames: '', stages: [] });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  async function toggleStatus(u: UserRow) {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    await api.patch(`/users/${u.id}`, { status: newStatus });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    await api.delete(`/users/${id}`);
    load();
  }

  async function handleImpersonate(u: UserRow) {
    if (!confirm(`الدخول كـ ${u.name}؟ هتقدر ترجع لحسابك في أي وقت.`)) return;
    const { data } = await api.post(`/users/${u.id}/impersonate`);
    saveImpersonationOriginal(currentUser);
    setImpersonatedSession(data.accessToken, data.user);
    setUser(data.user);
    navigate(data.user.role === 'teacher' ? '/teacher/dashboard' : '/parent/dashboard');
  }

  const roleLabel: Record<string, string> = { owner: 'مالك', teacher: 'معلم', parent: 'ولي أمر' };

  return (
    <OwnerLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy">إدارة المستخدمين</h1>
        <button onClick={() => setShowForm(v => !v)} className="bg-accent text-white px-4 py-2 rounded-lg font-semibold">
          + مستخدم جديد
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-5 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">الاسم</label>
            <input className="w-full border rounded-lg px-3 py-2 mt-1" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm text-gray-600">البريد الإلكتروني</label>
            <input type="email" className="w-full border rounded-lg px-3 py-2 mt-1" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm text-gray-600">كلمة المرور المبدئية</label>
            <input type="password" className="w-full border rounded-lg px-3 py-2 mt-1" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </div>
          <div>
            <label className="text-sm text-gray-600">الدور</label>
            <select className="w-full border rounded-lg px-3 py-2 mt-1" value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="teacher">معلم</option>
              <option value="parent">ولي أمر</option>
              <option value="owner">مالك</option>
            </select>
          </div>

          {form.role === 'teacher' && (
            <>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">المواد التي يدرّسها (كل مادة في سطر أو مفصولة بفاصلة)</label>
                <textarea className="w-full border rounded-lg px-3 py-2 mt-1" rows={3}
                  value={form.subjectNames} onChange={e => setForm({ ...form, subjectNames: e.target.value })}
                  placeholder={'مثال:\nالرياضيات\nالعلوم'} />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600 block mb-2">المراحل الدراسية التي يعمل بها</label>
                <div className="flex gap-3 flex-wrap">
                  {STAGE_OPTIONS.map(stage => (
                    <label key={stage} className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer">
                      <input type="checkbox" checked={form.stages.includes(stage)} onChange={() => toggleStage(stage)} />
                      <span className="text-sm">{stage}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

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
              <th className="text-right p-3">الاسم</th>
              <th className="text-right p-3">البريد</th>
              <th className="text-right p-3">الدور</th>
              <th className="text-right p-3">المراحل</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">2FA</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-gray-500">{u.email}</td>
                <td className="p-3">{roleLabel[u.role]}</td>
                <td className="p-3 text-gray-500 text-xs">{u.stages?.join('، ') || '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.status === 'active' ? 'نشط' : 'موقوف'}
                  </span>
                </td>
                <td className="p-3">{u.totpEnabled ? '✓' : '—'}</td>
                <td className="p-3 flex gap-2 flex-wrap">
                  {u.role !== 'owner' && (
                    <button onClick={() => handleImpersonate(u)} className="text-xs border border-navy text-navy rounded-lg px-2 py-1">
                      دخول كهذا المستخدم
                    </button>
                  )}
                  <button onClick={() => toggleStatus(u)} className="text-xs border rounded-lg px-2 py-1">
                    {u.status === 'active' ? 'إيقاف' : 'تفعيل'}
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="text-xs border border-red-300 text-red-600 rounded-lg px-2 py-1">
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OwnerLayout>
  );
}
