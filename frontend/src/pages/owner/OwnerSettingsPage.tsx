import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { OwnerLayout } from './OwnerLayout';

export function OwnerSettingsPage() {
  return (
    <OwnerLayout>
      <h1 className="text-2xl font-bold text-navy mb-6">الإعدادات</h1>
      <ChangePasswordForm />
    </OwnerLayout>
  );
}
