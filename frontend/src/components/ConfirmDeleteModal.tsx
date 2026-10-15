import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  open: boolean;
  /** Display name of the record being deleted. */
  employeeName: string;
  /** Optional secondary identifier shown under the name. */
  employeeCode?: string;
  loading?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  open,
  employeeName,
  employeeCode,
  loading = false,
  errorMessage = null,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the safe action and close on Escape while the dialog is open.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-icon absolute right-3 top-3"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-delete-title" className="text-lg font-semibold text-slate-900">
              Delete employee
            </h2>
            <p id="confirm-delete-description" className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-900">{employeeName}</span>
              {employeeCode ? <span className="text-slate-500"> ({employeeCode})</span> : null}? This action
              cannot be undone.
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="alert-error mt-4" role="alert">
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="btn-danger">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
