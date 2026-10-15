import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmployeeListPage from '../pages/EmployeeListPage';
import type {
  DepartmentSummary,
  Employee,
  EmployeeQueryParams,
  PagedResponse,
} from '../types/employee';

// -------------------------------------------------------------------------------------------------
// API module mock
// -------------------------------------------------------------------------------------------------

vi.mock('../api/employeeApi', () => ({
  getEmployees: vi.fn(),
  getDepartments: vi.fn(),
  deleteEmployee: vi.fn(),
  exportEmployeesCsv: vi.fn(),
  extractApiError: (error: unknown) => ({
    status: 0,
    error: 'Error',
    message: error instanceof Error ? error.message : 'Unexpected error',
  }),
}));

import { deleteEmployee, exportEmployeesCsv, getDepartments, getEmployees } from '../api/employeeApi';

const mockedGetEmployees = vi.mocked(getEmployees);
const mockedGetDepartments = vi.mocked(getDepartments);
const mockedDeleteEmployee = vi.mocked(deleteEmployee);
const mockedExportCsv = vi.mocked(exportEmployeesCsv);

// -------------------------------------------------------------------------------------------------
// Fixtures
// -------------------------------------------------------------------------------------------------

const EMPLOYEES: Employee[] = [
  {
    id: 1,
    employeeId: 'EMP-1001',
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@kloudspot.com',
    phoneNumber: '+91 98765 43210',
    department: 'ENGINEERING',
    designation: 'Senior Software Engineer',
    dateOfJoining: '2019-03-11',
    salary: 1850000,
    status: 'ACTIVE',
    createdAt: '2024-01-15T09:30:00',
    updatedAt: '2024-01-15T09:30:00',
  },
  {
    id: 2,
    employeeId: 'EMP-1002',
    fullName: 'Priya Nair',
    email: 'priya.nair@kloudspot.com',
    phoneNumber: '+91 98201 11234',
    department: 'ENGINEERING',
    designation: 'Software Engineer II',
    dateOfJoining: '2021-07-05',
    salary: 1250000,
    status: 'ACTIVE',
    createdAt: '2024-01-15T09:30:00',
    updatedAt: '2024-01-15T09:30:00',
  },
  {
    id: 3,
    employeeId: 'EMP-1005',
    fullName: 'Daniel Kim',
    email: 'daniel.kim@kloudspot.com',
    phoneNumber: '+1 (650) 555-0198',
    department: 'ENGINEERING',
    designation: 'QA Automation Engineer',
    dateOfJoining: '2022-02-14',
    salary: 980000,
    status: 'INACTIVE',
    createdAt: '2024-01-15T09:30:00',
    updatedAt: '2024-01-15T09:30:00',
  },
  {
    id: 4,
    employeeId: 'EMP-1019',
    fullName: 'Kavya Menon',
    email: 'kavya.menon@kloudspot.com',
    phoneNumber: '+91 91098 21234',
    department: 'HR',
    designation: 'HR Business Partner',
    dateOfJoining: '2018-02-19',
    salary: 1400000,
    status: 'ACTIVE',
    createdAt: '2024-01-15T09:30:00',
    updatedAt: '2024-01-15T09:30:00',
  },
  {
    id: 5,
    employeeId: 'EMP-1023',
    fullName: 'Suresh Pillai',
    email: 'suresh.pillai@kloudspot.com',
    phoneNumber: '+91 89876 43456',
    department: 'FINANCE',
    designation: 'Accounts Payable Specialist',
    dateOfJoining: '2019-12-02',
    salary: 780000,
    status: 'INACTIVE',
    createdAt: '2024-01-15T09:30:00',
    updatedAt: '2024-01-15T09:30:00',
  },
];

const DEPARTMENTS: DepartmentSummary[] = [
  { department: 'ENGINEERING', displayName: 'Engineering', totalEmployees: 3, activeEmployees: 2 },
  { department: 'PRODUCT', displayName: 'Product', totalEmployees: 0, activeEmployees: 0 },
  { department: 'DESIGN', displayName: 'Design', totalEmployees: 0, activeEmployees: 0 },
  { department: 'MARKETING', displayName: 'Marketing', totalEmployees: 0, activeEmployees: 0 },
  { department: 'SALES', displayName: 'Sales', totalEmployees: 0, activeEmployees: 0 },
  { department: 'HR', displayName: 'Human Resources', totalEmployees: 1, activeEmployees: 1 },
  { department: 'FINANCE', displayName: 'Finance', totalEmployees: 1, activeEmployees: 0 },
  { department: 'OPERATIONS', displayName: 'Operations', totalEmployees: 0, activeEmployees: 0 },
];

