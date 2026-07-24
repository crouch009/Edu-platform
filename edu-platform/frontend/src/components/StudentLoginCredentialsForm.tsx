import { useState } from 'react';
import { api } from '../lib/api';

export function StudentLoginCredentialsForm({ studentId, currentEmail }: { studentId: string; currentEmail: string | null }) {
  const [email, setEmail] = useState(currentEmail || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      await api.patch(`/students/${studentId}/login-credentials`, { email, password });
      setSuccess(true);
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="font-bold text-lg mb-1">بيانات دخول الطالب لحل الامتحانات</h2>
      <p className="text-sm text-gray-500 mb-4">
        هذه البيانات منفصلة عن حسابك، ويستخدمها الطالب لتسجيل الدخول من صفحة "دخول الطالب" لحل الامتحانات فقط.
      </p>

      <label className="text-sm text-gray-600">البريد الإلكتروني</label>
      <input type="email" className="w-full border rounded-lg px-3 py-2 mt-1 mb-4"
        value={email} onChange={e => setEmail(e.target.value)} required />

      <label className="text-sm text-gray-600">كلمة المرور {currentEmail ? '(اتركها فارغة إذا لم ترد تغييرها)' : ''}</label>
      <input type="password" className="w-full border rounded-lg px-3 py-2 mt-1 mb-4"
        value={password} onChange={e => setPassword(e.target.value)}
        required={!currentEmail} placeholder={currentEmail ? '••••••••' : ''} />

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {success && <p className="text-green-700 text-sm mb-3 bg-green-50 rounded-lg p-2">تم الحفظ بنجاح</p>}

      <button disabled={saving} className="bg-navy text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60">
        {saving ? 'جارٍ الحفظ...' : 'حفظ بيانات الدخول'}
      </button>
    </form>
  );
}
