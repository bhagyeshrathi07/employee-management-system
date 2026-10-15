import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FilterX,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import {
  deleteEmployee,
  exportEmployeesCsv,
  extractApiError,
  getDepartments,
  getEmployees,
} from '../api/employeeApi';
import {
  DEPARTMENT_LABELS,
  DEPARTMENTS,
  EMPLOYMENT_STATUSES,
  STATUS_LABELS,
  isDepartment,
  isEmploymentStatus,
  type Department,
  type DepartmentSummary,
  type Employee,
  type EmployeeSortField,
  type EmploymentStatus,
  type PagedResponse,
  type SortDirection,
} from '../types/employee';
import {
  DEPARTMENT_AVATAR_CLASSES,
  DEPARTMENT_BADGE_CLASSES,
  formatCurrency,
  formatDate,
  getInitials,
} from '../utils/format';

export const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY: EmployeeSortField = 'id';
const DEFAULT_SORT_DIR: SortDirection = 'asc';

const SORT_FIELDS: readonly EmployeeSortField[] = [
  'id',
  'employeeId',
  'fullName',
  'email',
  'department',
  'designation',
  'dateOfJoining',
  'salary',
  'status',
  'createdAt',
  'updatedAt',
];

interface FlashMessage {
  type: 'success' | 'error';
  text: string;
}

interface LocationState {
  flash?: FlashMessage;
}

interface ParamPatch {
  search?: string;
  department?: Department | '';
  status?: EmploymentStatus | '';
  page?: number;
  size?: number;
  sortBy?: EmployeeSortField;
  sortDir?: SortDirection;
}

function parseNonNegativeInt(value: string | null, fallback: number): number {
  if (value === null) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 ? fallback : parsed;
}

function isSortField(value: string | null): value is EmployeeSortField {
  return value !== null && (SORT_FIELDS as readonly string[]).includes(value);
}

