"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";

interface ResourceState<T> {
  key: string | null;
  data?: T;
  error?: Error;
}

/**
 * Minimal fetch-on-change hook. `key` identifies the request (change it to refetch, null to skip);
 * stale data stays visible while a new request is in flight.
 */
export function useResource<T>(key: string | null, fetcher: () => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>({ key: null });
  const [nonce, setNonce] = useState(0);
  const requestKey = key === null ? null : `${key}#${nonce}`;
  const load = useEffectEvent(fetcher);

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;
    load().then(
      (data) => !cancelled && setState({ key: requestKey, data }),
      (error: Error) => !cancelled && setState((prev) => ({ ...prev, key: requestKey, error })),
    );
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback(
    (update: (current: T) => T) =>
      setState((prev) => (prev.data === undefined ? prev : { ...prev, data: update(prev.data) })),
    [],
  );

  const loading = requestKey !== null && state.key !== requestKey;
  return {
    data: state.data,
    error: loading ? undefined : state.error,
    loading,
    initialLoading: loading && state.data === undefined,
    reload,
    mutate,
  };
}
