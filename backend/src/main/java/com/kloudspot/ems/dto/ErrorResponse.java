package com.kloudspot.ems.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Standard error envelope returned for every non-2xx API response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "ErrorResponse", description = "Standard error payload")
public class ErrorResponse {

    @Schema(example = "2024-01-15T09:30:00.123")
    private LocalDateTime timestamp;

    @Schema(description = "HTTP status code", example = "404")
    private int status;

    @Schema(description = "HTTP reason phrase", example = "Not Found")
    private String error;

    @Schema(description = "Human readable message", example = "Employee not found with id: 99")
    private String message;

    @Schema(description = "Request path", example = "/api/v1/employees/99")
    private String path;

    @Schema(description = "Field-level validation errors (only for 400 validation failures)", nullable = true)
    private Map<String, String> validationErrors;

    public static ErrorResponse of(int status, String error, String message, String path) {
        return of(status, error, message, path, null);
    }

    public static ErrorResponse of(int status, String error, String message, String path,
                                   Map<String, String> validationErrors) {
        return ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status)
                .error(error)
                .message(message)
                .path(path)
                .validationErrors(validationErrors)
                .build();
    }
}
