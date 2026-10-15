package com.kloudspot.ems.repository;

import com.kloudspot.ems.model.Department;
import com.kloudspot.ems.model.Employee;
import com.kloudspot.ems.model.EmploymentStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Builds composable JPA {@link Specification}s for employee queries so that free-text search,
 * department and status filters are applied in a single database query.
 */
public final class EmployeeSpecification {

    private EmployeeSpecification() {
    }

    /**
     * Case-insensitive LIKE match on {@code fullName} OR {@code email}.
     */
    public static Specification<Employee> searchContains(String search) {
        return (root, query, cb) -> {
            if (search == null || search.isBlank()) {
                return cb.conjunction();
            }
            String pattern = "%" + escapeLike(search.trim().toLowerCase(Locale.ROOT)) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("fullName")), pattern, '\\'),
                    cb.like(cb.lower(root.get("email")), pattern, '\\')
            );
        };
    }

    public static Specification<Employee> hasDepartment(Department department) {
        return (root, query, cb) -> department == null
                ? cb.conjunction()
                : cb.equal(root.get("department"), department);
    }

    public static Specification<Employee> hasStatus(EmploymentStatus status) {
        return (root, query, cb) -> status == null
                ? cb.conjunction()
                : cb.equal(root.get("status"), status);
    }

    /**
     * Combines all filters with AND semantics. Null / blank parameters are ignored.
     */
    public static Specification<Employee> withFilters(String search, Department department, EmploymentStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + escapeLike(search.trim().toLowerCase(Locale.ROOT)) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern, '\\'),
                        cb.like(cb.lower(root.get("email")), pattern, '\\')
                ));
            }
            if (department != null) {
                predicates.add(cb.equal(root.get("department"), department));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return predicates.isEmpty()
                    ? cb.conjunction()
                    : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Escapes LIKE wildcard characters so user input is matched literally.
     */
    private static String escapeLike(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
