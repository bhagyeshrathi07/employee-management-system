package com.kloudspot.ems.controller;

import com.kloudspot.ems.dto.EmployeeRequestDTO;
import com.kloudspot.ems.dto.EmployeeResponseDTO;
import com.kloudspot.ems.dto.ErrorResponse;
import com.kloudspot.ems.dto.PagedResponse;
import com.kloudspot.ems.model.Department;
import com.kloudspot.ems.model.EmploymentStatus;
import com.kloudspot.ems.service.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.URI;

/**
 * REST endpoints for employee CRUD, search, filtering, pagination and CSV export.
 */
@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employees", description = "Employee CRUD, search, filtering, pagination and CSV export")
public class EmployeeController {

    private final EmployeeService employeeService;

    @Operation(summary = "List employees",
            description = "Returns a paginated list. `search` matches full name or email (case-insensitive); "
                    + "`department` and `status` are optional filters applied in the same query.")
    @ApiResponse(responseCode = "200", description = "Page of employees")
    @GetMapping
    public ResponseEntity<PagedResponse<EmployeeResponseDTO>> getEmployees(
            @Parameter(description = "Free-text search on full name or email", example = "aarav")
            @RequestParam(required = false) String search,
            @Parameter(description = "Department filter", example = "ENGINEERING")
            @RequestParam(required = false) Department department,
            @Parameter(description = "Employment status filter", example = "ACTIVE")
            @RequestParam(required = false) EmploymentStatus status,
            @Parameter(description = "Zero-based page index", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size (1-100)", example = "10")
            @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Sort property", example = "id")
            @RequestParam(defaultValue = "id") String sortBy,
            @Parameter(description = "Sort direction: asc or desc", example = "asc")
            @RequestParam(defaultValue = "asc") String sortDir) {
        return ResponseEntity.ok(employeeService.getEmployees(search, department, status, page, size, sortBy, sortDir));
    }

    @Operation(summary = "Get employee by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Employee found"),
            @ApiResponse(responseCode = "404", description = "Employee not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> getEmployeeById(
            @Parameter(description = "Database ID of the employee", example = "1") @PathVariable Long id) {
        return ResponseEntity.ok(employeeService.getEmployeeById(id));
    }

    @Operation(summary = "Create employee",
            description = "Creates a new employee. Omit `employeeId` to auto-generate an `EMP-XXXX` code.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Employee created"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Duplicate email or employee ID",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<EmployeeResponseDTO> createEmployee(@Valid @RequestBody EmployeeRequestDTO request) {
        EmployeeResponseDTO created = employeeService.createEmployee(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "Update employee")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Employee updated"),
            @ApiResponse(responseCode = "400", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Employee not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Duplicate email or employee ID",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponseDTO> updateEmployee(
            @Parameter(description = "Database ID of the employee", example = "1") @PathVariable Long id,
            @Valid @RequestBody EmployeeRequestDTO request) {
        return ResponseEntity.ok(employeeService.updateEmployee(id, request));
    }

    @Operation(summary = "Delete employee")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Employee deleted"),
            @ApiResponse(responseCode = "404", description = "Employee not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(
            @Parameter(description = "Database ID of the employee", example = "1") @PathVariable Long id) {
        employeeService.deleteEmployee(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @Operation(summary = "Export employees as CSV",
            description = "Streams an RFC 4180 CSV file (`employees.csv`) honouring the same search, "
                    + "department and status filters as the list endpoint.")
    @ApiResponse(responseCode = "200", description = "CSV file",
            content = @Content(mediaType = "text/csv"))
    @GetMapping(value = "/export/csv", produces = "text/csv")
    public void exportEmployeesToCsv(
            @Parameter(description = "Free-text search on full name or email")
            @RequestParam(required = false) String search,
            @Parameter(description = "Department filter")
            @RequestParam(required = false) Department department,
            @Parameter(description = "Employment status filter")
            @RequestParam(required = false) EmploymentStatus status,
            HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.OK.value());
        response.setContentType("text/csv; charset=UTF-8");
        response.setCharacterEncoding("UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"employees.csv\"");
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");
        employeeService.exportEmployeesToCsv(search, department, status, response.getWriter());
        response.flushBuffer();
    }
}
