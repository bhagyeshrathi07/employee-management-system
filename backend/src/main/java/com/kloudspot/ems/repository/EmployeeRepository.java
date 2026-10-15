package com.kloudspot.ems.repository;

import com.kloudspot.ems.model.Department;
import com.kloudspot.ems.model.Employee;
import com.kloudspot.ems.model.EmploymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data repository for {@link Employee}. Dynamic filtering is handled through
 * {@link JpaSpecificationExecutor} together with {@link EmployeeSpecification}.
 */
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {

    Optional<Employee> findByEmployeeId(String employeeId);

    Optional<Employee> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    boolean existsByEmployeeId(String employeeId);

    boolean existsByEmployeeIdAndIdNot(String employeeId, Long id);

    long countByDepartment(Department department);

    long countByDepartmentAndStatus(Department department, EmploymentStatus status);
}
