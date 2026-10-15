import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Hash,
  IndianRupee,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Trash2,
  X,
} from 'lucide-react';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { deleteEmployee, extractApiError, getEmployeeById } from '../api/employeeApi';
import { DEPARTMENT_LABELS, STATUS_LABELS, type Employee } from '../types/employee';
import {
  DEPARTMENT_AVATAR_CLASSES,
  DEPARTMENT_BADGE_CLASSES,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTenure,
  getInitials,
} from '../utils/format';

interface FlashMessage {
  type: 'success' | 'error';
  text: string;
}

interface LocationState {
  flash?: FlashMessage;
}

interface DetailItemProps {
  icon: JSX.Element;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function DetailItem({ icon, label, value, mono = false }: DetailItemProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className={`mt-0.5 break-words text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
      </div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  const [flash, setFlash] = useState<FlashMessage | null>(
    () => (location.state as LocationState | null)?.flash ?? null,
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEmployeeById(id)
      .then((data) => {
        if (!cancelled) {
          setEmployee(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const apiError = extractApiError(err);
          setError({ status: apiError.status, message: apiError.message });
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
  }, [id]);

  useEffect(() => {
    if ((location.state as LocationState | null)?.flash) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!flash) {
      return undefined;
    }
    const timer = window.setTimeout(() => setFlash(null), 6000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const closeDelete = useCallback((): void => {
    setDeleteOpen(false);
    setDeleteError(null);
  }, []);

  const confirmDelete = async (): Promise<void> => {
    if (!employee) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteEmployee(employee.id);
      navigate('/employees', {
        replace: true,
        state: {
          flash: { type: 'success', text: `${employee.fullName} (${employee.employeeId}) was deleted.` },
        },
      });
    } catch (err) {
      setDeleteError(extractApiError(err).message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
        <span className="sr-only">Loading employee…</span>
      </div>
    );
  }

  if (error || !employee) {
    const notFound = error?.status === 404;
    return (
      <div className="mx-auto max-w-xl">
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-lg font-semibold text-slate-900">
            {notFound ? 'Employee not found' : 'Could not load employee'}
          </p>
          <p className="text-sm text-slate-500">
            {notFound ? `No employee exists with id ${id}.` : error?.message ?? 'Unknown error'}
          </p>
          <Link to="/employees" className="btn-secondary mt-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to employees
          </Link>
        </div>
      </div>
    );
  }

  const isActive = employee.status === 'ACTIVE';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/employees" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to employees
      </Link>

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

      {/* Header card */}
      <section className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500" aria-hidden="true" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <span
                className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold text-white ring-4 ring-white ${DEPARTMENT_AVATAR_CLASSES[employee.department]}`}
                aria-hidden="true"
              >
                {getInitials(employee.fullName)}
              </span>
              <div className="pb-1">
                <h1 className="text-2xl font-semibold text-slate-900">{employee.fullName}</h1>
                <p className="text-sm text-slate-500">{employee.designation}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/employees/${employee.id}/edit`} className="btn-secondary">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
              <button type="button" onClick={() => setDeleteOpen(true)} className="btn-danger">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`badge ${DEPARTMENT_BADGE_CLASSES[employee.department]}`}>
              {DEPARTMENT_LABELS[employee.department]}
            </span>
            <span className={isActive ? 'badge-active' : 'badge-inactive'}>
              <span
                className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                aria-hidden="true"
              />
              {STATUS_LABELS[employee.status]}
            </span>
            <span className="badge-neutral font-mono">{employee.employeeId}</span>
          </div>
        </div>
      </section>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contact</h2>
          <dl className="mt-4 space-y-4">
            <DetailItem
              icon={<Mail className="h-4 w-4" aria-hidden="true" />}
              label="Email"
              value={
                <a href={`mailto:${employee.email}`} className="text-brand-700 hover:underline">
                  {employee.email}
                </a>
              }
            />
            <DetailItem
              icon={<Phone className="h-4 w-4" aria-hidden="true" />}
              label="Phone"
              value={
                <a href={`tel:${employee.phoneNumber.replace(/[^+\d]/g, '')}`} className="text-brand-700 hover:underline">
                  {employee.phoneNumber}
                </a>
              }
            />
          </dl>
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Employment</h2>
          <dl className="mt-4 space-y-4">
            <DetailItem
              icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
              label="Department"
              value={DEPARTMENT_LABELS[employee.department]}
            />
            <DetailItem
              icon={<Briefcase className="h-4 w-4" aria-hidden="true" />}
              label="Designation"
              value={employee.designation}
            />
            <DetailItem
              icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
              label="Date of joining"
              value={
                <>
                  {formatDate(employee.dateOfJoining)}
                  <span className="ml-2 text-xs text-slate-500">({formatTenure(employee.dateOfJoining)})</span>
                </>
              }
            />
          </dl>
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Compensation</h2>
          <dl className="mt-4 space-y-4">
            <DetailItem
              icon={<IndianRupee className="h-4 w-4" aria-hidden="true" />}
              label="Annual salary"
              value={
                <span className="text-lg font-semibold tabular-nums">{formatCurrency(employee.salary, true)}</span>
              }
            />
          </dl>
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Record</h2>
          <dl className="mt-4 space-y-4">
            <DetailItem
              icon={<Hash className="h-4 w-4" aria-hidden="true" />}
              label="Employee ID / Record ID"
              value={`${employee.employeeId} · #${employee.id}`}
              mono
            />
            <DetailItem
              icon={<Clock className="h-4 w-4" aria-hidden="true" />}
              label="Created"
              value={formatDateTime(employee.createdAt)}
            />
            <DetailItem
              icon={<Clock className="h-4 w-4" aria-hidden="true" />}
              label="Last updated"
              value={formatDateTime(employee.updatedAt)}
            />
          </dl>
        </section>
      </div>

      <ConfirmDeleteModal
        open={deleteOpen}
        employeeName={employee.fullName}
        employeeCode={employee.employeeId}
        loading={deleting}
        errorMessage={deleteError}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