export default function EmployeeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ---- URL-backed query state -----------------------------------------------------------------
  const search = searchParams.get('search') ?? '';
  const departmentParam = searchParams.get('department');
  const department: Department | '' = isDepartment(departmentParam) ? departmentParam : '';
  const statusParam = searchParams.get('status');
  const status: EmploymentStatus | '' = isEmploymentStatus(statusParam) ? statusParam : '';
  const page = parseNonNegativeInt(searchParams.get('page'), 0);
  const sizeParam = parseNonNegativeInt(searchParams.get('size'), DEFAULT_PAGE_SIZE);
  const size = (PAGE_SIZE_OPTIONS as readonly number[]).includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE;
  const sortByParam = searchParams.get('sortBy');
  const sortBy: EmployeeSortField = isSortField(sortByParam) ? sortByParam : DEFAULT_SORT_BY;
  const sortDir: SortDirection = searchParams.get('sortDir') === 'desc' ? 'desc' : DEFAULT_SORT_DIR;

  const updateParams = useCallback(
    (patch: ParamPatch): void => {
      const next = new URLSearchParams(searchParams);
      const apply = (key: string, value: string | number | undefined, defaultValue: string | number): void => {
        if (value === undefined) {
          return;
        }
        if (value === '' || value === defaultValue) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      };
      apply('search', patch.search?.trim(), '');
      apply('department', patch.department, '');
      apply('status', patch.status, '');
      apply('page', patch.page, 0);
      apply('size', patch.size, DEFAULT_PAGE_SIZE);
      apply('sortBy', patch.sortBy, DEFAULT_SORT_BY);
      apply('sortDir', patch.sortDir, DEFAULT_SORT_DIR);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // ---- Debounced search input ------------------------------------------------------------------
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (searchInput.trim() === search) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      updateParams({ search: searchInput, page: 0 });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // `search` and `updateParams` intentionally excluded: only user typing should schedule a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // ---- Data ------------------------------------------------------------------------------------
  const [pageData, setPageData] = useState<PagedResponse<Employee> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEmployees({ search, department, status, page, size, sortBy, sortDir })
      .then((data) => {
        if (!cancelled) {
          setPageData(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(extractApiError(err).message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [search, department, status, page, size, sortBy, sortDir, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    getDepartments()
      .then((data) => {
        if (!cancelled) {
          setDepartments(data);
        }
      })
      .catch(() => {
        // KPI cards are supplementary; the table still works without them.
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Snap back to the last page if the current one no longer exists (e.g. after a delete).
  useEffect(() => {
    if (pageData && pageData.totalPages > 0 && page >= pageData.totalPages) {
      updateParams({ page: pageData.totalPages - 1 });
    }
  }, [pageData, page, updateParams]);

  // ---- Flash messages --------------------------------------------------------------------------
  const [flash, setFlash] = useState<FlashMessage | null>(
    () => (location.state as LocationState | null)?.flash ?? null,
  );

  useEffect(() => {
    if ((location.state as LocationState | null)?.flash) {
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!flash) {
      return undefined;
    }
    const timer = window.setTimeout(() => setFlash(null), 6000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  // ---- Delete ----------------------------------------------------------------------------------
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const closeDeleteModal = useCallback((): void => {
    setDeleteTarget(null);
    setDeleteError(null);
  }, []);

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEmployee(deleteTarget.id);
      setFlash({ type: 'success', text: `${deleteTarget.fullName} (${deleteTarget.employeeId}) was deleted.` });
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setDeleteError(extractApiError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  // ---- Export ----------------------------------------------------------------------------------
  const [exporting, setExporting] = useState(false);

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const filename = await exportEmployeesCsv({ search, department, status });
      setFlash({ type: 'success', text: `Export started: ${filename}` });
    } catch (err) {
      setFlash({ type: 'error', text: `Export failed: ${extractApiError(err).message}` });
    } finally {
      setExporting(false);
    }
  };

  // ---- Derived values --------------------------------------------------------------------------
  const hasFilters = search !== '' || department !== '' || status !== '';
  const employees = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;
  const rangeStart = totalElements === 0 ? 0 : page * size + 1;
  const rangeEnd = totalElements === 0 ? 0 : Math.min(totalElements, page * size + employees.length);

  const kpis = useMemo(() => {
    const total = departments.reduce((sum, item) => sum + item.totalEmployees, 0);
    const active = departments.reduce((sum, item) => sum + item.activeEmployees, 0);
    const staffed = departments.filter((item) => item.totalEmployees > 0).length;
    return { total, active, inactive: total - active, staffed };
  }, [departments]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) {
      return [] as number[];
    }
    const windowSize = 5;
    let start = Math.max(0, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages - 1, start + windowSize - 1);
    start = Math.max(0, end - windowSize + 1);
    const numbers: number[] = [];
    for (let index = start; index <= end; index += 1) {
      numbers.push(index);
    }
    return numbers;
  }, [page, totalPages]);

  const toggleSort = (field: EmployeeSortField): void => {
    if (sortBy === field) {
      updateParams({ sortDir: sortDir === 'asc' ? 'desc' : 'asc', page: 0 });
    } else {
      updateParams({ sortBy: field, sortDir: 'asc', page: 0 });
    }
  };

  const clearFilters = (): void => {
    setSearchInput('');
    updateParams({ search: '', department: '', status: '', page: 0 });
  };

  const renderSortIcon = (field: EmployeeSortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
    );
  };

  const sortableHeader = (field: EmployeeSortField, label: string, extraClass = '') => (
    <th
      scope="col"
      className={`table-head ${extraClass}`}
      aria-sort={sortBy === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1.5 uppercase tracking-wide hover:text-slate-900"
      >
        {label}
        {renderSortIcon(field)}
      </button>
    </th>
  );

  // ---- Render ----------------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter and manage employee records across all departments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="btn-secondary"
            aria-label="Export CSV"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <Link to="/employees/new" className="btn-primary">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add Employee
          </Link>
        </div>
      </div>

      {/* Flash */}
      {flash ? (
        <div className={flash.type === 'success' ? 'alert-success' : 'alert-error'} role="status">
          {flash.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          )}
          <span className="flex-1">{flash.text}</span>
          <button
            type="button"
            onClick={() => setFlash(null)}
            className="rounded p-0.5 hover:bg-black/5"
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {/* KPI cards */}
      <section aria-label="Workforce summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Employees"
          value={kpis.total}
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          accent="bg-brand-50 text-brand-700"
          onClick={hasFilters ? clearFilters : undefined}
        />
        <KpiCard
          label="Active"
          value={kpis.active}
          icon={<UserCheck className="h-5 w-5" aria-hidden="true" />}
          accent="bg-emerald-50 text-emerald-700"
          active={status === 'ACTIVE'}
          onClick={() => updateParams({ status: status === 'ACTIVE' ? '' : 'ACTIVE', page: 0 })}
        />
        <KpiCard
          label="Inactive"
          value={kpis.inactive}
          icon={<UserX className="h-5 w-5" aria-hidden="true" />}
          accent="bg-slate-100 text-slate-700"
          active={status === 'INACTIVE'}
          onClick={() => updateParams({ status: status === 'INACTIVE' ? '' : 'INACTIVE', page: 0 })}
        />
        <KpiCard
          label="Departments Staffed"
          value={`${kpis.staffed} / ${DEPARTMENTS.length}`}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          accent="bg-violet-50 text-violet-700"
        />
      </section>

      {/* Department breakdown */}
      {departments.length > 0 ? (
        <section aria-label="Department breakdown" className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Headcount by department</h2>
            <span className="text-xs text-slate-500">Click a department to filter</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {departments.map((item) => {
              const selected = department === item.department;
              return (
                <button
                  key={item.department}
                  type="button"
                  onClick={() =>
                    updateParams({ department: selected ? '' : item.department, page: 0 })
                  }
                  aria-pressed={selected}
                  className={[
                    'flex flex-col rounded-lg border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    selected
                      ? 'border-brand-500 bg-brand-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span className="truncate text-xs font-medium text-slate-500">{item.displayName}</span>
                  <span className="mt-1 text-xl font-semibold text-slate-900">{item.totalEmployees}</span>
                  <span className="text-xs text-emerald-700">{item.activeEmployees} active</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Filters */}
      <section aria-label="Filters" className="card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_180px_auto] md:items-end">
          <div>
            <label htmlFor="employee-search" className="label">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="employee-search"
                type="text"
                className="input pl-9 pr-9"
                placeholder="Search by name or email"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search employees by name or email"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="department-filter" className="label">
              Department
            </label>
            <select
              id="department-filter"
              className="input"
              value={department}
              onChange={(event) =>
                updateParams({ department: event.target.value as Department | '', page: 0 })
              }
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map((item) => (
                <option key={item} value={item}>
                  {DEPARTMENT_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="label">
              Status
            </label>
            <select
              id="status-filter"
              className="input"
              value={status}
              onChange={(event) =>
                updateParams({ status: event.target.value as EmploymentStatus | '', page: 0 })
              }
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {EMPLOYMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="btn-secondary"
            aria-label="Clear filters"
          >
            <FilterX className="h-4 w-4" aria-hidden="true" />
            Clear Filters
          </button>
        </div>
      </section>

      {/* Table */}
      <section aria-label="Employee list" className="card overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-slate-900">Could not load employees</p>
            <p className="max-w-md text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="btn-secondary"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="relative overflow-x-auto">
              {loading ? (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-white/60"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden="true" />
                  <span className="sr-only">Loading employees…</span>
                </div>
              ) : null}

              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    {sortableHeader('fullName', 'Employee')}
                    {sortableHeader('employeeId', 'Employee ID')}
                    {sortableHeader('department', 'Department')}
                    {sortableHeader('designation', 'Designation')}
                    {sortableHeader('dateOfJoining', 'Joined')}
                    {sortableHeader('salary', 'Salary', 'text-right')}
                    {sortableHeader('status', 'Status')}
                    <th scope="col" className="table-head text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {employees.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Users className="h-6 w-6" aria-hidden="true" />
                          </span>
                          <p className="text-sm font-medium text-slate-900">No employees found</p>
                          <p className="text-sm text-slate-500">
                            {hasFilters
                              ? 'No records match the current search or filters.'
                              : 'Get started by adding your first employee.'}
                          </p>
                          {hasFilters ? (
                            <button type="button" onClick={clearFilters} className="btn-secondary mt-2">
                              <FilterX className="h-4 w-4" aria-hidden="true" />
                              Clear Filters
                            </button>
                          ) : (
                            <Link to="/employees/new" className="btn-primary mt-2">
                              <UserPlus className="h-4 w-4" aria-hidden="true" />
                              Add Employee
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-slate-50">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${DEPARTMENT_AVATAR_CLASSES[employee.department]}`}
                              aria-hidden="true"
                            >
                              {getInitials(employee.fullName)}
                            </span>
                            <div className="min-w-0">
                              <Link
                                to={`/employees/${employee.id}`}
                                className="block truncate font-medium text-slate-900 hover:text-brand-700"
                              >
                                {employee.fullName}
                              </Link>
                              <span className="block truncate text-xs text-slate-500">{employee.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell font-mono text-xs text-slate-600">{employee.employeeId}</td>
                        <td className="table-cell">
                          <span className={`badge ${DEPARTMENT_BADGE_CLASSES[employee.department]}`}>
                            {DEPARTMENT_LABELS[employee.department]}
                          </span>
                        </td>
                        <td className="table-cell">{employee.designation}</td>
                        <td className="table-cell">{formatDate(employee.dateOfJoining)}</td>
                        <td className="table-cell text-right font-medium tabular-nums">
                          {formatCurrency(employee.salary)}
                        </td>
                        <td className="table-cell">
                          <span className={employee.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}>
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                employee.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                              aria-hidden="true"
                            />
                            {STATUS_LABELS[employee.status]}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/employees/${employee.id}`}
                              className="btn-icon"
                              aria-label={`View ${employee.fullName}`}
                              title="View"
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <Link
                              to={`/employees/${employee.id}/edit`}
                              className="btn-icon"
                              aria-label={`Edit ${employee.fullName}`}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(employee)}
                              className="btn-icon hover:!bg-red-50 hover:!text-red-600"
                              aria-label={`Delete ${employee.fullName}`}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span data-testid="pagination-summary">
                  Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
                  <span className="font-medium text-slate-900">{rangeEnd}</span> of{' '}
                  <span className="font-medium text-slate-900">{totalElements}</span>
                </span>
                <label className="flex items-center gap-2">
                  <span className="sr-only sm:not-sr-only">Rows per page</span>
                  <select
                    className="input !w-auto !py-1.5"
                    value={size}
                    onChange={(event) => updateParams({ size: Number(event.target.value), page: 0 })}
                    aria-label="Rows per page"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <nav className="flex items-center gap-1" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => updateParams({ page: page - 1 })}
                  disabled={page === 0 || loading}
                  className="btn-icon"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                {pageNumbers.map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => updateParams({ page: number })}
                    disabled={loading}
                    aria-current={number === page ? 'page' : undefined}
                    className={[
                      'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors',
                      number === page
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    ].join(' ')}
                  >
                    {number + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => updateParams({ page: page + 1 })}
                  disabled={loading || totalPages === 0 || page >= totalPages - 1}
                  className="btn-icon"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </>
        )}
      </section>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        employeeName={deleteTarget?.fullName ?? ''}
        employeeCode={deleteTarget?.employeeId}
        loading={deleting}
        errorMessage={deleteError}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// KPI card
// -------------------------------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: JSX.Element;
  accent: string;
  active?: boolean;
  onClick?: () => void;
}

function KpiCard({ label, value, icon, accent, active = false, onClick }: KpiCardProps) {
  const content = (
    <>
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase leading-tight tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      </div>
    </>
  );

  const baseClass = 'card flex items-center gap-4 p-4 text-left transition-colors';
  const activeClass = active ? ' ring-2 ring-brand-500 ring-offset-1' : '';

  if (!onClick) {
    return <div className={`${baseClass}${activeClass}`}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${baseClass}${activeClass} hover:border-brand-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
    >
      {content}
    </button>
  );
}
