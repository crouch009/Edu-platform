import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { studentApi, setStudentTokens } from '../lib/studentApi';
import { useStudentAuth } from '../lib/StudentAuthContext';

export function StudentLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setStudent } = useStudentAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await studentApi.post('/auth/student-login', { email, password });
      setStudentTokens(data.accessToken, data.refreshToken);
      setStudent(data.student);
      navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-navy mb-1">دخول الطالب</h1>
        <p className="text-sm text-gray-500 mb-6">ادخل بياناتك لحل الامتحانات</p>

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

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button disabled={loading} className="w-full bg-navy text-white rounded-lg py-2 font-semibold disabled:opacity-60">
          {loading ? 'جارٍ الدخول...' : 'دخول'}
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          لا تملك بيانات دخول؟ تواصل مع معلمك.
        </p>
        <Link to="/login" className="text-xs text-navy block text-center mt-3">
          دخول المعلمين / أولياء الأمور
        </Link>
      </form>
    </div>
  );
}
