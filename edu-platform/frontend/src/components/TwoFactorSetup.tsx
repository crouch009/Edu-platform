import { useState } from 'react';
import { api } from '../lib/api';

export function TwoFactorSetup() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/generate');
      setQrCode(data.qrCodeDataUrl);
      setSecret(data.secret);
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/2fa/confirm', { code, secret });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'كود غير صحيح');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-md">
        <h2 className="font-bold text-lg mb-3">التحقق الثنائي</h2>
        <p className="text-green-700 text-sm bg-green-50 rounded-lg p-3">
          تم تفعيل التحقق الثنائي بنجاح. من الآن، سيُطلب منك كود من تطبيق المصادقة عند كل تسجيل دخول.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-md">
      <h2 className="font-bold text-lg mb-3">التحقق الثنائي (2FA)</h2>

      {!qrCode ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            يُنصح بشدة بتفعيل التحقق الثنائي لحماية حسابك كمالك للمنصة. ستحتاج تطبيق مصادقة
            مثل Google Authenticator أو Authy على هاتفك.
          </p>
          <button onClick={handleGenerate} disabled={loading}
            className="bg-navy text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60">
            {loading ? 'جارٍ التوليد...' : 'بدء الإعداد'}
          </button>
        </>
      ) : (
        <form onSubmit={handleConfirm}>
          <p className="text-sm text-gray-600 mb-3">
            امسح الرمز ده بتطبيق المصادقة على هاتفك:
          </p>
          <img src={qrCode} alt="QR Code" className="mb-3 border rounded-lg" style={{ width: 200, height: 200 }} />
          <p className="text-xs text-gray-400 mb-4 break-all">
            أو أدخل هذا الكود يدويًا: {secret}
          </p>
          <label className="text-sm text-gray-600">أدخل الكود المكوّن من 6 أرقام لتأكيد التفعيل</label>
          <input
            className="w-full border rounded-lg px-3 py-2 mt-1 mb-4 text-center tracking-widest text-lg"
            maxLength={6} value={code} onChange={e => setCode(e.target.value)} required autoFocus
          />
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <button disabled={loading} className="bg-accent text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60">
            {loading ? 'جارٍ التأكيد...' : 'تأكيد التفعيل'}
          </button>
        </form>
      )}
    </div>
  );
}
