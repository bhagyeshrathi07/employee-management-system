import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Hash,
  IndianRupee,
  Loader2,
  Mail,
  Phone,
  Save,
  User,
} from 'lucide-react';
import { createEmployee, extractApiError, getEmployeeById, updateEmployee } from '../api/employeeApi';
import {
  DEPARTMENT_LABELS,
  DEPARTMENTS,
  EMPLOYMENT_STATUSES,
  STATUS_LABELS,
  type Department,
  type Employee,
  type EmployeeRequest,
  type EmploymentStatus,
} from '../types/employee';

interface FormValues {
  employeeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: Department | '';
  designation: string;
  dateOfJoining: string;
  salary: string;
  status: EmploymentStatus;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_FORM: FormValues = {
  employeeId: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  department: '',
  designation: '',
  dateOfJoining: '',
  salary: '',
  status: 'ACTIVE',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\-\s()]{7,20}$/;
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9-]{3,20}$/;
const SALARY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

/** Client-side validation mirroring the backend Jakarta constraints. */
export function validateEmployeeForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  const employeeId = values.employeeId.trim();
  if (employeeId && !EMPLOYEE_ID_PATTERN.test(employeeId)) {
    errors.employeeId = 'Employee ID must be 3-20 characters using letters, digits or hyphens';
  }

  const fullName = values.fullName.trim();
  if (!fullName) {
    errors.fullName = 'Full name is required';
  } else if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName = 'Full name must be between 2 and 100 characters';
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(email) || email.length > 150) {
    errors.email = 'Email must be a valid email address';
  }

  const phoneNumber = values.phoneNumber.trim();
  if (!phoneNumber) {
    errors.phoneNumber = 'Phone number is required';
  } else if (!PHONE_PATTERN.test(phoneNumber)) {
    errors.phoneNumber = 'Use 7-20 digits, spaces, hyphens, parentheses and an optional leading +';
  }

  if (!values.department) {
    errors.department = 'Department is required';
  }

  const designation = values.designation.trim();
  if (!designation) {
    errors.designation = 'Designation is required';
  } else if (designation.length < 2 || designation.length > 100) {
    errors.designation = 'Designation must be between 2 and 100 characters';
  }

  if (!values.dateOfJoining) {
    errors.dateOfJoining = 'Date of joining is required';
  } else if (Number.isNaN(new Date(values.dateOfJoining).getTime())) {
    errors.dateOfJoining = 'Enter a valid date';
  }

  const salary = values.salary.trim();
  if (!salary) {
    errors.salary = 'Salary is required';
  } else if (!SALARY_PATTERN.test(salary)) {
    errors.salary = 'Salary must be a number with at most 2 decimal places';
  } else if (Number(salary) <= 0) {
    errors.salary = 'Salary must be greater than zero';
  }

  if (!values.status) {
    errors.status = 'Status is required';
  }

  return errors;
}

function toFormValues(employee: Employee): FormValues {
  return {
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    email: employee.email,
    phoneNumber: employee.phoneNumber,
    department: employee.department,
    designation: employee.designation,
    dateOfJoining: employee.dateOfJoining,
    salary: String(employee.salary),
    status: employee.status,
  };
}

function toRequest(values: FormValues): EmployeeRequest {
  const employeeId = values.employeeId.trim();
  return {
    employeeId: employeeId === '' ? undefined : employeeId,
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phoneNumber: values.phoneNumber.trim(),
    department: values.department as Department,
    designation: values.designation.trim(),
    dateOfJoining: values.dateOfJoining,
    salary: Number(values.salary),
    status: values.status,
  };
}

const FIELD_KEYS: ReadonlyArray<keyof FormValues> = [
  'employeeId',
  'fullName',
  'email',
  'phoneNumber',
  'department',
  'designation',
  'dateOfJoining',
  'salary',
  'status',
];

