import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { ParentLayout } from './ParentLayout';

export function ParentSettingsPage() {
  return (
    <ParentLayout>
      <h1 className="text-xl font-bold text-navy mb-6">الإعدادات</h1>
      <ChangePasswordForm />
    </ParentLayout>
  );
}
