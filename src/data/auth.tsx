import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { AuthUser } from '@/types/domain';

import { queryClient } from './query-client';
import { source } from './source-instance';

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  useEffect(() => {
    let active = true;
    source
      .getCurrentUser()
      .then((user) => active && setState({ user, isLoading: false }))
      .catch(() => active && setState({ user: null, isLoading: false }));
    const unsubscribe = source.onAuthChange((user) => {
      // ユーザーが変わったら、前のユーザーのデータを残さない
      queryClient.clear();
      setState({ user, isLoading: false });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/** ログイン中のユーザー(未ログインなら null) */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
