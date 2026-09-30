import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { setUnauthorizedHandler } from '../../shared/api/http';
import {
  createTokenStorage,
  tokenStorage as defaultTokenStorage,
  type TokenStorage,
} from '../../shared/api/token-storage';
import { loginRequest, type LoginCredentials } from './api/auth.api';

type AuthContextValue = {
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  storage?: TokenStorage;
  loginFn?: typeof loginRequest;
};

export function AuthProvider({
  children,
  storage = defaultTokenStorage,
  loginFn = loginRequest,
}: AuthProviderProps) {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    storage.getAccessToken(),
  );

  const logout = useCallback(() => {
    storage.clearAccessToken();
    setAccessToken(null);
  }, [storage]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await loginFn(credentials);
      storage.setAccessToken(response.accessToken);
      setAccessToken(response.accessToken);
    },
    [loginFn, storage],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      navigate('/login', { replace: true });
    });

    return () => {
      setUnauthorizedHandler(undefined);
    };
  }, [logout, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: accessToken !== null,
      login,
      logout,
    }),
    [accessToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

/** Helper de tests: storage en memoria sin tocar localStorage real. */
export function createMemoryTokenStorage(): TokenStorage {
  const store = new Map<string, string>();
  return createTokenStorage({
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  });
}
