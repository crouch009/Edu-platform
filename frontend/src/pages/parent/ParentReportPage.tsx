import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { ParentLayout } from './ParentLayout';

interface FileRow { id: string; fileType: string; }

interface ReportDetail {
  id: string;
  title: string;
  content: string;
  student: { name: string };
  files: FileRow[];
}

const TYPE_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'video/mp4': 'فيديو',
  'video/quicktime': 'فيديو',
};

export function ParentReportPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState<ReportDetail | null>(null);

  useEffect(() => {
    api.get(`/reports/${reportId}`).then(res => setReport(res.data));
  }, [reportId]);

  async function handleDownload(fileId: string) {
    const { data } = await api.get(`/reports/${reportId}/files/${fileId}/download-link`);
    window.open(data.url, '_blank');
  }

  if (!report) return <ParentLayout><p className="text-gray-400">جارٍ التحميل...</p></ParentLayout>;

  return (
    <ParentLayout>
      <Link to="/parent/dashboard" className="text-navy text-sm mb-4 inline-block">← رجوع</Link>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-xl font-bold text-navy">{report.title}</h1>
        <p className="text-sm text-gray-500 mb-4">الطالب: {report.student.name}</p>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{report.content}</p>
      </div>

      {report.files.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">الملفات المرفقة</h2>
          <div className="flex flex-col gap-2">
            {report.files.map(f => (
              <div key={f.id} className="flex justify-between items-center border rounded-lg p-3">
                <span className="text-sm font-medium">{TYPE_LABEL[f.fileType] || f.fileType}</span>
                <button onClick={() => handleDownload(f.id)} className="text-xs bg-navy text-white rounded-lg px-3 py-1">
                  تحميل
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </ParentLayout>
  );
}
