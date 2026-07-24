import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { OwnerLayout } from './OwnerLayout';

interface LogRow {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string; role: string } | null;
}

export function OwnerAuditLogPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [actionFilter, setActionFilter] = useState('');

  function load() {
    api.get('/audit-logs', { params: { action: actionFilter || undefined } }).then(res => setLogs(res.data));
  }
  useEffect(load, [actionFilter]);

  return (
    <OwnerLayout>
      <h1 className="text-2xl font-bold text-navy mb-6">سجل النشاط</h1>

      <input
        placeholder="فلترة حسب نوع الإجراء (مثال: login, file, report)"
        className="border rounded-lg px-3 py-2 mb-4 w-full max-w-md"
        value={actionFilter}
        onChange={e => setActionFilter(e.target.value)}
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">التاريخ</th>
              <th className="text-right p-3">المستخدم</th>
              <th className="text-right p-3">الإجراء</th>
              <th className="text-right p-3">المورد</th>
              <th className="text-right p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-t">
                <td className="p-3 text-gray-500">{new Date(log.createdAt).toLocaleString('ar-EG')}</td>
                <td className="p-3">{log.user ? `${log.user.name} (${log.user.role})` : '—'}</td>
                <td className="p-3 font-mono text-xs">{log.action}</td>
                <td className="p-3 text-gray-500 text-xs">{log.resourceType ? `${log.resourceType}:${log.resourceId?.slice(0, 8)}` : '—'}</td>
                <td className="p-3 text-gray-500">{log.ipAddress || '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">لا يوجد سجلات</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </OwnerLayout>
  );
}
