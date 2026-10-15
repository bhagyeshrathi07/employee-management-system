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
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.io.IOException;
import java.io.StringWriter;
import java.io.UncheckedIOException;
import java.io.Writer;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link EmployeeServiceImpl} and {@link EmployeeSpecification}. The repository is
 * mocked, so these tests run without a database.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EmployeeServiceImpl")
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private EmployeeServiceImpl employeeService;

    private Employee existingEmployee;
    private EmployeeRequestDTO validRequest;

    @BeforeEach
    void setUp() {
        existingEmployee = Employee.builder()
                .id(1L)
                .employeeId("EMP-1001")
                .fullName("Aarav Sharma")
                .email("aarav.sharma@kloudspot.com")
                .phoneNumber("+91 98765 43210")
                .department(Department.ENGINEERING)
                .designation("Senior Software Engineer")
                .dateOfJoining(LocalDate.of(2019, 3, 11))
                .salary(new BigDecimal("1850000.00"))
                .status(EmploymentStatus.ACTIVE)
                .createdAt(LocalDateTime.of(2024, 1, 15, 9, 30))
                .updatedAt(LocalDateTime.of(2024, 1, 15, 9, 30))
                .build();

        validRequest = EmployeeRequestDTO.builder()
                .employeeId(null)
                .fullName("  Priya Nair  ")
                .email("  Priya.Nair@Kloudspot.com ")
                .phoneNumber(" +91 98201 11234 ")
                .department(Department.ENGINEERING)
                .designation(" Software Engineer II ")
                .dateOfJoining(LocalDate.of(2021, 7, 5))
                .salary(new BigDecimal("1250000"))
                .status(EmploymentStatus.ACTIVE)
                .build();
    }

    // =============================================================================================
    // Create
    // =============================================================================================

    @Nested
    @DisplayName("createEmployee")
    class CreateEmployee {

        @Test
        @DisplayName("persists a normalised entity and returns the saved representation")
        void createEmployee_withExplicitEmployeeId_persistsAndReturnsDto() {
            validRequest.setEmployeeId(" EMP-2001 ");
            when(employeeRepository.existsByEmailIgnoreCase("priya.nair@kloudspot.com")).thenReturn(false);
            when(employeeRepository.existsByEmployeeId("EMP-2001")).thenReturn(false);
            when(employeeRepository.saveAndFlush(any(Employee.class))).thenAnswer(invocation -> {
                Employee toSave = invocation.getArgument(0);
                toSave.setId(42L);
                toSave.setCreatedAt(LocalDateTime.of(2024, 2, 1, 10, 0));
                toSave.setUpdatedAt(LocalDateTime.of(2024, 2, 1, 10, 0));
                return toSave;
            });

            EmployeeResponseDTO response = employeeService.createEmployee(validRequest);

            ArgumentCaptor<Employee> captor = ArgumentCaptor.forClass(Employee.class);
            verify(employeeRepository).saveAndFlush(captor.capture());
            Employee persisted = captor.getValue();

            assertThat(persisted.getEmployeeId()).isEqualTo("EMP-2001");
            assertThat(persisted.getFullName()).isEqualTo("Priya Nair");
            assertThat(persisted.getEmail()).isEqualTo("priya.nair@kloudspot.com");
            assertThat(persisted.getPhoneNumber()).isEqualTo("+91 98201 11234");
            assertThat(persisted.getDesignation()).isEqualTo("Software Engineer II");
            assertThat(persisted.getSalary()).isEqualByComparingTo("1250000.00");
            assertThat(persisted.getSalary().scale()).isEqualTo(2);
            assertThat(persisted.getDepartment()).isEqualTo(Department.ENGINEERING);
            assertThat(persisted.getStatus()).isEqualTo(EmploymentStatus.ACTIVE);

            assertThat(response.getId()).isEqualTo(42L);
            assertThat(response.getEmployeeId()).isEqualTo("EMP-2001");
            assertThat(response.getEmail()).isEqualTo("priya.nair@kloudspot.com");
            assertThat(response.getCreatedAt()).isEqualTo(LocalDateTime.of(2024, 2, 1, 10, 0));
        }

        @Test
        @DisplayName("auto-generates EMP-XXXX when employeeId is blank (count 25 -> EMP-1026)")
        void createEmployee_blankEmployeeId_autoGeneratesNextCode() {
            validRequest.setEmployeeId("   ");
            when(employeeRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
            when(employeeRepository.count()).thenReturn(25L);
            when(employeeRepository.existsByEmployeeId("EMP-1026")).thenReturn(false);
            when(employeeRepository.saveAndFlush(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

            EmployeeResponseDTO response = employeeService.createEmployee(validRequest);

            assertThat(response.getEmployeeId()).isEqualTo("EMP-1026");
        }

        @Test
        @DisplayName("auto-generation skips codes that are already taken")
        void createEmployee_nullEmployeeId_skipsTakenCodes() {
            validRequest.setEmployeeId(null);
            when(employeeRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
            when(employeeRepository.count()).thenReturn(25L);
            when(employeeRepository.existsByEmployeeId("EMP-1026")).thenReturn(true);
            when(employeeRepository.existsByEmployeeId("EMP-1027")).thenReturn(true);
            when(employeeRepository.existsByEmployeeId("EMP-1028")).thenReturn(false);
            when(employeeRepository.saveAndFlush(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

            EmployeeResponseDTO response = employeeService.createEmployee(validRequest);

            assertThat(response.getEmployeeId()).isEqualTo("EMP-1028");
        }

        @Test
        @DisplayName("throws DuplicateResourceException for an existing email (case-insensitive)")
        void createEmployee_duplicateEmail_throwsConflict() {
            when(employeeRepository.existsByEmailIgnoreCase("priya.nair@kloudspot.com")).thenReturn(true);

            assertThatThrownBy(() -> employeeService.createEmployee(validRequest))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessage("Employee already exists with email: priya.nair@kloudspot.com");

            verify(employeeRepository, never()).saveAndFlush(any(Employee.class));
        }

        @Test
        @DisplayName("throws DuplicateResourceException for an existing employeeId")
        void createEmployee_duplicateEmployeeId_throwsConflict() {
            validRequest.setEmployeeId("EMP-1001");
            when(employeeRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
            when(employeeRepository.existsByEmployeeId("EMP-1001")).thenReturn(true);

            assertThatThrownBy(() -> employeeService.createEmployee(validRequest))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessage("Employee already exists with employeeId: EMP-1001");

            verify(employeeRepository, never()).saveAndFlush(any(Employee.class));
        }
    }

    // =============================================================================================
    // Read
    // =============================================================================================

    @Nested
    @DisplayName("getEmployeeById")
    class GetEmployeeById {

        @Test
        @DisplayName("returns the mapped DTO when the employee exists")
        void getEmployeeById_found_returnsDto() {
            when(employeeRepository.findById(1L)).thenReturn(Optional.of(existingEmployee));

            EmployeeResponseDTO response = employeeService.getEmployeeById(1L);

            assertThat(response.getId()).isEqualTo(1L);
            assertThat(response.getEmployeeId()).isEqualTo("EMP-1001");
            assertThat(response.getFullName()).isEqualTo("Aarav Sharma");
            assertThat(response.getEmail()).isEqualTo("aarav.sharma@kloudspot.com");
            assertThat(response.getPhoneNumber()).isEqualTo("+91 98765 43210");
            assertThat(response.getDepartment()).isEqualTo(Department.ENGINEERING);
            assertThat(response.getDesignation()).isEqualTo("Senior Software Engineer");
            assertThat(response.getDateOfJoining()).isEqualTo(LocalDate.of(2019, 3, 11));
            assertThat(response.getSalary()).isEqualByComparingTo("1850000.00");
            assertThat(response.getStatus()).isEqualTo(EmploymentStatus.ACTIVE);
            assertThat(response.getCreatedAt()).isEqualTo(LocalDateTime.of(2024, 1, 15, 9, 30));
            assertThat(response.getUpdatedAt()).isEqualTo(LocalDateTime.of(2024, 1, 15, 9, 30));
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when the employee does not exist")
        void getEmployeeById_missing_throwsNotFound() {
            when(employeeRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> employeeService.getEmployeeById(99L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessage("Employee not found with id: 99");
        }
    }

    // =============================================================================================
    // Update
    // =============================================================================================

    @Nested
    @DisplayName("updateEmployee")
    class UpdateEmployee {

        @Test
        @DisplayName("applies all fields, including a new employeeId, and flushes")
        void updateEmployee_valid_appliesChanges() {
            validRequest.setEmployeeId("EMP-5555");
            validRequest.setDepartment(Department.PRODUCT);
            validRequest.setStatus(EmploymentStatus.INACTIVE);
            when(employeeRepository.findById(1L)).thenReturn(Optional.of(existingEmployee));
            when(employeeRepository.existsByEmailIgnoreCaseAndIdNot("priya.nair@kloudspot.com", 1L)).thenReturn(false);
            when(employeeRepository.existsByEmployeeIdAndIdNot("EMP-5555", 1L)).thenReturn(false);
            when(employeeRepository.saveAndFlush(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

            EmployeeResponseDTO response = employeeService.updateEmployee(1L, validRequest);

            verify(employeeRepository).saveAndFlush(existingEmployee);
            assertThat(response.getId()).isEqualTo(1L);
            assertThat(response.getEmployeeId()).isEqualTo("EMP-5555");
            assertThat(response.getFullName()).isEqualTo("Priya Nair");
            assertThat(response.getEmail()).isEqualTo("priya.nair@kloudspot.com");
            assertThat(response.getPhoneNumber()).isEqualTo("+91 98201 11234");
            assertThat(response.getDepartment()).isEqualTo(Department.PRODUCT);
            assertThat(response.getDesignation()).isEqualTo("Software Engineer II");
            assertThat(response.getDateOfJoining()).isEqualTo(LocalDate.of(2021, 7, 5));
            assertThat(response.getSalary()).isEqualByComparingTo("1250000.00");
            assertThat(response.getStatus()).isEqualTo(EmploymentStatus.INACTIVE);
        }

        @Test
        @DisplayName("keeps the existing employeeId when the request leaves it blank")
        void updateEmployee_blankEmployeeId_keepsExistingCode() {
            validRequest.setEmployeeId("");
            when(employeeRepository.findById(1L)).thenReturn(Optional.of(existingEmployee));
            when(employeeRepository.existsByEmailIgnoreCaseAndIdNot(anyString(), eq(1L))).thenReturn(false);
            when(employeeRepository.saveAndFlush(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

            EmployeeResponseDTO response = employeeService.updateEmployee(1L, validRequest);

            assertThat(response.getEmployeeId()).isEqualTo("EMP-1001");
            verify(employeeRepository, never()).existsByEmployeeIdAndIdNot(anyString(), any());
        }

        @Test
        @DisplayName("rejects an email that belongs to a different employee")
        void updateEmployee_emailOwnedByOther_throwsConflict() {
            when(employeeRepository.findById(1L)).thenReturn(Optional.of(existingEmployee));
            when(employeeRepository.existsByEmailIgnoreCaseAndIdNot("priya.nair@kloudspot.com", 1L)).thenReturn(true);

            assertThatThrownBy(() -> employeeService.updateEmployee(1L, validRequest))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessage("Employee already exists with email: priya.nair@kloudspot.com");

            verify(employeeRepository, never()).saveAndFlush(any(Employee.class));
        }

        @Test
        @DisplayName("rejects an employeeId that belongs to a different employee")
        void updateEmployee_employeeIdOwnedByOther_throwsConflict() {
            validRequest.setEmployeeId("EMP-1002");
            when(employeeRepository.findById(1L)).thenReturn(Optional.of(existingEmployee));
            when(employeeRepository.existsByEmailIgnoreCaseAndIdNot(anyString(), eq(1L))).thenReturn(false);
            when(employeeRepository.existsByEmployeeIdAndIdNot("EMP-1002", 1L)).thenReturn(true);

            assertThatThrownBy(() -> employeeService.updateEmployee(1L, validRequest))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessage("Employee already exists with employeeId: EMP-1002");

            verify(employeeRepository, never()).saveAndFlush(any(Employee.class));
        }

        @Test
        @DisplayName("throws ResourceNotFoundException for an unknown id")
        void updateEmployee_missing_throwsNotFound() {
            when(employeeRepository.findById(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> employeeService.updateEmployee(404L, validRequest))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessage("Employee not found with id: 404");
        }
    }

    // =============================================================================================
    // Delete
    // =============================================================================================

    @Nested
    @DisplayName("deleteEmployee")
    class DeleteEmployee {

        @Test
        @DisplayName("deletes the loaded entity")
        void deleteEmployee_existing_deletes() {
            when(employeeRepository.findById(1L)).thenReturn(Optional.of(existingEmployee));

            employeeService.deleteEmployee(1L);

            verify(employeeRepository).delete(existingEmployee);
        }

        @Test
        @DisplayName("throws ResourceNotFoundException and never deletes for an unknown id")
        void deleteEmployee_missing_throwsNotFound() {
            when(employeeRepository.findById(7L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> employeeService.deleteEmployee(7L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessage("Employee not found with id: 7");

            verify(employeeRepository, never()).delete(any(Employee.class));
        }
    }

    // =============================================================================================
    // Paginated search / filter
    // =============================================================================================

    @Nested
    @DisplayName("getEmployees")
    class GetEmployees {

        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("builds the pageable from the request and maps the page envelope")
        void getEmployees_mapsPageAndPageable() {
            Employee second = Employee.builder()
                    .id(2L).employeeId("EMP-1002").fullName("Priya Nair").email("priya.nair@kloudspot.com")
                    .phoneNumber("+91 98201 11234").department(Department.ENGINEERING)
                    .designation("Software Engineer II").dateOfJoining(LocalDate.of(2021, 7, 5))
                    .salary(new BigDecimal("1250000.00")).status(EmploymentStatus.ACTIVE).build();
            Pageable requested = PageRequest.of(1, 2, Sort.by(Sort.Direction.DESC, "salary"));
            Page<Employee> page = new PageImpl<>(List.of(existingEmployee, second), requested, 25);
            when(employeeRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

            PagedResponse<EmployeeResponseDTO> response = employeeService.getEmployees(
                    "kloudspot", Department.ENGINEERING, EmploymentStatus.ACTIVE, 1, 2, "salary", "desc");

            ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
            verify(employeeRepository).findAll(any(Specification.class), pageableCaptor.capture());
            Pageable used = pageableCaptor.getValue();
            assertThat(used.getPageNumber()).isEqualTo(1);
            assertThat(used.getPageSize()).isEqualTo(2);
            assertThat(used.getSort().getOrderFor("salary")).isNotNull();
            assertThat(used.getSort().getOrderFor("salary").getDirection()).isEqualTo(Sort.Direction.DESC);

            assertThat(response.getContent()).hasSize(2);
            assertThat(response.getContent()).extracting(EmployeeResponseDTO::getEmployeeId)
                    .containsExactly("EMP-1001", "EMP-1002");
            assertThat(response.getPageNumber()).isEqualTo(1);
            assertThat(response.getPageSize()).isEqualTo(2);
            assertThat(response.getTotalElements()).isEqualTo(25);
            assertThat(response.getTotalPages()).isEqualTo(13);
            assertThat(response.isLast()).isFalse();
        }

        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("clamps page size to 100, floors negative pages and falls back to id for unknown sort fields")
        void getEmployees_sanitisesPagingInput() {
            when(employeeRepository.findAll(any(Specification.class), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of()));

            PagedResponse<EmployeeResponseDTO> response = employeeService.getEmployees(
                    null, null, null, -3, 500, "hackField", "sideways");

            ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
            verify(employeeRepository).findAll(any(Specification.class), pageableCaptor.capture());
            Pageable used = pageableCaptor.getValue();
            assertThat(used.getPageNumber()).isZero();
            assertThat(used.getPageSize()).isEqualTo(EmployeeServiceImpl.MAX_PAGE_SIZE);
            assertThat(used.getSort().getOrderFor("id")).isNotNull();
            assertThat(used.getSort().getOrderFor("id").getDirection()).isEqualTo(Sort.Direction.ASC);
            assertThat(used.getSort().getOrderFor("hackField")).isNull();

            assertThat(response.getContent()).isEmpty();
            assertThat(response.getTotalElements()).isZero();
            assertThat(response.isLast()).isTrue();
        }
    }

    @Nested
    @DisplayName("EmployeeSpecification.withFilters")
    class SpecificationComposition {

        @Mock
        private Root<Employee> root;
        @Mock
        private CriteriaQuery<?> query;
        @Mock
        private CriteriaBuilder cb;
        @Mock
        private Path<String> fullNamePath;
        @Mock
        private Path<String> emailPath;
        @Mock
        private Path<Object> departmentPath;
        @Mock
        private Path<Object> statusPath;
        @Mock
        private Expression<String> lowerFullName;
        @Mock
        private Expression<String> lowerEmail;
        @Mock
        private Predicate likeFullName;
        @Mock
        private Predicate likeEmail;
        @Mock
        private Predicate searchPredicate;
        @Mock
        private Predicate departmentPredicate;
        @Mock
        private Predicate statusPredicate;
        @Mock
        private Predicate combinedPredicate;
        @Mock
        private Predicate conjunction;

        @Test
        @DisplayName("combines case-insensitive search OR with department AND status in one predicate")
        void withFilters_allParameters_composesSinglePredicate() {
            when(root.<String>get("fullName")).thenReturn(fullNamePath);
            when(root.<String>get("email")).thenReturn(emailPath);
            when(root.get("department")).thenReturn(departmentPath);
            when(root.get("status")).thenReturn(statusPath);
            when(cb.lower(fullNamePath)).thenReturn(lowerFullName);
            when(cb.lower(emailPath)).thenReturn(lowerEmail);
            when(cb.like(lowerFullName, "%aarav\\_s%", '\\')).thenReturn(likeFullName);
            when(cb.like(lowerEmail, "%aarav\\_s%", '\\')).thenReturn(likeEmail);
            when(cb.or(likeFullName, likeEmail)).thenReturn(searchPredicate);
            when(cb.equal(departmentPath, Department.ENGINEERING)).thenReturn(departmentPredicate);
            when(cb.equal(statusPath, EmploymentStatus.ACTIVE)).thenReturn(statusPredicate);
            when(cb.and(searchPredicate, departmentPredicate, statusPredicate)).thenReturn(combinedPredicate);

            Specification<Employee> specification = EmployeeSpecification.withFilters(
                    "  AARAV_S ", Department.ENGINEERING, EmploymentStatus.ACTIVE);
            Predicate result = specification.toPredicate(root, query, cb);

            assertThat(result).isSameAs(combinedPredicate);
            verify(cb).and(searchPredicate, departmentPredicate, statusPredicate);
        }

        @Test
        @DisplayName("ignores blank search and null filters, producing a no-op conjunction")
        void withFilters_noParameters_returnsConjunction() {
            when(cb.conjunction()).thenReturn(conjunction);

            Specification<Employee> specification = EmployeeSpecification.withFilters("   ", null, null);
            Predicate result = specification.toPredicate(root, query, cb);

            assertThat(result).isSameAs(conjunction);
            verify(cb, never()).like(any(), anyString(), eq('\\'));
            verify(cb, never()).equal(any(), any());
        }

        @Test
        @DisplayName("applies only the status filter when search and department are absent")
        void withFilters_statusOnly_appliesSinglePredicate() {
            when(root.get("status")).thenReturn(statusPath);
            when(cb.equal(statusPath, EmploymentStatus.INACTIVE)).thenReturn(statusPredicate);
            when(cb.and(statusPredicate)).thenReturn(combinedPredicate);

            Specification<Employee> specification = EmployeeSpecification.withFilters(null, null, EmploymentStatus.INACTIVE);
            Predicate result = specification.toPredicate(root, query, cb);

            assertThat(result).isSameAs(combinedPredicate);
            verify(cb, never()).like(any(), anyString(), eq('\\'));
        }
    }

    // =============================================================================================
    // Department summary
    // =============================================================================================

    @Nested
    @DisplayName("getDepartmentSummary")
    class GetDepartmentSummary {

        @Test
        @DisplayName("returns every department in enum order with total and active counts")
        void getDepartmentSummary_countsPerDepartment() {
            for (Department department : Department.values()) {
                when(employeeRepository.countByDepartment(department)).thenReturn(0L);
                when(employeeRepository.countByDepartmentAndStatus(department, EmploymentStatus.ACTIVE)).thenReturn(0L);
            }
            when(employeeRepository.countByDepartment(Department.ENGINEERING)).thenReturn(6L);
            when(employeeRepository.countByDepartmentAndStatus(Department.ENGINEERING, EmploymentStatus.ACTIVE)).thenReturn(5L);
            when(employeeRepository.countByDepartment(Department.HR)).thenReturn(2L);
            when(employeeRepository.countByDepartmentAndStatus(Department.HR, EmploymentStatus.ACTIVE)).thenReturn(2L);

            List<DepartmentSummaryDTO> summary = employeeService.getDepartmentSummary();

            assertThat(summary).hasSize(Department.values().length);
            assertThat(summary).extracting(DepartmentSummaryDTO::getDepartment)
                    .containsExactly(Department.values());

            DepartmentSummaryDTO engineering = summary.get(0);
            assertThat(engineering.getDepartment()).isEqualTo(Department.ENGINEERING);
            assertThat(engineering.getDisplayName()).isEqualTo("Engineering");
            assertThat(engineering.getTotalEmployees()).isEqualTo(6L);
            assertThat(engineering.getActiveEmployees()).isEqualTo(5L);

            DepartmentSummaryDTO hr = summary.stream()
                    .filter(item -> item.getDepartment() == Department.HR)
                    .findFirst()
                    .orElseThrow();
            assertThat(hr.getDisplayName()).isEqualTo("Human Resources");
            assertThat(hr.getTotalEmployees()).isEqualTo(2L);
            assertThat(hr.getActiveEmployees()).isEqualTo(2L);

            DepartmentSummaryDTO design = summary.stream()
                    .filter(item -> item.getDepartment() == Department.DESIGN)
                    .findFirst()
                    .orElseThrow();
            assertThat(design.getTotalEmployees()).isZero();
            assertThat(design.getActiveEmployees()).isZero();
        }
    }

    // =============================================================================================
    // CSV export
    // =============================================================================================

    @Nested
    @DisplayName("exportEmployeesToCsv")
    class ExportCsv {

        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("writes an RFC 4180 header and one quoted-as-needed row per employee with CRLF line endings")
        void exportEmployeesToCsv_writesHeaderAndRows() {
            Employee tricky = Employee.builder()
                    .id(2L)
                    .employeeId("EMP-1002")
                    .fullName("O'Brien, \"Paddy\"")
                    .email("paddy.obrien@kloudspot.com")
                    .phoneNumber("+353 1 234 5678")
                    .department(Department.SALES)
                    .designation("Account\nExecutive")
                    .dateOfJoining(LocalDate.of(2021, 2, 1))
                    .salary(new BigDecimal("1200000.50"))
                    .status(EmploymentStatus.INACTIVE)
                    .createdAt(LocalDateTime.of(2024, 3, 1, 8, 0))
                    .updatedAt(LocalDateTime.of(2024, 3, 2, 9, 15, 30))
                    .build();
            when(employeeRepository.findAll(any(Specification.class), any(Sort.class)))
                    .thenReturn(List.of(existingEmployee, tricky));

            StringWriter writer = new StringWriter();
            employeeService.exportEmployeesToCsv("obrien", Department.SALES, EmploymentStatus.INACTIVE, writer);

            String csv = writer.toString();
            String[] lines = csv.split("\r\n");

            assertThat(csv).endsWith("\r\n");
            assertThat(lines).hasSize(3);
            assertThat(lines[0]).isEqualTo(
                    "ID,Employee ID,Full Name,Email,Phone Number,Department,Designation,"
                            + "Date of Joining,Salary,Status,Created At,Updated At");
            assertThat(lines[1]).isEqualTo(
                    "1,EMP-1001,Aarav Sharma,aarav.sharma@kloudspot.com,+91 98765 43210,ENGINEERING,"
                            + "Senior Software Engineer,2019-03-11,1850000.00,ACTIVE,2024-01-15T09:30:00,2024-01-15T09:30:00");
            assertThat(lines[2]).isEqualTo(
                    "2,EMP-1002,\"O'Brien, \"\"Paddy\"\"\",paddy.obrien@kloudspot.com,+353 1 234 5678,SALES,"
                            + "\"Account\nExecutive\",2021-02-01,1200000.50,INACTIVE,2024-03-01T08:00:00,2024-03-02T09:15:30");

            ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
            verify(employeeRepository).findAll(any(Specification.class), sortCaptor.capture());
            assertThat(sortCaptor.getValue().getOrderFor("id")).isNotNull();
            assertThat(sortCaptor.getValue().getOrderFor("id").getDirection()).isEqualTo(Sort.Direction.ASC);
        }

        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("writes only the header when no employees match the filters")
        void exportEmployeesToCsv_noMatches_writesHeaderOnly() {
            when(employeeRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

            StringWriter writer = new StringWriter();
            employeeService.exportEmployeesToCsv("nobody", null, null, writer);

            assertThat(writer.toString()).isEqualTo(
                    "ID,Employee ID,Full Name,Email,Phone Number,Department,Designation,"
                            + "Date of Joining,Salary,Status,Created At,Updated At\r\n");
        }

        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("wraps writer failures in UncheckedIOException")
        void exportEmployeesToCsv_writerFails_throwsUnchecked() {
            when(employeeRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());
            Writer failing = new Writer() {
                @Override
                public void write(char[] cbuf, int off, int len) throws IOException {
                    throw new IOException("disk full");
                }

                @Override
                public void flush() {
                }

                @Override
                public void close() {
                }
            };

            assertThatThrownBy(() -> employeeService.exportEmployeesToCsv(null, null, null, failing))
                    .isInstanceOf(UncheckedIOException.class)
                    .hasMessage("Failed to write CSV export")
                    .hasCauseInstanceOf(IOException.class);
        }

        @Test
        @DisplayName("escapeCsvField quotes only fields containing commas, quotes or line breaks")
        void escapeCsvField_quotesOnlyWhenNeeded() {
            assertThat(EmployeeServiceImpl.escapeCsvField("plain")).isEqualTo("plain");
            assertThat(EmployeeServiceImpl.escapeCsvField("")).isEmpty();
            assertThat(EmployeeServiceImpl.escapeCsvField(null)).isEmpty();
            assertThat(EmployeeServiceImpl.escapeCsvField("a,b")).isEqualTo("\"a,b\"");
            assertThat(EmployeeServiceImpl.escapeCsvField("say \"hi\"")).isEqualTo("\"say \"\"hi\"\"\"");
            assertThat(EmployeeServiceImpl.escapeCsvField("line\r\nbreak")).isEqualTo("\"line\r\nbreak\"");
        }
    }
}
