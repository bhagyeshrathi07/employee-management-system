package com.kloudspot.ems.exception;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.kloudspot.ems.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Translates exceptions into the standard {@link ErrorResponse} JSON envelope.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex,
                                                                HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), request, null);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResource(DuplicateResourceException ex,
                                                                 HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), request, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex,
                                                          HttpServletRequest request) {
        Map<String, String> validationErrors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            String message = fieldError.getDefaultMessage() == null ? "Invalid value" : fieldError.getDefaultMessage();
            validationErrors.merge(fieldError.getField(), message, (existing, next) -> existing + "; " + next);
        }
        ex.getBindingResult().getGlobalErrors().forEach(globalError ->
                validationErrors.merge(globalError.getObjectName(),
                        globalError.getDefaultMessage() == null ? "Invalid request" : globalError.getDefaultMessage(),
                        (existing, next) -> existing + "; " + next));
        return build(HttpStatus.BAD_REQUEST, "Validation failed for one or more fields", request, validationErrors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex,
                                                                   HttpServletRequest request) {
        Map<String, String> validationErrors = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(violation -> {
            String path = violation.getPropertyPath() == null ? "request" : violation.getPropertyPath().toString();
            String field = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
            validationErrors.merge(field, violation.getMessage(), (existing, next) -> existing + "; " + next);
        });
        return build(HttpStatus.BAD_REQUEST, "Validation failed for one or more parameters", request, validationErrors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableMessage(HttpMessageNotReadableException ex,
                                                                 HttpServletRequest request) {
        Throwable cause = ex.getCause();
        if (cause instanceof InvalidFormatException invalidFormat) {
            String field = invalidFormat.getPath().stream()
                    .map(JsonMappingException.Reference::getFieldName)
                    .filter(name -> name != null && !name.isBlank())
                    .collect(Collectors.joining("."));
            String allowed = "";
            Class<?> targetType = invalidFormat.getTargetType();
            if (targetType != null && targetType.isEnum()) {
                allowed = " Allowed values: " + Arrays.stream(targetType.getEnumConstants())
                        .map(Object::toString)
                        .collect(Collectors.joining(", "));
            }
            String message = String.format("Invalid value '%s'.%s", invalidFormat.getValue(), allowed);
            Map<String, String> validationErrors = new LinkedHashMap<>();
            validationErrors.put(field.isBlank() ? "request" : field, message.trim());
            return build(HttpStatus.BAD_REQUEST, "Malformed request body", request, validationErrors);
        }
        return build(HttpStatus.BAD_REQUEST, "Malformed or unreadable request body", request, null);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                            HttpServletRequest request) {
        String allowed = "";
        Class<?> requiredType = ex.getRequiredType();
        if (requiredType != null && requiredType.isEnum()) {
            allowed = ". Allowed values: " + Arrays.stream(requiredType.getEnumConstants())
                    .map(Object::toString)
                    .collect(Collectors.joining(", "));
        } else if (requiredType != null) {
            allowed = ". Expected type: " + requiredType.getSimpleName();
        }
        String message = String.format("Invalid value '%s' for parameter '%s'%s", ex.getValue(), ex.getName(), allowed);
        return build(HttpStatus.BAD_REQUEST, message, request, null);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex,
                                                                HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), request, null);
    }

    @ExceptionHandler(PropertyReferenceException.class)
    public ResponseEntity<ErrorResponse> handleInvalidSortProperty(PropertyReferenceException ex,
                                                                   HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Invalid sort property: " + ex.getPropertyName(), request, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex,
                                                             HttpServletRequest request) {
        log.warn("Data integrity violation on {}: {}", request.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT,
                "The request conflicts with existing data (duplicate email or employee ID)", request, null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex,
                                                                  HttpServletRequest request) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, ex.getMessage(), request, null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex,
                                                          HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "No endpoint found for " + request.getMethod() + " " + request.getRequestURI(),
                request, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception processing {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.",
                request, null);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message, HttpServletRequest request,
                                                Map<String, String> validationErrors) {
        ErrorResponse body = ErrorResponse.of(status.value(), status.getReasonPhrase(), message,
                request.getRequestURI(), validationErrors);
        return ResponseEntity.status(status).body(body);
    }
}
