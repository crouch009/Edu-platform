import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setTokens } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email, password,
        totpCode: needsTotp ? totpCode : undefined,
      });

      if (data.requiresTotp) {
        setNeedsTotp(true);
        return;
      }

      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);

      const roleRoutes: Record<string, string> = {
        owner: '/owner/dashboard',
        teacher: '/teacher/dashboard',
        parent: '/parent/dashboard',
      };
      navigate(roleRoutes[data.user.role]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-navy mb-1">تسجيل الدخول</h1>
        <p className="text-sm text-gray-500 mb-6">المنصة التعليمية</p>

        {!needsTotp ? (
          <>
            <label className="text-sm text-gray-600">البريد الإلكتروني</label>
            <input
              className="w-full border rounded-lg px-3 py-2 mb-4 mt-1"
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
            />
            <label className="text-sm text-gray-600">كلمة المرور</label>
            <input
              className="w-full border rounded-lg px-3 py-2 mb-4 mt-1"
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
            />
          </>
        ) : (
          <>
            <label className="text-sm text-gray-600">كود التحقق الثنائي (6 أرقام)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 mb-4 mt-1 text-center tracking-widest text-lg"
              maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value)} required autoFocus
            />
          </>
        )}

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-navy text-white rounded-lg py-2 font-semibold disabled:opacity-60"
        >
          {loading ? 'جارٍ الدخول...' : needsTotp ? 'تأكيد' : 'دخول'}
        </button>

        {!needsTotp && (
          <Link to="/forgot-password" className="text-sm text-navy block text-center mt-4">
            نسيت كلمة المرور؟
          </Link>
        )}
      </form>
    </div>
  );
}
