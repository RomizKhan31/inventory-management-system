export class ApiClientError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public details?: unknown;

  constructor(message: string, statusCode: number, errorCode?: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const TOKEN_STORAGE_KEY = 'walton_ims_token';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Automatically attach Authorization header if token exists and not already provided
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // If unauthorized or account deactivated, clear token automatically
      if (response.status === 401 || (response.status === 403 && data?.errorCode === 'ACCOUNT_DEACTIVATED')) {
        removeToken();
      }

      let errorMessage = data?.message || `Request failed with status: ${response.status}`;
      if (Array.isArray(data?.details) && data.details.length > 0) {
        const detailMessages = data.details
          .map((d: any) => d?.message || (typeof d === 'string' ? d : ''))
          .filter(Boolean);
        if (detailMessages.length > 0) {
          errorMessage = detailMessages.join(', ');
        }
      }
      throw new ApiClientError(
        errorMessage,
        response.status,
        data?.errorCode,
        data?.details
      );
    }

    return data as T;
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Network error occurred while contacting backend API';
    throw new ApiClientError(
      message,
      0,
      'NETWORK_ERROR'
    );
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
