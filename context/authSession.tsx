import { createContext, useContext, useCallback, useState, useEffect, type PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { useStorageState } from './useStorageState';
import api from '@/services/axios';

interface AuthSession {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    avatar?: string;
  };
  time: string;
  walletSession?: {
    publicKey: string;
    session: string;
    sharedSecret: string; // base64 string
    dappKeyPair: {
      publicKey: string; // base64
      secretKey: string; // base64
    };
  };
}

interface AuthContextType {
  signIn: (session: AuthSession) => void;
  signOut: () => void;
  checkSession: () => Promise<boolean>;
  session: AuthSession | null;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  signIn: () => null,
  signOut: () => null,
  checkSession: async () => false,
  session: null,
  isAuthLoading: false,
});

export function useSession() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isAuthLoading, storedSession], setStoredSession] = useStorageState('authMember');
  const [liveSession, setLiveSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      if (!isAuthLoading && storedSession) {
        try {
          const parsed = JSON.parse(storedSession);
          setLiveSession(parsed);

          const response = await api.get('/auth/validate', {
            headers: { Authorization: parsed.token },
          });

          if (response.status !== 200) {
            throw new Error('Token invalid');
          }

        } catch (error) {
          setLiveSession(null);
          setStoredSession(null);
        }
      }
    };
    validateSession();
  }, [isAuthLoading, storedSession]);

  const signOut = useCallback(() => {
    setLiveSession(null);
    setStoredSession(null);
  }, []);

  const signIn = useCallback(async (sessionData: AuthSession) => {
    setLiveSession(sessionData);
    await setStoredSession(JSON.stringify(sessionData));
  }, []);

  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!liveSession?.token) return false;

    try {
      await api.get('/auth/validate', {
        headers: { Authorization: liveSession.token },
      });
      return true;
    } catch {
      return false;
    }
  }, [liveSession?.token]);

  if (isAuthLoading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        checkSession,
        session: liveSession,
        isAuthLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
