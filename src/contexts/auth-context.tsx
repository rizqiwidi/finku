'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_LAST_ACTIVITY_KEY = 'finku:last-activity';
const SESSION_LAST_REFRESH_KEY = 'finku:last-refresh';
const SESSION_IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;
const SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const SESSION_ACTIVITY_THROTTLE_MS = 30 * 1000;

function getStoredTimestamp(key: string) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? value : 0;
}

function persistTimestamp(key: string, value: number) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, String(value));
}

function clearSessionTimestamps() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
  window.localStorage.removeItem(SESSION_LAST_REFRESH_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const lastActivityRef = useRef(0);
  const lastRefreshRef = useRef(0);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const logout = useCallback(
    async (options?: { skipRequest?: boolean }) => {
      try {
        if (!options?.skipRequest) {
          await fetch('/api/auth/logout', { method: 'POST' });
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        clearSessionTimestamps();
        lastActivityRef.current = 0;
        lastRefreshRef.current = 0;
        refreshInFlightRef.current = null;
        setUser(null);
        router.refresh();
      }
    },
    [router]
  );

  const refreshSession = useCallback(
    async (force = false) => {
      if (!user) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastRefreshRef.current < SESSION_REFRESH_INTERVAL_MS) {
        return;
      }

      if (refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }

      const request = fetch('/api/auth/refresh', {
        method: 'POST',
      })
        .then(async (response) => {
          if (!response.ok) {
            await logout();
            return;
          }

          const data = (await response.json()) as { user?: User };
          if (data.user) {
            setUser(data.user);
          }

          lastRefreshRef.current = now;
          persistTimestamp(SESSION_LAST_REFRESH_KEY, now);
        })
        .catch(async (error) => {
          console.error('Session refresh error:', error);
          await logout();
        })
        .finally(() => {
          refreshInFlightRef.current = null;
        });

      refreshInFlightRef.current = request;
      return request;
    },
    [logout, user]
  );

  const markSessionActive = useCallback(
    (forcePersist = false) => {
      if (!user) {
        return;
      }

      const now = Date.now();
      if (forcePersist || now - lastActivityRef.current >= SESSION_ACTIVITY_THROTTLE_MS) {
        lastActivityRef.current = now;
        persistTimestamp(SESSION_LAST_ACTIVITY_KEY, now);
      }
    },
    [user]
  );

  const checkAuth = useCallback(async () => {
    try {
      const lastActivity = getStoredTimestamp(SESSION_LAST_ACTIVITY_KEY);
      if (lastActivity && Date.now() - lastActivity > SESSION_IDLE_TIMEOUT_MS) {
        await logout();
        return;
      }

      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        const now = Date.now();
        const nextActivity = lastActivity || now;
        const nextRefresh = getStoredTimestamp(SESSION_LAST_REFRESH_KEY) || now;
        lastActivityRef.current = nextActivity;
        lastRefreshRef.current = nextRefresh;
        persistTimestamp(SESSION_LAST_ACTIVITY_KEY, nextActivity);
        persistTimestamp(SESSION_LAST_REFRESH_KEY, nextRefresh);
      } else {
        clearSessionTimestamps();
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      clearSessionTimestamps();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        const now = Date.now();
        lastActivityRef.current = now;
        lastRefreshRef.current = now;
        persistTimestamp(SESSION_LAST_ACTIVITY_KEY, now);
        persistTimestamp(SESSION_LAST_REFRESH_KEY, now);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleActivity = () => {
      markSessionActive(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markSessionActive(true);
        void refreshSession(false);
      }
    };

    const intervalId = window.setInterval(() => {
      const lastActivity = getStoredTimestamp(SESSION_LAST_ACTIVITY_KEY);
      if (lastActivity && Date.now() - lastActivity > SESSION_IDLE_TIMEOUT_MS) {
        void logout();
      }
    }, 60 * 1000);

    markSessionActive(true);

    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('focus', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('focus', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [logout, markSessionActive, refreshSession, user]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, refreshUser: checkAuth, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
