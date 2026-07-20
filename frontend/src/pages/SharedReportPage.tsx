import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface SharedReport {
  title: string;
  content: string;
  student: { name: string };
  files: { id: string; fileType: string }[];
}

export function SharedReportPage() {
  const { token } = useParams();
  const [report, setReport] = useState<SharedReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_BASE}/reports/shared/${token}`)
      .then(res => setReport(res.data))
      .catch(err => setError(err.response?.data?.message || 'الرابط غير صالح أو منتهي الصلاحية'));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-sm">
          <p className="text-red-600 font-semibold">{error}</p>
          <p className="text-sm text-gray-500 mt-2">تواصل مع معلم الطالب للحصول على رابط جديد</p>
        </div>
      </div>
    );
  }

  if (!report) return <div className="min-h-screen flex items-center justify-center text-gray-400">جارٍ التحميل...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-xl w-full">
        <h1 className="text-xl font-bold text-navy">{report.title}</h1>
        <p className="text-sm text-gray-500 mb-4">الطالب: {report.student.name}</p>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{report.content}</p>
        <p className="text-xs text-gray-400 mt-6 border-t pt-4">
          هذا رابط مشاركة مؤقت لعرض التقرير فقط. لتحميل الملفات المرفقة، تواصل مع المعلم للحصول على حساب ولي أمر.
        </p>
      </div>
    </div>
  );
}
