import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '../../lib/api';
import { OwnerLayout } from './OwnerLayout';

interface MonthCount { month: string; count: number; }
interface MonthMb { month: string; megabytes: number; }
interface TeacherActivity { teacherId: string; name: string; reportCount: number; studentCount: number; }
interface StatusBreakdown { draft: number; published: number; }

const COLORS = ['#E8821C', '#112444'];

export function OwnerAnalyticsPage() {
  const [reportsOverTime, setReportsOverTime] = useState<MonthCount[]>([]);
  const [storageGrowth, setStorageGrowth] = useState<MonthMb[]>([]);
  const [teacherActivity, setTeacherActivity] = useState<TeacherActivity[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown | null>(null);

  useEffect(() => {
    api.get('/analytics/reports-over-time').then(res => setReportsOverTime(res.data));
    api.get('/analytics/storage-growth').then(res => setStorageGrowth(res.data));
    api.get('/analytics/teacher-activity').then(res => setTeacherActivity(res.data));
    api.get('/analytics/report-status').then(res => setStatusBreakdown(res.data));
  }, []);

  const statusData = statusBreakdown
    ? [
        { name: 'منشور', value: statusBreakdown.published },
        { name: 'مسودة', value: statusBreakdown.draft },
      ]
    : [];

  return (
    <OwnerLayout>
      <h1 className="text-2xl font-bold text-navy mb-6">تحليلات الأداء</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold mb-4">التقارير عبر الوقت (آخر 6 أشهر)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={reportsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#112444" strokeWidth={2} name="عدد التقارير" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold mb-4">نمو التخزين (ميجابايت شهريًا)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={storageGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="megabytes" fill="#E8821C" name="ميجابايت" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold mb-4">نشاط المعلمين (عدد التقارير)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={teacherActivity} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" fontSize={12} width={100} />
              <Tooltip />
              <Bar dataKey="reportCount" fill="#112444" name="عدد التقارير" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold mb-4">حالة التقارير</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b font-bold">تفصيل نشاط المعلمين</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">المعلم</th>
              <th className="text-right p-3">عدد الطلاب</th>
              <th className="text-right p-3">عدد التقارير</th>
            </tr>
          </thead>
          <tbody>
            {teacherActivity.map(t => (
              <tr key={t.teacherId} className="border-t">
                <td className="p-3 font-medium">{t.name}</td>
                <td className="p-3 text-gray-500">{t.studentCount}</td>
                <td className="p-3 text-gray-500">{t.reportCount}</td>
              </tr>
            ))}
            {teacherActivity.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-gray-400">لا يوجد بيانات بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </OwnerLayout>
  );
}
