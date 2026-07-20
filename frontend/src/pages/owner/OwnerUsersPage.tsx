import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { OwnerLayout } from './OwnerLayout';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'teacher' | 'parent';
  status: 'active' | 'suspended';
  totpEnabled: boolean;
  lastLoginAt: string | null;
}

export function OwnerUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'teacher' });
  const [error, setError] = useState('');

  function load() {
    api.get('/users').then(res => setUsers(res.data));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'teacher' });
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
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">2FA</th>
              <th className="text-right p-3">آخر دخول</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-gray-500">{u.email}</td>
                <td className="p-3">{roleLabel[u.role]}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.status === 'active' ? 'نشط' : 'موقوف'}
                  </span>
                </td>
                <td className="p-3">{u.totpEnabled ? '✓' : '—'}</td>
                <td className="p-3 text-gray-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ar-EG') : '—'}</td>
                <td className="p-3 flex gap-2">
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
