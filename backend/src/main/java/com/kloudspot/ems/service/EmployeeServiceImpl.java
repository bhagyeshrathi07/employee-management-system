package com.kloudspot.ems.service;

import com.kloudspot.ems.dto.DepartmentSummaryDTO;
import com.kloudspot.ems.dto.EmployeeRequestDTO;
import com.kloudspot.ems.dto.EmployeeResponseDTO;
import com.kloudspot.ems.dto.PagedResponse;
import com.kloudspot.ems.exception.DuplicateResourceException;
import com.kloudspot.ems.exception.ResourceNotFoundException;
import com.kloudspot.ems.model.Department;
import com.kloudspot.ems.model.Employee;
import com.kloudspot.ems.model.EmploymentStatus;
import com.kloudspot.ems.repository.EmployeeRepository;
import com.kloudspot.ems.repository.EmployeeSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.io.Writer;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Default {@link EmployeeService} implementation backed by Spring Data JPA.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    static final String RESOURCE_NAME = "Employee";
    static final int MAX_PAGE_SIZE = 100;
    static final int DEFAULT_PAGE_SIZE = 10;
    static final String DEFAULT_SORT_FIELD = "id";
    static final String EMPLOYEE_ID_PREFIX = "EMP-";
    static final long EMPLOYEE_ID_SEQUENCE_START = 1000L;
    static final String CSV_LINE_SEPARATOR = "\r\n";
    static final List<String> CSV_HEADERS = List.of(
            "ID", "Employee ID", "Full Name", "Email", "Phone Number", "Department",
            "Designation", "Date of Joining", "Salary", "Status", "Created At", "Updated At");

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "employeeId", "fullName", "email", "phoneNumber", "department",
            "designation", "dateOfJoining", "salary", "status", "createdAt", "updatedAt");

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<EmployeeResponseDTO> getEmployees(String search, Department department,
                                                           EmploymentStatus status, int page, int size,
                                                           String sortBy, String sortDir) {
        Pageable pageable = buildPageable(page, size, sortBy, sortDir);
        Specification<Employee> specification = EmployeeSpecification.withFilters(search, department, status);
        Page<Employee> result = employeeRepository.findAll(specification, pageable);
        return PagedResponse.from(result.map(EmployeeResponseDTO::fromEntity));
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponseDTO getEmployeeById(Long id) {
        return EmployeeResponseDTO.fromEntity(findEmployeeOrThrow(id));
    }

    @Override
    @Transactional
    public EmployeeResponseDTO createEmployee(EmployeeRequestDTO request) {
        String email = normalizeEmail(request.getEmail());
        if (employeeRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException(RESOURCE_NAME, "email", email);
        }

        String employeeId = resolveEmployeeIdForCreate(request.getEmployeeId());

        Employee employee = Employee.builder()
                .employeeId(employeeId)
                .fullName(request.getFullName().trim())
                .email(email)
                .phoneNumber(request.getPhoneNumber().trim())
                .department(request.getDepartment())
                .designation(request.getDesignation().trim())
                .dateOfJoining(request.getDateOfJoining())
                .salary(normalizeSalary(request.getSalary()))
                .status(request.getStatus())
                .build();

        Employee saved = employeeRepository.saveAndFlush(employee);
        log.info("Created employee {} ({})", saved.getEmployeeId(), saved.getEmail());
        return EmployeeResponseDTO.fromEntity(saved);
    }

    @Override
    @Transactional
    public EmployeeResponseDTO updateEmployee(Long id, EmployeeRequestDTO request) {
        Employee employee = findEmployeeOrThrow(id);

        String email = normalizeEmail(request.getEmail());
        if (employeeRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new DuplicateResourceException(RESOURCE_NAME, "email", email);
        }

        String requestedEmployeeId = request.getEmployeeId();
        if (requestedEmployeeId != null && !requestedEmployeeId.isBlank()) {
            String employeeId = requestedEmployeeId.trim();
            if (employeeRepository.existsByEmployeeIdAndIdNot(employeeId, id)) {
                throw new DuplicateResourceException(RESOURCE_NAME, "employeeId", employeeId);
            }
            employee.setEmployeeId(employeeId);
        }

        employee.setFullName(request.getFullName().trim());
        employee.setEmail(email);
        employee.setPhoneNumber(request.getPhoneNumber().trim());
        employee.setDepartment(request.getDepartment());
        employee.setDesignation(request.getDesignation().trim());
        employee.setDateOfJoining(request.getDateOfJoining());
        employee.setSalary(normalizeSalary(request.getSalary()));
        employee.setStatus(request.getStatus());

        Employee saved = employeeRepository.saveAndFlush(employee);
        log.info("Updated employee {} (id={})", saved.getEmployeeId(), saved.getId());
        return EmployeeResponseDTO.fromEntity(saved);
    }

    @Override
    @Transactional
    public void deleteEmployee(Long id) {
        Employee employee = findEmployeeOrThrow(id);
        employeeRepository.delete(employee);
        log.info("Deleted employee {} (id={})", employee.getEmployeeId(), id);
    }

    @Override
    @Transactional(readOnly = true)
    public void exportEmployeesToCsv(String search, Department department, EmploymentStatus status, Writer writer) {
        Specification<Employee> specification = EmployeeSpecification.withFilters(search, department, status);
        List<Employee> employees = employeeRepository.findAll(specification,
                Sort.by(Sort.Direction.ASC, DEFAULT_SORT_FIELD));
        try {
            writer.write(toCsvLine(CSV_HEADERS));
            writer.write(CSV_LINE_SEPARATOR);
            for (Employee employee : employees) {
                writer.write(toCsvLine(toCsvRow(employee)));
                writer.write(CSV_LINE_SEPARATOR);
            }
            writer.flush();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to write CSV export", ex);
        }
        log.info("Exported {} employees to CSV (search='{}', department={}, status={})",
                employees.size(), search, department, status);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentSummaryDTO> getDepartmentSummary() {
        return Arrays.stream(Department.values())
                .map(department -> DepartmentSummaryDTO.builder()
                        .department(department)
                        .displayName(department.getDisplayName())
                        .totalEmployees(employeeRepository.countByDepartment(department))
                        .activeEmployees(employeeRepository.countByDepartmentAndStatus(department,
                                EmploymentStatus.ACTIVE))
                        .build())
                .toList();
    }

    // ---------------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------------

    private Employee findEmployeeOrThrow(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE_NAME, "id", id));
    }

    private Pageable buildPageable(int page, int size, String sortBy, String sortDir) {
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        String sortField = (sortBy != null && ALLOWED_SORT_FIELDS.contains(sortBy)) ? sortBy : DEFAULT_SORT_FIELD;
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(safePage, safeSize, Sort.by(direction, sortField));
    }

    private String resolveEmployeeIdForCreate(String requestedEmployeeId) {
        if (requestedEmployeeId == null || requestedEmployeeId.isBlank()) {
            return generateEmployeeId();
        }
        String employeeId = requestedEmployeeId.trim();
        if (employeeRepository.existsByEmployeeId(employeeId)) {
            throw new DuplicateResourceException(RESOURCE_NAME, "employeeId", employeeId);
        }
        return employeeId;
    }

    /**
     * Generates the next free {@code EMP-XXXX} identifier. The sequence starts after the current
     * record count so seeded data (EMP-1001..EMP-1025) is followed by EMP-1026, and it skips any
     * value that is already taken.
     */
    private String generateEmployeeId() {
        long next = EMPLOYEE_ID_SEQUENCE_START + employeeRepository.count() + 1;
        String candidate = formatEmployeeId(next);
        while (employeeRepository.existsByEmployeeId(candidate)) {
            next++;
            candidate = formatEmployeeId(next);
        }
        return candidate;
    }

    private static String formatEmployeeId(long sequence) {
        return String.format(Locale.ROOT, "%s%04d", EMPLOYEE_ID_PREFIX, sequence);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static BigDecimal normalizeSalary(BigDecimal salary) {
        return salary.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private static List<String> toCsvRow(Employee employee) {
        return List.of(
                valueOrEmpty(employee.getId()),
                valueOrEmpty(employee.getEmployeeId()),
                valueOrEmpty(employee.getFullName()),
                valueOrEmpty(employee.getEmail()),
                valueOrEmpty(employee.getPhoneNumber()),
                employee.getDepartment() == null ? "" : employee.getDepartment().name(),
                valueOrEmpty(employee.getDesignation()),
                employee.getDateOfJoining() == null ? "" : DATE_FORMAT.format(employee.getDateOfJoining()),
                employee.getSalary() == null ? "" : employee.getSalary().toPlainString(),
                employee.getStatus() == null ? "" : employee.getStatus().name(),
                employee.getCreatedAt() == null ? "" : DATE_TIME_FORMAT.format(employee.getCreatedAt()),
                employee.getUpdatedAt() == null ? "" : DATE_TIME_FORMAT.format(employee.getUpdatedAt())
        );
    }

    private static String valueOrEmpty(Object value) {
        return value == null ? "" : value.toString();
    }

    /**
     * Joins fields into one RFC 4180 record, quoting any field that contains a comma, quote or line break.
     */
    static String toCsvLine(List<String> fields) {
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < fields.size(); i++) {
            if (i > 0) {
                line.append(',');
            }
            line.append(escapeCsvField(fields.get(i)));
        }
        return line.toString();
    }

    static String escapeCsvField(String field) {
        if (field == null) {
            return "";
        }
        boolean needsQuoting = field.contains(",") || field.contains("\"")
                || field.contains("\n") || field.contains("\r");
        if (!needsQuoting) {
            return field;
        }
        return "\"" + field.replace("\"", "\"\"") + "\"";
    }
}
