import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getImpersonationOriginal, clearImpersonationOriginal, setTokens } from '../lib/api';

export function ImpersonationBanner() {
  const original = getImpersonationOriginal();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  if (!original) return null;

  function handleReturn() {
    setTokens(original!.accessToken, original!.refreshToken);
    localStorage.setItem('user', JSON.stringify(original!.user));
    setUser(original!.user);
    clearImpersonationOriginal();
    navigate('/owner/dashboard');
  }

  return (
    <div className="bg-amber-400 text-amber-950 text-sm px-4 py-2 flex justify-between items-center">
      <span>أنت تتصفح المنصة الآن في وضع معاينة (Impersonation) — أي إجراء تقوم به يُسجَّل باسم هذا الحساب</span>
      <button onClick={handleReturn} className="bg-amber-950 text-white px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap">
        العودة لحسابي
      </button>
    </div>
  );
}
