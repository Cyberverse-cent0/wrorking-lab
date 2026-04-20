import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

function getToken() {
  return localStorage.getItem("scholarforge_token");
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useQuery<T>(url: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(url);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url, ...deps]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

export function useMutation<T, V = any>(
  mutationFn: (variables: V) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (variables: V) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn(variables);
      options.onSuccess?.(result);
      return result;
    } catch (e: any) {
      const errorMessage = e.message || "An error occurred";
      setError(errorMessage);
      options.onError?.(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, options.onSuccess, options.onError]);

  return { mutate, loading, error };
}

// Simple query client for invalidating queries
const queryClient = {
  cache: new Map<string, any>(),
  invalidateQueries: (queryKey: string | string[]) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    queryClient.cache.delete(key);
  },
  setQueryData: (queryKey: string | string[], data: any) => {
    const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    queryClient.cache.set(key, data);
  }
};

export function useQueryClient() {
  return queryClient;
}

export { apiFetch };
