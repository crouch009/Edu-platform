import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { TeacherLayout } from './TeacherLayout';

export function TeacherSettingsPage() {
  return (
    <TeacherLayout>
      <h1 className="text-xl font-bold text-navy mb-6">الإعدادات</h1>
      <ChangePasswordForm />
    </TeacherLayout>
  );
}
