import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

// "Cancel" / "Back": return to the previous page inside the app, or to
// `fallback` when the page was opened directly.
export function useGoBack(fallback = "/") {
  const navigate = useNavigate();

  return useCallback(() => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }, [navigate, fallback]);
}
