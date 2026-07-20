import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/reset-password`, { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ، الرابط ربما منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <p className="text-red-600 font-semibold">رابط غير صالح</p>
          <Link to="/forgot-password" className="text-sm text-navy block mt-4">طلب رابط جديد</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-navy mb-6">إعادة تعيين كلمة المرور</h1>

        {success ? (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
            تم تغيير كلمة المرور بنجاح، جارٍ تحويلك لتسجيل الدخول...
          </p>
        ) : (
          <>
            <label className="text-sm text-gray-600">كلمة المرور الجديدة</label>
            <input type="password" className="w-full border rounded-lg px-3 py-2 mb-4 mt-1"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />

            <label className="text-sm text-gray-600">تأكيد كلمة المرور</label>
            <input type="password" className="w-full border rounded-lg px-3 py-2 mb-4 mt-1"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <button disabled={loading} className="w-full bg-navy text-white rounded-lg py-2 font-semibold disabled:opacity-60">
              {loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
