import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { TwoFactorSetup } from '../../components/TwoFactorSetup';
import { PlatformBrandingForm } from '../../components/PlatformBrandingForm';
import { OwnerLayout } from './OwnerLayout';

export function OwnerSettingsPage() {
  return (
    <OwnerLayout>
      <h1 className="text-2xl font-bold text-navy mb-6">الإعدادات</h1>
      <div className="flex flex-col gap-6">
        <PlatformBrandingForm />
        <ChangePasswordForm />
        <TwoFactorSetup />
      </div>
    </OwnerLayout>
  );
}
