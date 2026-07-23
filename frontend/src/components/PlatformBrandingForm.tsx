import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function PlatformBrandingForm() {
  const [siteName, setSiteName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    api.get('/platform-settings').then(res => {
      setSiteName(res.data.siteName || '');
      setLogoUrl(res.data.logoUrl || null);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      await api.put('/platform-settings', { siteName });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/platform-settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(data.logoUrl);
    } catch (err: any) {
      setError(err.response?.data?.message || 'تعذر رفع اللوجو - تأكد أن تخزين الملفات (R2) مُعد على الخادم');
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm p-6 max-w-md">
      <h2 className="font-bold text-lg mb-4">هوية المنصة</h2>

      <label className="text-sm text-gray-600">اسم المدرسة/المنصة (يظهر في لوحات التحكم)</label>
      <input className="w-full border rounded-lg px-3 py-2 mt-1 mb-4"
        value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="مثال: مدرسة النور" />

      <label className="text-sm text-gray-600 block mb-2">اللوجو</label>
      {logoUrl && (
        <img src={`${api.defaults.baseURL?.replace('/api', '')}${logoUrl}`} alt="اللوجو الحالي"
          className="h-16 mb-3 rounded border" />
      )}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleLogoUpload} disabled={uploadingLogo} className="mb-4 block" />
      {uploadingLogo && <p className="text-sm text-gray-500 mb-3">جارٍ رفع اللوجو...</p>}

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {success && <p className="text-green-700 text-sm mb-3 bg-green-50 rounded-lg p-2">تم الحفظ بنجاح</p>}

      <button disabled={saving} className="bg-navy text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-60">
        {saving ? 'جارٍ الحفظ...' : 'حفظ الاسم'}
      </button>
      <p className="text-xs text-gray-400 mt-3">
        ملحوظة: الاسم واللوجو بيظهروا داخل لوحات التحكم بعد تسجيل الدخول فقط، مش في صفحة تسجيل الدخول نفسها
        (لأنها مشتركة بين كل المدارس على المنصة قبل ما نعرف مين بيسجل دخول).
      </p>
    </form>
  );
}
