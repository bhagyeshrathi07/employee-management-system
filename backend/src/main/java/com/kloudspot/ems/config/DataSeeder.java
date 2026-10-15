package com.kloudspot.ems.config;

import com.kloudspot.ems.model.Department;
import com.kloudspot.ems.model.Employee;
import com.kloudspot.ems.model.EmploymentStatus;
import com.kloudspot.ems.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static com.kloudspot.ems.model.Department.DESIGN;
import static com.kloudspot.ems.model.Department.ENGINEERING;
import static com.kloudspot.ems.model.Department.FINANCE;
import static com.kloudspot.ems.model.Department.HR;
import static com.kloudspot.ems.model.Department.MARKETING;
import static com.kloudspot.ems.model.Department.OPERATIONS;
import static com.kloudspot.ems.model.Department.PRODUCT;
import static com.kloudspot.ems.model.Department.SALES;
import static com.kloudspot.ems.model.EmploymentStatus.ACTIVE;
import static com.kloudspot.ems.model.EmploymentStatus.INACTIVE;

/**
 * Seeds 25 realistic employees across all eight departments when the database is empty, so the
 * reviewer gets working pagination (3 pages at size 10), search and filters out of the box.
 * Disable with {@code APP_SEED_ENABLED=false}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder implements CommandLineRunner {

    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public void run(String... args) {
        long existing = employeeRepository.count();
        if (existing > 0) {
            log.info("Employee table already contains {} records; skipping seed data.", existing);
            return;
        }

        List<Employee> employees = List.of(
                // ENGINEERING (6)
                employee("EMP-1001", "Aarav Sharma", "aarav.sharma@kloudspot.com", "+91 98765 43210",
                        ENGINEERING, "Senior Software Engineer", "2019-03-11", "1850000.00", ACTIVE),
                employee("EMP-1002", "Priya Nair", "priya.nair@kloudspot.com", "+91 98201 11234",
                        ENGINEERING, "Software Engineer II", "2021-07-05", "1250000.00", ACTIVE),
                employee("EMP-1003", "Rohan Mehta", "rohan.mehta@kloudspot.com", "+91 99870 22345",
                        ENGINEERING, "Staff Engineer", "2017-01-16", "2650000.00", ACTIVE),
                employee("EMP-1004", "Emily Carter", "emily.carter@kloudspot.com", "+1 (415) 555-0132",
                        ENGINEERING, "DevOps Engineer", "2020-09-21", "1450000.00", ACTIVE),
                employee("EMP-1005", "Daniel Kim", "daniel.kim@kloudspot.com", "+1 (650) 555-0198",
                        ENGINEERING, "QA Automation Engineer", "2022-02-14", "980000.00", INACTIVE),
                employee("EMP-1006", "Sneha Iyer", "sneha.iyer@kloudspot.com", "+91 97654 33456",
                        ENGINEERING, "Backend Engineer", "2023-06-01", "1100000.00", ACTIVE),

                // PRODUCT (3)
                employee("EMP-1007", "Vikram Singh", "vikram.singh@kloudspot.com", "+91 98111 44567",
                        PRODUCT, "Product Manager", "2018-11-05", "2100000.00", ACTIVE),
                employee("EMP-1008", "Olivia Bennett", "olivia.bennett@kloudspot.com", "+44 20 7946 0958",
                        PRODUCT, "Associate Product Manager", "2022-08-22", "1150000.00", ACTIVE),
                employee("EMP-1009", "Karan Patel", "karan.patel@kloudspot.com", "+91 98989 55678",
                        PRODUCT, "Senior Product Manager", "2016-04-18", "2750000.00", INACTIVE),

                // DESIGN (3)
                employee("EMP-1010", "Meera Krishnan", "meera.krishnan@kloudspot.com", "+91 96543 66789",
                        DESIGN, "UX Designer", "2020-01-13", "1050000.00", ACTIVE),
                employee("EMP-1011", "Lucas Moreau", "lucas.moreau@kloudspot.com", "+33 1 45 67 89 01",
                        DESIGN, "Senior Product Designer", "2018-06-25", "1600000.00", ACTIVE),
                employee("EMP-1012", "Ananya Bose", "ananya.bose@kloudspot.com", "+91 95432 77890",
                        DESIGN, "Visual Designer", "2023-03-06", "820000.00", ACTIVE),

                // MARKETING (3)
                employee("EMP-1013", "Sophia Martinez", "sophia.martinez@kloudspot.com", "+1 (212) 555-0147",
                        MARKETING, "Marketing Manager", "2019-10-07", "1500000.00", ACTIVE),
                employee("EMP-1014", "Arjun Reddy", "arjun.reddy@kloudspot.com", "+91 94321 88901",
                        MARKETING, "Content Strategist", "2021-05-17", "900000.00", ACTIVE),
                employee("EMP-1015", "Hannah Lee", "hannah.lee@kloudspot.com", "+1 (312) 555-0163",
                        MARKETING, "Digital Marketing Specialist", "2022-11-28", "850000.00", INACTIVE),

                // SALES (3)
                employee("EMP-1016", "Rahul Verma", "rahul.verma@kloudspot.com", "+91 93210 99012",
                        SALES, "Regional Sales Manager", "2017-08-14", "1950000.00", ACTIVE),
                employee("EMP-1017", "Isabella Rossi", "isabella.rossi@kloudspot.com", "+39 06 1234 5678",
                        SALES, "Account Executive", "2021-02-01", "1200000.00", ACTIVE),
                employee("EMP-1018", "Nikhil Joshi", "nikhil.joshi@kloudspot.com", "+91 92109 10123",
                        SALES, "Sales Development Representative", "2024-01-08", "650000.00", ACTIVE),

                // HR (2)
                employee("EMP-1019", "Kavya Menon", "kavya.menon@kloudspot.com", "+91 91098 21234",
                        HR, "HR Business Partner", "2018-02-19", "1400000.00", ACTIVE),
                employee("EMP-1020", "James Okafor", "james.okafor@kloudspot.com", "+1 (737) 555-0179",
                        HR, "Talent Acquisition Specialist", "2022-04-11", "950000.00", ACTIVE),

                // FINANCE (3)
                employee("EMP-1021", "Deepak Agarwal", "deepak.agarwal@kloudspot.com", "+91 90987 32345",
                        FINANCE, "Finance Controller", "2015-09-28", "2400000.00", ACTIVE),
                employee("EMP-1022", "Chloe Dubois", "chloe.dubois@kloudspot.com", "+33 1 23 45 67 89",
                        FINANCE, "Financial Analyst", "2021-09-13", "1050000.00", ACTIVE),
                employee("EMP-1023", "Suresh Pillai", "suresh.pillai@kloudspot.com", "+91 89876 43456",
                        FINANCE, "Accounts Payable Specialist", "2019-12-02", "780000.00", INACTIVE),

                // OPERATIONS (2)
                employee("EMP-1024", "Fatima Khan", "fatima.khan@kloudspot.com", "+91 88765 54567",
                        OPERATIONS, "Operations Manager", "2018-07-30", "1650000.00", ACTIVE),
                employee("EMP-1025", "Ethan Walker", "ethan.walker@kloudspot.com", "+1 (206) 555-0186",
                        OPERATIONS, "Facilities Coordinator", "2023-10-16", "700000.00", INACTIVE)
        );

        employeeRepository.saveAll(employees);
        log.info("Seeded {} employees across {} departments.", employees.size(), Department.values().length);
    }

    private static Employee employee(String employeeId, String fullName, String email, String phoneNumber,
                                     Department department, String designation, String dateOfJoining,
                                     String salary, EmploymentStatus status) {
        return Employee.builder()
                .employeeId(employeeId)
                .fullName(fullName)
                .email(email)
                .phoneNumber(phoneNumber)
                .department(department)
                .designation(designation)
                .dateOfJoining(LocalDate.parse(dateOfJoining))
                .salary(new BigDecimal(salary))
                .status(status)
                .build();
    }
}
