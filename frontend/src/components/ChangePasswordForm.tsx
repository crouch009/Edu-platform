import { useState } from 'react';
import { api } from '../lib/api';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 max-w-md">
      <h2 className="font-bold text-lg mb-4">تغيير كلمة المرور</h2>

      <label className="text-sm text-gray-600">كلمة المرور الحالية</label>
      <input type="password" className="w-full border rounded-lg px-3 py-2 mb-4 mt-1"
        value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />

      <label className="text-sm text-gray-600">كلمة المرور الجديدة</label>
      <input type="password" className="w-full border rounded-lg px-3 py-2 mb-4 mt-1"
        value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />

      <label className="text-sm text-gray-600">تأكيد كلمة المرور الجديدة</label>
      <input type="password" className="w-full border rounded-lg px-3 py-2 mb-4 mt-1"
        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {success && <p className="text-green-700 text-sm mb-3 bg-green-50 rounded-lg p-2">تم تغيير كلمة المرور بنجاح</p>}

      <button disabled={loading} className="bg-navy text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60">
        {loading ? 'جارٍ الحفظ...' : 'حفظ'}
      </button>
    </form>
  );
}
