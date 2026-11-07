import { useCallback, useEffect, useState } from "react";

// Runs an async loader and tracks loading / error / data. Pass a stable
// function (module-level, or wrapped in useCallback) so it only reruns when
// the loader changes or reload() is called. Data is kept while reloading.
export function useAsync(loader) {
  const [attempt, setAttempt] = useState(0);
  // `loader`/`attempt` record which request produced the stored result
  const [state, setState] = useState({ loader: null, attempt: -1, status: "loading", data: undefined, error: null });

  useEffect(() => {
    let active = true;

    loader().then(
      (data) => active && setState({ loader, attempt, status: "success", data, error: null }),
      (error) => active && setState((current) => ({ ...current, loader, attempt, status: "error", error }))
    );

    return () => {
      active = false;
    };
  }, [loader, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  // Update data locally (e.g. after a delete) without refetching
  const setData = useCallback(
    (update) =>
      setState((current) => ({
        ...current,
        data: typeof update === "function" ? update(current.data) : update
      })),
    []
  );

  // While a newer request is in flight, the stored result belongs to an older one
  const settled = state.loader === loader && state.attempt === attempt;

  return {
    data: state.data,
    error: settled ? state.error : null,
    loading: !settled,
    failed: settled && state.status === "error",
    reload,
    setData
  };
}
