import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  ApiError,
  AuthUser,
  DepartmentSummary,
  Employee,
  EmployeeFilterParams,
  EmployeeQueryParams,
  EmployeeRequest,
  PagedResponse,
} from '../types/employee';

declare module 'axios' {
  // Allows individual requests (e.g. the login probe) to opt out of the global 401 handler.
  export interface AxiosRequestConfig {
    skipUnauthorizedHandler?: boolean;
  }
}

/**
 * Relative by default so the same build works behind the Vite dev proxy (`/api` -> :8080)
 * and behind nginx in Docker (`/api` -> backend:8080). Override with VITE_API_BASE_URL.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

// -------------------------------------------------------------------------------------------------
// Basic Auth token handling
// -------------------------------------------------------------------------------------------------

let authToken: string | null = null;

/** Encodes `username:password` as a Basic Auth token (UTF-8 safe). */
export function encodeBasicToken(username: string, password: string): string {
  const raw = `${username}:${password}`;
  const bytes = new TextEncoder().encode(raw);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

/** Sets (or clears) the token injected into every request's Authorization header. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// -------------------------------------------------------------------------------------------------
// 401 listener
// -------------------------------------------------------------------------------------------------

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/**
 * Registers a callback fired whenever an authenticated request is rejected with 401
 * (expired / invalid credentials). Returns an unsubscribe function.
 */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

// -------------------------------------------------------------------------------------------------
// Axios instance
// -------------------------------------------------------------------------------------------------

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json, text/csv, */*',
  },
});

api.interceptors.request.use((config) => {
  if (authToken && !config.headers.Authorization) {
    config.headers.Authorization = `Basic ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const skip = error.config?.skipUnauthorizedHandler === true;
    if (status === 401 && !skip) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    return Promise.reject(error);
  },
);

// -------------------------------------------------------------------------------------------------
// Error helpers
// -------------------------------------------------------------------------------------------------

function fallbackMessageForStatus(status: number): string {
  switch (status) {
    case 401:
      return 'Invalid username or password';
    case 403:
      return 'The server refused this request (forbidden). Check CORS / permissions.';
    case 404:
      return 'The requested resource was not found';
    case 500:
      return 'The server encountered an unexpected error';
    default:
      return `Request failed with status ${status}`;
  }
}

function isApiErrorBody(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).message === 'string' &&
    typeof (value as ApiError).status === 'number'
  );
}

/**
 * Normalises any thrown value into the backend's {@link ApiError} shape so UI code can
 * always read `message` and `validationErrors`.
 */
export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const response = error.response;
    if (response && isApiErrorBody(response.data)) {
      return response.data;
    }
    if (response) {
      return {
        status: response.status,
        error: response.statusText || 'Request failed',
        message: fallbackMessageForStatus(response.status),
      };
    }
    return {
      status: 0,
      error: 'Network Error',
      message: 'Unable to reach the server. Please check that the backend is running.',
    };
  }
  return {
    status: 0,
    error: 'Error',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
  };
}

// -------------------------------------------------------------------------------------------------
// Query param helpers
// -------------------------------------------------------------------------------------------------

type QueryValue = string | number | boolean | undefined | null;

/** Removes undefined / null / empty-string values so the backend sees clean optional params. */
export function cleanParams<T extends Record<string, QueryValue>>(params: T): Partial<T> {
  const result: Partial<T> = {};
  (Object.keys(params) as Array<keyof T>).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return;
    }
    result[key] = value;
  });
  return result;
}

// -------------------------------------------------------------------------------------------------
// Auth
// -------------------------------------------------------------------------------------------------

/**
 * Verifies a username / password pair against `GET /auth/me`. The request bypasses the global
 * 401 listener so a failed login does not trigger a "session expired" logout.
 */
export async function verifyCredentials(username: string, password: string): Promise<AuthUser> {
  const token = encodeBasicToken(username, password);
  const config: AxiosRequestConfig = {
    headers: { Authorization: `Basic ${token}` },
    skipUnauthorizedHandler: true,
  };
  const response = await api.get<AuthUser>('/auth/me', config);
  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<AuthUser>('/auth/me');
  return response.data;
}

// -------------------------------------------------------------------------------------------------
// Employees
// -------------------------------------------------------------------------------------------------

export async function getEmployees(params: EmployeeQueryParams = {}): Promise<PagedResponse<Employee>> {
  const response = await api.get<PagedResponse<Employee>>('/employees', {
    params: cleanParams({
      search: params.search,
      department: params.department,
      status: params.status,
      page: params.page ?? 0,
      size: params.size ?? 10,
      sortBy: params.sortBy ?? 'id',
      sortDir: params.sortDir ?? 'asc',
    }),
  });
  return response.data;
}

export async function getEmployeeById(id: number | string): Promise<Employee> {
  const response = await api.get<Employee>(`/employees/${id}`);
  return response.data;
}

export async function createEmployee(payload: EmployeeRequest): Promise<Employee> {
  const response = await api.post<Employee>('/employees', payload);
  return response.data;
}

export async function updateEmployee(id: number | string, payload: EmployeeRequest): Promise<Employee> {
  const response = await api.put<Employee>(`/employees/${id}`, payload);
  return response.data;
}

export async function deleteEmployee(id: number | string): Promise<void> {
  await api.delete<void>(`/employees/${id}`);
}

// -------------------------------------------------------------------------------------------------
// Departments
// -------------------------------------------------------------------------------------------------

export async function getDepartments(): Promise<DepartmentSummary[]> {
  const response = await api.get<DepartmentSummary[]>('/departments');
  return response.data;
}

// -------------------------------------------------------------------------------------------------
// CSV export
// -------------------------------------------------------------------------------------------------

/** Extracts `filename="x.csv"` (or `filename=x.csv`) from a Content-Disposition header. */
export function parseFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return fallback;
    }
  }
  const plainMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return plainMatch?.[1]?.trim() || fallback;
}

/** Triggers a browser download for an in-memory Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser a tick to start the download before revoking the object URL.
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads `employees.csv` from the export endpoint, honouring the active filters.
 * Returns the filename that was used for the download.
 */
export async function exportEmployeesCsv(params: EmployeeFilterParams = {}): Promise<string> {
  const response = await api.get<Blob>('/employees/export/csv', {
    params: cleanParams({
      search: params.search,
      department: params.department,
      status: params.status,
    }),
    responseType: 'blob',
    headers: { Accept: 'text/csv' },
  });
  const header = response.headers['content-disposition'] as string | undefined;
  const filename = parseFilename(header, 'employees.csv');
  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data as unknown as BlobPart], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
  return filename;
}