/** Mimics the backend: applies search / department / status filters and paginates the fixture. */
function fakeGetEmployees(params: EmployeeQueryParams = {}): Promise<PagedResponse<Employee>> {
  const search = (params.search ?? '').trim().toLowerCase();
  const page = params.page ?? 0;
  const size = params.size ?? 10;

  const filtered = EMPLOYEES.filter((employee) => {
    const matchesSearch =
      search === '' ||
      employee.fullName.toLowerCase().includes(search) ||
      employee.email.toLowerCase().includes(search);
    const matchesDepartment = !params.department || employee.department === params.department;
    const matchesStatus = !params.status || employee.status === params.status;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const content = filtered.slice(page * size, page * size + size);
  const totalPages = Math.ceil(filtered.length / size);
  return Promise.resolve({
    content,
    pageNumber: page,
    pageSize: size,
    totalElements: filtered.length,
    totalPages,
    last: page >= totalPages - 1,
  });
}

function renderListPage(initialPath = '/employees') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/employees" element={<EmployeeListPage />} />
        <Route path="/employees/new" element={<div>Add employee page</div>} />
        <Route path="/employees/:id" element={<div>Employee detail page</div>} />
        <Route path="/employees/:id/edit" element={<div>Employee edit page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Returns the data rows of the employee table (excludes header and empty-state rows). */
function getDataRows(): HTMLElement[] {
  const table = screen.getByRole('table');
  const body = table.querySelector('tbody');
  if (!body) {
    return [];
  }
  return within(body)
    .queryAllByRole('row')
    .filter((row) => within(row).queryAllByRole('link').length > 0);
}

// -------------------------------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------------------------------

describe('EmployeeListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetEmployees.mockImplementation(fakeGetEmployees);
    mockedGetDepartments.mockResolvedValue(DEPARTMENTS);
    mockedDeleteEmployee.mockResolvedValue(undefined);
    mockedExportCsv.mockResolvedValue('employees.csv');
  });

  it('renders the employee table with one row per employee and the pagination summary', async () => {
    renderListPage();

    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
    expect(screen.getByText('Daniel Kim')).toBeInTheDocument();
    expect(screen.getByText('Kavya Menon')).toBeInTheDocument();
    expect(screen.getByText('Suresh Pillai')).toBeInTheDocument();
    expect(getDataRows()).toHaveLength(5);

    // Column content: employee code, department badge, status badge, formatted salary.
    expect(screen.getByText('EMP-1001')).toBeInTheDocument();
    expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
    const table = within(screen.getByRole('table'));
    expect(table.getAllByText('Active')).toHaveLength(3);
    expect(table.getAllByText('Inactive')).toHaveLength(2);
    expect(screen.getByText('₹18,50,000')).toBeInTheDocument();

    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Showing 1–5 of 5');

    expect(mockedGetEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 10, sortBy: 'id', sortDir: 'asc', search: '', department: '', status: '' }),
    );
  });

  it('renders department KPI cards from the departments endpoint', async () => {
    renderListPage();

    const summary = await screen.findByRole('region', { name: 'Workforce summary' });
    await waitFor(() => expect(within(summary).getByText('5')).toBeInTheDocument());
    expect(within(summary).getByText('Total Employees')).toBeInTheDocument();
    expect(within(summary).getByText('3')).toBeInTheDocument(); // active
    expect(within(summary).getByText('2')).toBeInTheDocument(); // inactive
    expect(within(summary).getByText('3 / 8')).toBeInTheDocument();

    const breakdown = screen.getByRole('region', { name: 'Department breakdown' });
    expect(within(breakdown).getAllByRole('button')).toHaveLength(8);
    expect(within(breakdown).getByText('Human Resources')).toBeInTheDocument();
    expect(mockedGetDepartments).toHaveBeenCalledTimes(1);
  });

  it('filters the list by the debounced search input', async () => {
    const user = userEvent.setup();
    renderListPage();
    await screen.findByText('Aarav Sharma');

    const searchInput = screen.getByRole('textbox', { name: 'Search employees by name or email' });
    await user.type(searchInput, 'priya');

    await waitFor(() =>
      expect(mockedGetEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'priya', page: 0 })),
    );
    expect(await screen.findByText('Priya Nair')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Aarav Sharma')).not.toBeInTheDocument());
    expect(getDataRows()).toHaveLength(1);
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Showing 1–1 of 1');

    // Search by email fragment works too.
    await user.clear(searchInput);
    await user.type(searchInput, 'kavya.menon');
    expect(await screen.findByText('Kavya Menon')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Priya Nair')).not.toBeInTheDocument());
  });

  it('filters the list by employment status', async () => {
    const user = userEvent.setup();
    renderListPage();
    await screen.findByText('Aarav Sharma');

    const statusSelect = screen.getByRole('combobox', { name: 'Filter by status' });
    await user.selectOptions(statusSelect, 'INACTIVE');

    await waitFor(() =>
      expect(mockedGetEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'INACTIVE', page: 0 })),
    );
    expect(await screen.findByText('Daniel Kim')).toBeInTheDocument();
    expect(screen.getByText('Suresh Pillai')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Aarav Sharma')).not.toBeInTheDocument());
    expect(getDataRows()).toHaveLength(2);
    const table = within(screen.getByRole('table'));
    expect(table.getAllByText('Inactive')).toHaveLength(2);
    expect(table.queryAllByText('Active')).toHaveLength(0);

    // The Clear Filters button becomes enabled and restores the full list.
    const clearButton = screen.getByRole('button', { name: 'Clear filters' });
    expect(clearButton).toBeEnabled();
    await user.click(clearButton);
    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();
    await waitFor(() => expect(getDataRows()).toHaveLength(5));
  });

  it('composes department and status filters in the same request', async () => {
    const user = userEvent.setup();
    renderListPage();
    await screen.findByText('Aarav Sharma');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by department' }), 'ENGINEERING');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'INACTIVE');

    await waitFor(() =>
      expect(mockedGetEmployees).toHaveBeenLastCalledWith(
        expect.objectContaining({ department: 'ENGINEERING', status: 'INACTIVE' }),
      ),
    );
    expect(await screen.findByText('Daniel Kim')).toBeInTheDocument();
    await waitFor(() => expect(getDataRows()).toHaveLength(1));
    expect(screen.queryByText('Suresh Pillai')).not.toBeInTheDocument();
  });

  it('shows an empty state when no employees match', async () => {
    const user = userEvent.setup();
    renderListPage();
    await screen.findByText('Aarav Sharma');

    await user.type(screen.getByRole('textbox', { name: 'Search employees by name or email' }), 'nobody-here');

    expect(await screen.findByText('No employees found')).toBeInTheDocument();
    expect(screen.getByText('No records match the current search or filters.')).toBeInTheDocument();
    expect(getDataRows()).toHaveLength(0);
  });

  it('exports CSV with the active filters', async () => {
    const user = userEvent.setup();
    renderListPage('/employees?department=HR&status=ACTIVE');
    await screen.findByText('Kavya Menon');

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() =>
      expect(mockedExportCsv).toHaveBeenCalledWith({ search: '', department: 'HR', status: 'ACTIVE' }),
    );
    expect(await screen.findByText('Export started: employees.csv')).toBeInTheDocument();
  });

  it('deletes an employee after confirmation and refreshes the list', async () => {
    const user = userEvent.setup();
    renderListPage();
    await screen.findByText('Aarav Sharma');

    await user.click(screen.getByRole('button', { name: 'Delete Aarav Sharma' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Aarav Sharma')).toBeInTheDocument();
    expect(within(dialog).getByText('(EMP-1001)')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockedDeleteEmployee).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Aarav Sharma (EMP-1001) was deleted.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The list and department KPIs are re-fetched after deletion.
    await waitFor(() => expect(mockedGetEmployees.mock.calls.length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(mockedGetDepartments).toHaveBeenCalledTimes(2));
  });

  it('shows an error state with a retry button when loading fails', async () => {
    const user = userEvent.setup();
    mockedGetEmployees.mockRejectedValueOnce(new Error('Backend unavailable'));
    renderListPage();

    expect(await screen.findByText('Could not load employees')).toBeInTheDocument();
    expect(screen.getByText('Backend unavailable')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();
  });
});
