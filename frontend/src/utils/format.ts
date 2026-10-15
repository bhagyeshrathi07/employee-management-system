import type { Department } from '../types/employee';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const preciseCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Formats a salary as whole-rupee INR, e.g. `₹18,50,000`. */
export function formatCurrency(value: number | string | null | undefined, precise = false): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return '—';
  }
  return (precise ? preciseCurrencyFormatter : currencyFormatter).format(numeric);
}

/**
 * Parses an ISO `YYYY-MM-DD` string as a local date (avoids the UTC shift that
 * `new Date('2019-03-11')` would introduce in negative-offset time zones).
 */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `2019-03-11` -> `11 Mar 2019` */
export function formatDate(value: string | null | undefined): string {
  const date = parseIsoDate(value);
  return date ? dateFormatter.format(date) : '—';
}

/** `2024-01-15T09:30:00` -> `15 Jan 2024, 09:30` */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

/** Human readable tenure since the joining date, e.g. `5 yrs 7 mos` or `3 mos`. */
export function formatTenure(dateOfJoining: string | null | undefined, now: Date = new Date()): string {
  const start = parseIsoDate(dateOfJoining);
  if (!start || start > now) {
    return '—';
  }
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) {
    months -= 1;
  }
  if (months < 1) {
    return 'Less than a month';
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  }
  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} ${remainingMonths === 1 ? 'mo' : 'mos'}`);
  }
  return parts.join(' ');
}

/** `Aarav Sharma` -> `AS` */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) {
    return '?';
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

/** Tailwind classes for the department badge colours. */
export const DEPARTMENT_BADGE_CLASSES: Record<Department, string> = {
  ENGINEERING: 'bg-indigo-100 text-indigo-800',
  PRODUCT: 'bg-violet-100 text-violet-800',
  DESIGN: 'bg-pink-100 text-pink-800',
  MARKETING: 'bg-amber-100 text-amber-800',
  SALES: 'bg-sky-100 text-sky-800',
  HR: 'bg-rose-100 text-rose-800',
  FINANCE: 'bg-emerald-100 text-emerald-800',
  OPERATIONS: 'bg-teal-100 text-teal-800',
};

/** Tailwind classes for the avatar circle per department. */
export const DEPARTMENT_AVATAR_CLASSES: Record<Department, string> = {
  ENGINEERING: 'bg-indigo-600',
  PRODUCT: 'bg-violet-600',
  DESIGN: 'bg-pink-600',
  MARKETING: 'bg-amber-600',
  SALES: 'bg-sky-600',
  HR: 'bg-rose-600',
  FINANCE: 'bg-emerald-600',
  OPERATIONS: 'bg-teal-600',
};
