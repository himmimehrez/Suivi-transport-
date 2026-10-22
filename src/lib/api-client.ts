import { User } from '../types/index.ts';

const DEMO_USER_KEY = 'translog_demo_user_uid';

export function getActiveUserUid(): string | null {
  return localStorage.getItem(DEMO_USER_KEY);
}

export function setActiveUserUid(uid: string | null) {
  if (uid) {
    localStorage.setItem(DEMO_USER_KEY, uid);
  } else {
    localStorage.removeItem(DEMO_USER_KEY);
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const activeUid = getActiveUserUid();
  if (activeUid) {
    headers.set('x-demo-user-uid', activeUid);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Erreur réseau: ${response.status}`;
    try {
      const data = await response.json();
      if (data && data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  get: (url: string) => fetchWithAuth(url, { method: 'GET' }),
  post: (url: string, body?: any) =>
    fetchWithAuth(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: (url: string, body?: any) =>
    fetchWithAuth(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (url: string) => fetchWithAuth(url, { method: 'DELETE' }),
};
