import { createContext, useContext, useState, ReactNode } from 'react';

export interface CurrentStudent {
  id: string;
  name: string;
}

interface StudentAuthContextValue {
  student: CurrentStudent | null;
  setStudent: (s: CurrentStudent | null) => void;
}

const StudentAuthContext = createContext<StudentAuthContextValue | undefined>(undefined);

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudentState] = useState<CurrentStudent | null>(() => {
    const raw = localStorage.getItem('studentInfo');
    return raw ? JSON.parse(raw) : null;
  });

  function setStudent(s: CurrentStudent | null) {
    setStudentState(s);
    if (s) localStorage.setItem('studentInfo', JSON.stringify(s));
    else localStorage.removeItem('studentInfo');
  }

  return <StudentAuthContext.Provider value={{ student, setStudent }}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuth() {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) throw new Error('useStudentAuth must be used within StudentAuthProvider');
  return ctx;
}
