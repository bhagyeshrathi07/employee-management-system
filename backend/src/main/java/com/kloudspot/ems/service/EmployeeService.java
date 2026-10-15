package com.kloudspot.ems.service;

import com.kloudspot.ems.dto.DepartmentSummaryDTO;
import com.kloudspot.ems.dto.EmployeeRequestDTO;
import com.kloudspot.ems.dto.EmployeeResponseDTO;
import com.kloudspot.ems.dto.PagedResponse;
import com.kloudspot.ems.model.Department;
import com.kloudspot.ems.model.EmploymentStatus;

import java.io.Writer;
import java.util.List;

/**
 * Business operations for employee management.
 */
public interface EmployeeService {

    /**
     * Returns a page of employees matching the optional search text, department and status filters.
     *
     * @param search     case-insensitive text matched against full name or email (nullable)
     * @param department department filter (nullable)
     * @param status     status filter (nullable)
     * @param page       zero-based page index
     * @param size       page size (clamped to 1..100)
     * @param sortBy     entity property to sort by (falls back to {@code id} if unknown)
     * @param sortDir    {@code asc} or {@code desc}
     */
    PagedResponse<EmployeeResponseDTO> getEmployees(String search, Department department, EmploymentStatus status,
                                                    int page, int size, String sortBy, String sortDir);

    EmployeeResponseDTO getEmployeeById(Long id);

    EmployeeResponseDTO createEmployee(EmployeeRequestDTO request);

    EmployeeResponseDTO updateEmployee(Long id, EmployeeRequestDTO request);

    void deleteEmployee(Long id);

    /**
     * Streams an RFC 4180 CSV of all employees matching the filters to the supplied writer.
     */
    void exportEmployeesToCsv(String search, Department department, EmploymentStatus status, Writer writer);

    /**
     * Returns headcount metadata for every department (including departments with zero employees).
     */
    List<DepartmentSummaryDTO> getDepartmentSummary();
}
