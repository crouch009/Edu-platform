import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { OwnerLayout } from './OwnerLayout';

interface Metrics {
  teacherCount: number;
  parentCount: number;
  activeUserCount: number;
  reportCount: number;
  totalStorageBytes: number;
  loginsLast30Days: number;
}

export function OwnerDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    api.get('/users/dashboard-metrics').then(res => setMetrics(res.data));
  }, []);

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
  }

  const cards = metrics ? [
    { label: 'عدد المعلمين', value: metrics.teacherCount },
    { label: 'أولياء الأمور', value: metrics.parentCount },
    { label: 'مستخدمون نشطون', value: metrics.activeUserCount },
    { label: 'إجمالي التقارير', value: metrics.reportCount },
    { label: 'مساحة التخزين المستخدمة', value: formatBytes(metrics.totalStorageBytes) },
    { label: 'محاولات دخول (٣٠ يوم)', value: metrics.loginsLast30Days },
  ] : [];

  return (
    <OwnerLayout>
      <h1 className="text-2xl font-bold text-navy mb-6">لوحة تحكم المالك</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="text-2xl font-bold text-navy mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link to="/owner/users" className="bg-navy text-white px-4 py-2 rounded-lg font-semibold">
          إدارة المستخدمين
        </Link>
        <Link to="/owner/analytics" className="border border-navy text-navy px-4 py-2 rounded-lg font-semibold">
          تحليلات الأداء
        </Link>
        <Link to="/owner/audit-log" className="border border-navy text-navy px-4 py-2 rounded-lg font-semibold">
          سجل النشاط
        </Link>
      </div>
    </OwnerLayout>
  );
}
