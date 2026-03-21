// ── Global timeout wrapper for ALL async operations ──────────
// Prevents infinite loading on slow network / missing tables

export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 8000,
  fallback: T
): Promise<T> {
  const timeout = new Promise<T>(resolve =>
    setTimeout(() => resolve(fallback), ms)
  );
  return Promise.race([promise, timeout]);
}

// Wrap any fetch call with a timeout
export async function safeFetch(
  url: string,
  options?: RequestInit,
  timeoutMs = 8000
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Wrap any Supabase query with a timeout
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  timeoutMs = 8000
): Promise<{ data: T | null; error: any }> {
  return Promise.race([
    queryFn(),
    new Promise<{ data: null; error: any }>(resolve =>
      setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), timeoutMs)
    ),
  ]);
}
