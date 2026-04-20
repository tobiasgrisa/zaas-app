/**
 * apiFetch - wrapper around fetch that:
 *  1. Reads the user session from localStorage (set on login).
 *  2. Sends the company_id as a header so the backend can scope queries.
 */

function getSession(): { company_id?: string | number; token?: string } {
  try {
    const raw = localStorage.getItem('erp-session');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const session = getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (session.company_id !== undefined) {
    headers['x-company-id'] = String(session.company_id);
  }

  if (session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error || `HTTP ${response.status}`);
  }

  return response.json();
}
