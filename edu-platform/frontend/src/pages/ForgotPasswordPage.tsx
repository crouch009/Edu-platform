import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
      setMessage(data.message);
    } catch {
      setMessage('حدث خطأ، حاول مرة أخرى لاحقًا');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-navy mb-1">نسيت كلمة المرور</h1>
        <p className="text-sm text-gray-500 mb-6">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>

        {message ? (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">{message}</p>
        ) : (
          <>
            <label className="text-sm text-gray-600">البريد الإلكتروني</label>
            <input
              className="w-full border rounded-lg px-3 py-2 mb-4 mt-1"
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
            />
            <button disabled={loading} className="w-full bg-navy text-white rounded-lg py-2 font-semibold disabled:opacity-60">
              {loading ? 'جارٍ الإرسال...' : 'إرسال رابط إعادة التعيين'}
            </button>
          </>
        )}

        <Link to="/login" className="text-sm text-navy block text-center mt-4">← رجوع لتسجيل الدخول</Link>
      </form>
    </div>
  );
}
