package com.kloudspot.ems.exception;

/**
 * Raised when a uniqueness constraint (email / employeeId) would be violated. Mapped to HTTP 409.
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }

    public DuplicateResourceException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s already exists with %s: %s", resourceName, fieldName, fieldValue));
    }
}
