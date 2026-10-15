import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { encodeBasicToken, onUnauthorized, setAuthToken, verifyCredentials } from '../api/employeeApi';

/** Storage key for the persisted session (survives page reloads within the tab). */
export const AUTH_STORAGE_KEY = 'ems.auth';

interface StoredSession {
  username: string;
  token: string;
}

export interface AuthContextValue {
  /** True when a Basic Auth token is loaded. */
  isAuthenticated: boolean;
  /** Logged-in username, or null. */
  username: string | null;
  /** Set when the session was ended by a 401 from the API rather than an explicit logout. */
  sessionExpired: boolean;
  /** Verifies credentials against the backend and stores them on success. Throws on failure. */
  login: (username: string, password: string) => Promise<void>;
  /** Clears credentials. */
  logout: () => void;
  /** Clears the "session expired" notice (e.g. once the login page has displayed it). */
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.username === 'string' && typeof parsed.token === 'string') {
      return { username: parsed.username, token: parsed.token };
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession | null): void {
  try {
    if (session) {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode / disabled); the in-memory session still works.
  }
}

// Load any persisted token synchronously so the very first render is already authenticated and
// protected routes do not flash the login page on refresh.
const initialSession = readStoredSession();
if (initialSession) {
  setAuthToken(initialSession.token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(initialSession);
  const [sessionExpired, setSessionExpired] = useState(false);

  const logout = useCallback(() => {
    setAuthToken(null);
    writeStoredSession(null);
    setSession(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const trimmedUsername = username.trim();
    const user = await verifyCredentials(trimmedUsername, password);
    const token = encodeBasicToken(trimmedUsername, password);
    const nextSession: StoredSession = { username: user.username || trimmedUsername, token };
    setAuthToken(token);
    writeStoredSession(nextSession);
    setSession(nextSession);
    setSessionExpired(false);
  }, []);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  // Any 401 from an authenticated call means the stored credentials are no longer valid.
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setSession((current) => {
        if (current) {
          setSessionExpired(true);
        }
        return null;
      });
      setAuthToken(null);
      writeStoredSession(null);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: session !== null,
      username: session?.username ?? null,
      sessionExpired,
      login,
      logout,
      clearSessionExpired,
    }),
    [session, sessionExpired, login, logout, clearSessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
