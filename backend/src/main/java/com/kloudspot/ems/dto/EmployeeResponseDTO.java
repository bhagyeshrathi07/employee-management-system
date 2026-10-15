package com.kloudspot.ems.dto;

import com.kloudspot.ems.model.Department;
import com.kloudspot.ems.model.Employee;
import com.kloudspot.ems.model.EmploymentStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Employee representation returned by the API.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "EmployeeResponse", description = "Employee record")
public class EmployeeResponseDTO {

    @Schema(example = "1")
    private Long id;

    @Schema(example = "EMP-1001")
    private String employeeId;

    @Schema(example = "Aarav Sharma")
    private String fullName;

    @Schema(example = "aarav.sharma@kloudspot.com")
    private String email;

    @Schema(example = "+91 98765 43210")
    private String phoneNumber;

    @Schema(example = "ENGINEERING")
    private Department department;

    @Schema(example = "Senior Software Engineer")
    private String designation;

    @Schema(example = "2019-03-11", type = "string", format = "date")
    private LocalDate dateOfJoining;

    @Schema(example = "1850000.00")
    private BigDecimal salary;

    @Schema(example = "ACTIVE")
    private EmploymentStatus status;

    @Schema(example = "2024-01-15T09:30:00")
    private LocalDateTime createdAt;

    @Schema(example = "2024-01-15T09:30:00")
    private LocalDateTime updatedAt;

    /**
     * Maps a persisted {@link Employee} entity to its API representation.
     */
    public static EmployeeResponseDTO fromEntity(Employee employee) {
        return EmployeeResponseDTO.builder()
                .id(employee.getId())
                .employeeId(employee.getEmployeeId())
                .fullName(employee.getFullName())
                .email(employee.getEmail())
                .phoneNumber(employee.getPhoneNumber())
                .department(employee.getDepartment())
                .designation(employee.getDesignation())
                .dateOfJoining(employee.getDateOfJoining())
                .salary(employee.getSalary())
                .status(employee.getStatus())
                .createdAt(employee.getCreatedAt())
                .updatedAt(employee.getUpdatedAt())
                .build();
    }
}
