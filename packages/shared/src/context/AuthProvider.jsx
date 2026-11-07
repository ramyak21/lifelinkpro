import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext";
import { SESSION_EXPIRED_EVENT } from "../services/api";
import { clearSession, readStoredSession, sessionKeys, storeSession, updateStoredUser } from "../services/session";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredSession);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Called with the /api/auth/login response: { token, user }
  const startSession = useCallback(({ token, user: account }) => {
    storeSession(token, account);
    setUser(account);
    setSessionExpired(false);
  }, []);

  // After the profile changes (e.g. PATCH /api/me), keep the stored copy in step
  const updateUser = useCallback((changes) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...changes };
      updateStoredUser(next);
      return next;
    });
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  // An authenticated request returned 401: the token expired or the account was removed
  useEffect(() => {
    const handleExpired = () => {
      signOut();
      setSessionExpired(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [signOut]);

  // Keep tabs of the same portal in sync when the user signs in or out in another tab
  useEffect(() => {
    const { token, user: userKey } = sessionKeys();
    const handleStorage = (event) => {
      if (event.key === token || event.key === userKey || event.key === null) {
        setUser(readStoredSession());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      sessionExpired,
      startSession,
      updateUser,
      signOut,
      clearSessionExpired
    }),
    [user, sessionExpired, startSession, updateUser, signOut, clearSessionExpired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
