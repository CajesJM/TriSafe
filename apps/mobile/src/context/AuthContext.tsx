import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { AccountType, SessionUser } from "../models/trisafe";
import { trisafeApi } from "../services/trisafeApi";

type AuthContextValue = {
  user: SessionUser | null;
  restoring: boolean;
  login: (
    identifier: string,
    password: string,
    accountType: AccountType,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<SessionUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    trisafeApi
      .restoreSession()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      restoring,
      async login(identifier, password, accountType) {
        const session = await trisafeApi.login(
          identifier,
          password,
          accountType,
        );
        setUser(session.user);
      },
      async logout() {
        await trisafeApi.logout();
        setUser(null);
      },
      async refreshUser() {
        const profile = await trisafeApi.profile();
        setUser(profile);
        return profile;
      },
    }),
    [restoring, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
