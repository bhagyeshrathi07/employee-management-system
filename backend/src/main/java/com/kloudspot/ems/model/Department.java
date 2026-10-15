package com.kloudspot.ems.model;

/**
 * Organisational departments an employee can belong to.
 */
public enum Department {
    ENGINEERING("Engineering"),
    PRODUCT("Product"),
    DESIGN("Design"),
    MARKETING("Marketing"),
    SALES("Sales"),
    HR("Human Resources"),
    FINANCE("Finance"),
    OPERATIONS("Operations");

    private final String displayName;

    Department(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
