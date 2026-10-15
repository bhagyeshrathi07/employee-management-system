package com.kloudspot.ems.dto;

import com.kloudspot.ems.model.Department;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Headcount summary for a single department.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "DepartmentSummary", description = "Department metadata and headcount")
public class DepartmentSummaryDTO {

    @Schema(example = "ENGINEERING")
    private Department department;

    @Schema(example = "Engineering")
    private String displayName;

    @Schema(description = "All employees in the department regardless of status", example = "6")
    private long totalEmployees;

    @Schema(description = "Employees with ACTIVE status", example = "5")
    private long activeEmployees;
}
