import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { TeacherLayout } from './TeacherLayout';

interface FileRow {
  id: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface ReportDetail {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
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

export function TeacherReportPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    api.get(`/reports/${reportId}`).then(res => setReport(res.data));
  }
  useEffect(load, [reportId]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/reports/${reportId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل رفع الملف');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload(fileId: string) {
    const { data } = await api.get(`/reports/${reportId}/files/${fileId}/download-link`);
    window.open(data.url, '_blank');
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm('حذف هذا الملف؟')) return;
    await api.delete(`/reports/${reportId}/files/${fileId}`);
    load();
  }

  async function handlePublishToggle() {
    if (!report) return;
    const newStatus = report.status === 'published' ? 'draft' : 'published';
    await api.patch(`/reports/${reportId}`, { status: newStatus });
    load();
  }

  async function handleGenerateShareLink() {
    const { data } = await api.post(`/reports/${reportId}/share-link`);
    const url = `${window.location.origin}/shared/${data.token}`;
    setShareUrl(url);
  }

  function formatSize(bytes: number) {
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} كيلوبايت` : `${mb.toFixed(1)} ميجابايت`;
  }

  if (!report) return <TeacherLayout><p className="text-gray-400">جارٍ التحميل...</p></TeacherLayout>;

  return (
    <TeacherLayout>
      <Link to="/teacher/dashboard" className="text-navy text-sm mb-4 inline-block">← رجوع لطلابي</Link>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold text-navy">{report.title}</h1>
            <p className="text-sm text-gray-500">الطالب: {report.student.name}</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${report.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {report.status === 'published' ? 'منشور' : 'مسودة'}
          </span>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{report.content}</p>

        <div className="flex gap-3 mt-5 pt-5 border-t">
          <button onClick={handlePublishToggle} className="border border-navy text-navy px-4 py-2 rounded-lg text-sm font-semibold">
            {report.status === 'published' ? 'إرجاع لمسودة' : 'نشر للطالب/ولي الأمر'}
          </button>
          <button onClick={handleGenerateShareLink} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold">
            توليد رابط مشاركة لولي الأمر
          </button>
        </div>

        {shareUrl && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-500 mb-1">صالح لمدة ٧ أيام:</p>
            <code className="break-all text-navy">{shareUrl}</code>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">الملفات المرفقة</h2>
          <label className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer">
            {uploading ? 'جارٍ الرفع...' : '+ رفع ملف'}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov" disabled={uploading} />
          </label>
        </div>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex flex-col gap-2">
          {report.files.length === 0 && <p className="text-gray-400 text-sm">لا يوجد ملفات مرفقة</p>}
          {report.files.map(f => (
            <div key={f.id} className="flex justify-between items-center border rounded-lg p-3">
              <div>
                <span className="font-medium text-sm">{TYPE_LABEL[f.fileType] || f.fileType}</span>
                <span className="text-xs text-gray-400 mr-2">{formatSize(f.fileSize)}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDownload(f.id)} className="text-xs border rounded-lg px-3 py-1">
                  تحميل
                </button>
                <button onClick={() => handleDeleteFile(f.id)} className="text-xs border border-red-300 text-red-600 rounded-lg px-3 py-1">
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TeacherLayout>
  );
}
