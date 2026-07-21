import { Navigate } from 'react-router-dom';
import { useStudentAuth } from '../lib/StudentAuthContext';

export function StudentProtectedRoute({ children }: { children: JSX.Element }) {
  const { student } = useStudentAuth();
  if (!student) return <Navigate to="/student/login" replace />;
  return children;
}
