package com.kloudspot.ems.controller;

import com.kloudspot.ems.dto.DepartmentSummaryDTO;
import com.kloudspot.ems.service.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST endpoint exposing department metadata and headcounts.
 */
@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
@Tag(name = "Departments", description = "Department metadata and headcount summaries")
public class DepartmentController {

    private final EmployeeService employeeService;

    @Operation(summary = "List departments with headcounts",
            description = "Returns every department with its display name, total and active employee counts.")
    @ApiResponse(responseCode = "200", description = "Department summaries")
    @GetMapping
    public ResponseEntity<List<DepartmentSummaryDTO>> getDepartments() {
        return ResponseEntity.ok(employeeService.getDepartmentSummary());
    }
}
