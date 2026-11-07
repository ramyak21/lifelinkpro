import { startTransition, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

// Ends the session and leaves for `to` in the same render. Without the shared
// transition, a members-only page would see the signed-out state first and
// redirect to the sign-in page instead.
export function useSignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return useCallback(
    (to = "/") => {
      startTransition(() => {
        signOut();
        navigate(to);
      });
    },
    [signOut, navigate]
  );
}