function isFieldKey(value: string): value is keyof FormValues {
  return (FIELD_KEYS as readonly string[]).includes(value);
}

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== undefined;
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [original, setOriginal] = useState<Employee | null>(null);

  useEffect(() => {
    if (!isEditMode) {
      setValues(EMPTY_FORM);
      setErrors({});
      setTouched({});
      setFormError(null);
      setOriginal(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getEmployeeById(id)
      .then((employee) => {
        if (!cancelled) {
          setOriginal(employee);
          setValues(toFormValues(employee));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(extractApiError(err).message);
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
  }, [id, isEditMode]);

  const setField = (field: keyof FormValues, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    if (isFieldKey(name)) {
      setField(name, value);
    }
  };

  const handleBlur = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name } = event.target;
    if (!isFieldKey(name)) {
      return;
    }
    setTouched((current) => ({ ...current, [name]: true }));
    const fieldError = validateEmployeeForm(values)[name];
    setErrors((current) => {
      const next = { ...current };
      if (fieldError) {
        next[name] = fieldError;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    const validationErrors = validateEmployeeForm(values);
    setTouched(Object.fromEntries(FIELD_KEYS.map((key) => [key, true])));
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setFormError('Please fix the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = toRequest(values);
      const saved = isEditMode ? await updateEmployee(id, payload) : await createEmployee(payload);
      navigate(`/employees/${saved.id}`, {
        replace: true,
        state: {
          flash: {
            type: 'success',
            text: isEditMode
              ? `${saved.fullName} was updated successfully.`
              : `${saved.fullName} (${saved.employeeId}) was created successfully.`,
          },
        },
      });
    } catch (err) {
      const apiError = extractApiError(err);
      const serverErrors: FormErrors = {};
      if (apiError.validationErrors) {
        Object.entries(apiError.validationErrors).forEach(([field, message]) => {
          if (isFieldKey(field)) {
            serverErrors[field] = message;
          }
        });
      }
      if (apiError.status === 409) {
        const lower = apiError.message.toLowerCase();
        if (lower.includes('email')) {
          serverErrors.email = 'An employee with this email already exists';
        } else if (lower.includes('employeeid') || lower.includes('employee id')) {
          serverErrors.employeeId = 'An employee with this Employee ID already exists';
        }
      }
      setErrors((current) => ({ ...current, ...serverErrors }));
      setFormError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (field: keyof FormValues): string | undefined =>
    touched[field] || errors[field] ? errors[field] : undefined;

  const inputClass = (field: keyof FormValues, extra = ''): string =>
    `input ${extra} ${showError(field) ? 'input-error' : ''}`.trim();

  const backLink = isEditMode && original ? `/employees/${original.id}` : '/employees';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
        <span className="sr-only">Loading employee…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-lg font-semibold text-slate-900">Could not load employee</p>
          <p className="text-sm text-slate-500">{loadError}</p>
          <Link to="/employees" className="btn-secondary mt-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to={backLink} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {isEditMode ? 'Back to profile' : 'Back to employees'}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          {isEditMode ? 'Edit employee' : 'Add employee'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEditMode
            ? `Update the record for ${original?.fullName ?? 'this employee'}.`
            : 'Fill in the details below. Leave the Employee ID blank to generate one automatically.'}
        </p>
      </div>

      {formError ? (
        <div className="alert-error" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="card divide-y divide-slate-200">
        {/* Identity */}
        <fieldset className="space-y-5 p-6">
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">Identity</legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="employeeId" className="label">
                Employee ID <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  className={inputClass('employeeId', 'pl-9 font-mono uppercase')}
                  placeholder="Auto-generated (EMP-XXXX)"
                  value={values.employeeId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={20}
                  aria-invalid={showError('employeeId') ? true : undefined}
                  aria-describedby={showError('employeeId') ? 'employeeId-error' : 'employeeId-help'}
                />
              </div>
              {showError('employeeId') ? (
                <p id="employeeId-error" className="field-error">{showError('employeeId')}</p>
              ) : (
                <p id="employeeId-help" className="help-text">Must be unique. Example: EMP-2001</p>
              )}
            </div>

            <div>
              <label htmlFor="fullName" className="label">
                Full name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className={inputClass('fullName', 'pl-9')}
                  placeholder="Aarav Sharma"
                  value={values.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={100}
                  required
                  aria-invalid={showError('fullName') ? true : undefined}
                  aria-describedby={showError('fullName') ? 'fullName-error' : undefined}
                />
              </div>
              {showError('fullName') ? <p id="fullName-error" className="field-error">{showError('fullName')}</p> : null}
            </div>
          </div>
        </fieldset>

        {/* Contact */}
        <fieldset className="space-y-5 p-6">
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contact</legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="label">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={inputClass('email', 'pl-9')}
                  placeholder="aarav.sharma@kloudspot.com"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={150}
                  required
                  aria-invalid={showError('email') ? true : undefined}
                  aria-describedby={showError('email') ? 'email-error' : undefined}
                />
              </div>
              {showError('email') ? <p id="email-error" className="field-error">{showError('email')}</p> : null}
            </div>

            <div>
              <label htmlFor="phoneNumber" className="label">
                Phone number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  className={inputClass('phoneNumber', 'pl-9')}
                  placeholder="+91 98765 43210"
                  value={values.phoneNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={20}
                  required
                  aria-invalid={showError('phoneNumber') ? true : undefined}
                  aria-describedby={showError('phoneNumber') ? 'phoneNumber-error' : undefined}
                />
              </div>
              {showError('phoneNumber') ? <p id="phoneNumber-error" className="field-error">{showError('phoneNumber')}</p> : null}
            </div>
          </div>
        </fieldset>

        {/* Employment */}
        <fieldset className="space-y-5 p-6">
          <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">Employment</legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="department" className="label">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <select
                  id="department"
                  name="department"
                  className={inputClass('department', 'pl-9')}
                  value={values.department}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  aria-invalid={showError('department') ? true : undefined}
                  aria-describedby={showError('department') ? 'department-error' : undefined}
                >
                  <option value="">Select a department</option>
                  {DEPARTMENTS.map((item) => (
                    <option key={item} value={item}>
                      {DEPARTMENT_LABELS[item]}
                    </option>
                  ))}
                </select>
              </div>
              {showError('department') ? <p id="department-error" className="field-error">{showError('department')}</p> : null}
            </div>

            <div>
              <label htmlFor="designation" className="label">
                Designation <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="designation"
                  name="designation"
                  type="text"
                  className={inputClass('designation', 'pl-9')}
                  placeholder="Senior Software Engineer"
                  value={values.designation}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={100}
                  required
                  aria-invalid={showError('designation') ? true : undefined}
                  aria-describedby={showError('designation') ? 'designation-error' : undefined}
                />
              </div>
              {showError('designation') ? <p id="designation-error" className="field-error">{showError('designation')}</p> : null}
            </div>

            <div>
              <label htmlFor="dateOfJoining" className="label">
                Date of joining <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="dateOfJoining"
                  name="dateOfJoining"
                  type="date"
                  className={inputClass('dateOfJoining', 'pl-9')}
                  value={values.dateOfJoining}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  aria-invalid={showError('dateOfJoining') ? true : undefined}
                  aria-describedby={showError('dateOfJoining') ? 'dateOfJoining-error' : undefined}
                />
              </div>
              {showError('dateOfJoining') ? <p id="dateOfJoining-error" className="field-error">{showError('dateOfJoining')}</p> : null}
            </div>

            <div>
              <label htmlFor="salary" className="label">
                Annual salary (INR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="salary"
                  name="salary"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  className={inputClass('salary', 'pl-9')}
                  placeholder="1250000.00"
                  value={values.salary}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  aria-invalid={showError('salary') ? true : undefined}
                  aria-describedby={showError('salary') ? 'salary-error' : 'salary-help'}
                />
              </div>
              {showError('salary') ? (
                <p id="salary-error" className="field-error">{showError('salary')}</p>
              ) : (
                <p id="salary-help" className="help-text">Up to 10 digits and 2 decimal places.</p>
              )}
            </div>

            <div>
              <span className="label">
                Status <span className="text-red-500">*</span>
              </span>
              <div className="flex gap-3" role="radiogroup" aria-label="Employment status">
                {EMPLOYMENT_STATUSES.map((item) => {
                  const checked = values.status === item;
                  return (
                    <label
                      key={item}
                      className={[
                        'flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        checked
                          ? item === 'ACTIVE'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-slate-500 bg-slate-100 text-slate-800'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={item}
                        checked={checked}
                        onChange={handleChange}
                        className="h-4 w-4 accent-brand-600"
                      />
                      {STATUS_LABELS[item]}
                    </label>
                  );
                })}
              </div>
              {showError('status') ? <p className="field-error">{showError('status')}</p> : null}
            </div>
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 p-6 sm:flex-row sm:justify-end">
          <Link to={backLink} className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Create employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
