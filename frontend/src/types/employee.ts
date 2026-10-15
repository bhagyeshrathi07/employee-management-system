/**
 * Shared domain types mirroring the backend contract (`com.kloudspot.ems.dto`).
 * Keep field names and enum values identical to the Java side.
 */

export const DEPARTMENTS = [
  'ENGINEERING',
  'PRODUCT',
  'DESIGN',
  'MARKETING',
  'SALES',
  'HR',
  'FINANCE',
  'OPERATIONS',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  ENGINEERING: 'Engineering',
  PRODUCT: 'Product',
  DESIGN: 'Design',
  MARKETING: 'Marketing',
  SALES: 'Sales',
  HR: 'Human Resources',
  FINANCE: 'Finance',
  OPERATIONS: 'Operations',
};

export const EMPLOYMENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const STATUS_LABELS: Record<EmploymentStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

/** Employee as returned by the API (`EmployeeResponseDTO`). */
export interface Employee {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: Department;
  designation: string;
  /** ISO date `YYYY-MM-DD` */
  dateOfJoining: string;
  salary: number;
  status: EmploymentStatus;
  /** ISO date-time without zone, e.g. `2024-01-15T09:30:00` */
  createdAt: string;
  updatedAt: string;
}

/** Payload for create / update (`EmployeeRequestDTO`). */
export interface EmployeeRequest {
  /** Optional on create (auto-generated when blank). */
  employeeId?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: Department;
  designation: string;
  dateOfJoining: string;
  salary: number;
  status: EmploymentStatus;
}

/** Generic pagination envelope (`PagedResponse<T>`). */
export interface PagedResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/** Department headcount (`DepartmentSummaryDTO`). */
export interface DepartmentSummary {
  department: Department;
  displayName: string;
  totalEmployees: number;
  activeEmployees: number;
}

/** Standard error envelope (`ErrorResponse`). */
export interface ApiError {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  path?: string;
  validationErrors?: Record<string, string>;
}

/** Response of `GET /api/v1/auth/me`. */
export interface AuthUser {
  username: string;
  authenticated: boolean;
  roles?: string[];
}

export type SortDirection = 'asc' | 'desc';

export type EmployeeSortField =
  | 'id'
  | 'employeeId'
  | 'fullName'
  | 'email'
  | 'department'
  | 'designation'
  | 'dateOfJoining'
  | 'salary'
  | 'status'
  | 'createdAt'
  | 'updatedAt';

/** Filters shared by the list and CSV export endpoints. */
export interface EmployeeFilterParams {
  search?: string;
  department?: Department | '';
  status?: EmploymentStatus | '';
}

/** Full query for `GET /api/v1/employees`. */
export interface EmployeeQueryParams extends EmployeeFilterParams {
  page?: number;
  size?: number;
  sortBy?: EmployeeSortField;
  sortDir?: SortDirection;
}

export function isDepartment(value: unknown): value is Department {
  return typeof value === 'string' && (DEPARTMENTS as readonly string[]).includes(value);
}

export function isEmploymentStatus(value: unknown): value is EmploymentStatus {
  return typeof value === 'string' && (EMPLOYMENT_STATUSES as readonly string[]).includes(value);
}
