package com.kloudspot.ems.dto;

import com.kloudspot.ems.model.Department;
import com.kloudspot.ems.model.EmploymentStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Payload accepted by the create and update employee endpoints.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "EmployeeRequest", description = "Employee create / update payload")
public class EmployeeRequestDTO {

    @Schema(description = "Unique business identifier. Leave blank on create to auto-generate (EMP-XXXX).",
            example = "EMP-1001", nullable = true)
    @Pattern(regexp = "^\\s*$|^[A-Za-z0-9-]{3,20}$",
            message = "Employee ID must be 3-20 characters using letters, digits or hyphens")
    private String employeeId;

    @Schema(description = "Full name of the employee", example = "Aarav Sharma")
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Schema(description = "Unique work email address", example = "aarav.sharma@kloudspot.com")
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Size(max = 150, message = "Email must not exceed 150 characters")
    private String email;

    @Schema(description = "Contact phone number", example = "+91 98765 43210")
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9\\-\\s()]{7,20}$",
            message = "Phone number must be 7-20 characters and may contain digits, spaces, hyphens, parentheses and a leading +")
    private String phoneNumber;

    @Schema(description = "Department", example = "ENGINEERING")
    @NotNull(message = "Department is required")
    private Department department;

    @Schema(description = "Job title / designation", example = "Senior Software Engineer")
    @NotBlank(message = "Designation is required")
    @Size(min = 2, max = 100, message = "Designation must be between 2 and 100 characters")
    private String designation;

    @Schema(description = "Date of joining (ISO-8601)", example = "2021-07-05", type = "string", format = "date")
    @NotNull(message = "Date of joining is required")
    private LocalDate dateOfJoining;

    @Schema(description = "Annual salary", example = "1250000.00")
    @NotNull(message = "Salary is required")
    @Positive(message = "Salary must be greater than zero")
    @Digits(integer = 10, fraction = 2, message = "Salary must have at most 10 integer digits and 2 decimal places")
    private BigDecimal salary;

    @Schema(description = "Employment status", example = "ACTIVE")
    @NotNull(message = "Status is required")
    private EmploymentStatus status;
}
