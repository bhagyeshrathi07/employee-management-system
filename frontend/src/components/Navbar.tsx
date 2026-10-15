import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, UserPlus, Users, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');

export default function Navbar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to="/employees" className="flex items-center gap-2.5" aria-label="Kloudspot EMS home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold text-slate-900">Kloudspot EMS</span>
              <span className="text-xs text-slate-500">Employee Management</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Primary">
            <NavLink to="/employees" end className={navLinkClass}>
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>Employees</span>
            </NavLink>
            <NavLink to="/employees/new" className={navLinkClass}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {username && (
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold uppercase text-white">
                {username.charAt(0)}
              </span>
              <span className="text-sm font-medium text-slate-700">{username}</span>
            </div>
          )}
          <button type="button" onClick={handleLogout} className="btn-ghost" aria-label="Log out">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
