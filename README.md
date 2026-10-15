# Employee Management System

Full-stack **Employee Management System** built for the **Kloudspot Candidate Technical Assessment**.

Spring Boot 3 REST API + PostgreSQL 16 + React 18 (Vite, TypeScript, Tailwind CSS), secured with
stateless HTTP Basic authentication, with department KPIs, CSV export, Swagger UI, automated tests
on both tiers and a one-command Docker Compose setup.

> **Default login:** `admin` / `admin123`

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project structure](#project-structure)
5. [Quick start - Docker Compose (recommended)](#quick-start--docker-compose-recommended)
6. [Manual local setup](#manual-local-setup)
7. [Default credentials](#default-credentials)
8. [API reference](#api-reference)
9. [Swagger UI and Postman](#swagger-ui-and-postman)
10. [Sample cURL commands](#sample-curl-commands)
11. [Running the tests](#running-the-tests)
12. [Configuration](#configuration)
13. [Troubleshooting](#troubleshooting)
14. [Design notes](#design-notes)

---

## Features

### Core

- **Employee CRUD** - create, read, update, delete with full validation on both client and server.
- **Server-side search, filter, sort and pagination** - `search` (name or email, case-insensitive),
  `department`, `status`, `page`, `size`, `sortBy`, `sortDir` are composed into **one** JPA
  Specification query.
- **Auto-generated employee codes** - leave `employeeId` blank and the service assigns the next free
  `EMP-XXXX`; supply one and uniqueness is enforced.
- **Standardised error envelope** - every non-2xx response is
  `{ timestamp, status, error, message, path, validationErrors }`.
- **Seed data** - 25 realistic employees across all 8 departments are inserted automatically into an
  empty database, so pagination (3 pages at size 10), search and filters work immediately.

### Bonus features (all included)

| # | Feature | Where |
|---|---------|-------|
| 1 | **Login and Basic Authentication** - stateless HTTP Basic, custom JSON `401` **without** `WWW-Authenticate` so the browser never shows its native popup over the React login page | `SecurityConfig`, `LoginPage`, `AuthContext` |
| 2 | **Department management** - `GET /api/v1/departments` with headcounts; KPI cards, per-department breakdown and department filter on the dashboard | `DepartmentController`, `EmployeeListPage` |
| 3 | **Export to CSV** - `GET /api/v1/employees/export/csv` streams RFC 4180 CSV honouring the active `search` / `department` / `status`; one-click download button in the UI | `EmployeeServiceImpl`, `employeeApi.ts` |
| 4 | **Docker Compose** - `postgres` + `backend` + `frontend` (nginx with `/api` reverse proxy and SPA fallback) with health checks and ordered start-up | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf` |
| 5 | **Automated frontend tests** - Vitest + React Testing Library covering table rendering, search, status/department filters, empty state, CSV export, delete flow and error state | `frontend/src/test/` |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Backend | Java 17, Spring Boot 3.3.4, Spring Web, Spring Data JPA (Hibernate 6), Spring Security, Jakarta Validation, Spring Boot Actuator, springdoc-openapi 2.6.0, Lombok, Maven |
| Database | PostgreSQL 16 (`postgres:16-alpine`) |
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind CSS 3, React Router 6, Axios, Lucide React |
| Testing | JUnit 5 + Mockito + AssertJ (backend), Vitest + React Testing Library + jsdom (frontend) |
| Containers | Docker Compose, `maven:3.9.9-eclipse-temurin-17-alpine` -> `eclipse-temurin:17-jre-alpine`, `node:20-alpine` -> `nginx:stable-alpine` |

---

## Architecture

```text
                                   docker compose up --build
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                         │
 │   Browser ──► http://localhost:3000                                                     │
 │                 │                                                                       │
 │                 ▼                                                                       │
 │   ┌──────────────────────────┐   /api/*  (reverse proxy)   ┌──────────────────────────┐ │
 │   │  frontend  (nginx)       │ ─────────────────────────►  │  backend  (Spring Boot)  │ │
 │   │  React SPA bundle        │                             │  :8080                   │ │
 │   │  try_files → index.html  │ ◄─────────────────────────  │  /api/v1/**  (Basic Auth)│ │
 │   └──────────────────────────┘        JSON / CSV           │  /swagger-ui.html        │ │
 │                                                            │  /actuator/health        │ │
 │                                                            └────────────┬─────────────┘ │
 │                                                                         │ JDBC          │
 │                                                                         ▼               │
 │                                                            ┌──────────────────────────┐ │
 │                                                            │  postgres  (16-alpine)   │ │
 │                                                            │  db: employeedb          │ │
 │                                                            │  volume: ems-postgres-data│ │
 │                                                            └──────────────────────────┘ │
 └─────────────────────────────────────────────────────────────────────────────────────────┘

 Backend layering
   Controller (REST, validation)  →  Service (business rules, uniqueness, CSV, EMP-XXXX)
   →  Repository (Spring Data JPA + JpaSpecificationExecutor)  →  PostgreSQL
   GlobalExceptionHandler (@RestControllerAdvice) → uniform JSON error envelope
   SecurityConfig → stateless HTTP Basic, JSON 401/403, CORS

 Frontend layering
   pages/  (List · Form · Detail · Login)  →  api/employeeApi.ts (Axios, Basic header, 401 listener)
   context/AuthContext.tsx (session)  ·  components/ (Navbar, ConfirmDeleteModal)  ·  types/ · utils/
```

In local development the Vite dev server (`:5173`) plays the same role as nginx: it proxies `/api`
to `http://localhost:8080`, so the frontend always calls the relative base URL `/api/v1`.

---

## Project structure

```text
employee-management-system/
├── docker-compose.yml                  # postgres + backend + frontend orchestration
├── postman_collection.json             # Postman v2.1 collection (Basic Auth pre-configured)
├── README.md
├── backend/
│   ├── Dockerfile                      # multi-stage Maven build → JRE runtime
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/kloudspot/ems/
│       │   ├── EmployeeManagementApplication.java
│       │   ├── config/        SecurityConfig · OpenApiConfig · DataSeeder
│       │   ├── controller/    EmployeeController · DepartmentController · AuthController
│       │   ├── dto/           EmployeeRequestDTO · EmployeeResponseDTO · PagedResponse ·
│       │   │                  DepartmentSummaryDTO · ErrorResponse
│       │   ├── exception/     ResourceNotFoundException · DuplicateResourceException ·
│       │   │                  GlobalExceptionHandler
│       │   ├── model/         Employee · Department · EmploymentStatus
│       │   ├── repository/    EmployeeRepository · EmployeeSpecification
│       │   └── service/       EmployeeService · EmployeeServiceImpl
│       ├── main/resources/application.yml
│       └── test/java/com/kloudspot/ems/service/EmployeeServiceTest.java
└── frontend/
    ├── Dockerfile                      # multi-stage Node build → nginx runtime
    ├── nginx.conf                      # /api reverse proxy + SPA fallback
    ├── index.html · package.json · vite.config.ts · tsconfig.json · tailwind.config.js
    └── src/
        ├── api/employeeApi.ts          # Axios client, Basic Auth injection, 401 listener, CSV download
        ├── context/AuthContext.tsx     # session state (sessionStorage) + login/logout
        ├── components/                 # Navbar · ConfirmDeleteModal
        ├── pages/                      # LoginPage · EmployeeListPage · EmployeeFormPage · EmployeeDetailPage
        ├── types/employee.ts           # contract types mirroring the backend DTOs
        ├── utils/format.ts             # currency / date / tenure formatting
        ├── test/                       # Vitest setup + EmployeeListPage tests
        ├── App.tsx · main.tsx · index.css
```

---

## Quick start - Docker Compose (recommended)

**Prerequisites:** Docker Desktop (or Docker Engine) with the Compose v2 plugin (`docker compose version`).

```bash
git clone https://github.com/bhagyeshrathi07/employee-management-system.git
cd employee-management-system
docker compose up --build
```

The first build downloads base images and Maven/npm dependencies (typically 3-6 minutes). Compose
waits for each service's health check before starting the next one, so when the log shows
`ems-frontend` started everything is ready:

| Service | URL | Notes |
|---------|-----|-------|
| Frontend (React UI) | <http://localhost:3000> | Login with `admin` / `admin123` (or click **Fill Demo Credentials**) |
| Backend API | <http://localhost:8080/api/v1> | HTTP Basic auth |
| Swagger UI | <http://localhost:8080/swagger-ui.html> | Click **Authorize**, enter `admin` / `admin123` |
| Health | <http://localhost:8080/actuator/health> | `{"status":"UP"}` |
| PostgreSQL | `localhost:5433` | `postgres` / `postgres`, database `employeedb` (published on 5433 to avoid clashing with a local PostgreSQL) |

Useful commands:

```bash
docker compose up --build -d      # run in the background
docker compose logs -f backend    # follow backend logs
docker compose down               # stop (keeps the database volume)
docker compose down -v            # stop and wipe the database (seed data is re-created next start)
```

---

## Manual local setup

**Prerequisites:** Java 17+, Maven 3.9+, Node.js 20+ (npm 10+), PostgreSQL 16 (or any 13+).

### 1. Database

Create the database the backend expects by default (`jdbc:postgresql://localhost:5432/employeedb`,
user `postgres`, password `postgres`):

```bash
# Option A - existing local PostgreSQL
psql -U postgres -c "CREATE DATABASE employeedb;"

# Option B - throwaway PostgreSQL container
docker run --name ems-pg -e POSTGRES_DB=employeedb -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine
```

If your credentials differ, override them with environment variables (see [Configuration](#configuration)):

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/employeedb
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=postgres
```

### 2. Backend

```bash
cd backend
mvn spring-boot:run
```

The schema is created automatically (`spring.jpa.hibernate.ddl-auto=update`) and the seeder inserts
25 employees on first start. The API is now on <http://localhost:8080> and Swagger UI on
<http://localhost:8080/swagger-ui.html>.

To build a runnable jar instead:

```bash
mvn clean package            # runs the unit tests, produces target/employee-management-system.jar
java -jar target/employee-management-system.jar
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> and sign in with `admin` / `admin123`. The Vite dev server proxies
`/api` to `http://localhost:8080`, so no extra configuration is needed. To point the UI at a
different backend set `VITE_API_BASE_URL` (e.g. `VITE_API_BASE_URL=http://localhost:8080/api/v1 npm run dev`).

Production build: `npm run build` (output in `frontend/dist`, preview with `npm run preview`).

---

## Default credentials

| Purpose | Username | Password |
|---------|----------|----------|
| Application login / API Basic Auth | `admin` | `admin123` |
| PostgreSQL (Docker Compose) | `postgres` | `postgres` |

Change the application credentials with `APP_SECURITY_USERNAME` / `APP_SECURITY_PASSWORD`.

---

## API reference

Base path: `/api/v1`. All endpoints require HTTP Basic auth except `OPTIONS` pre-flight,
Swagger/OpenAPI and `/actuator/health`.

| Method | Endpoint | Description | Success |
|--------|----------|-------------|---------|
| `GET` | `/employees?search=&department=&status=&page=0&size=10&sortBy=id&sortDir=asc` | Paginated list; filters compose in one query | `200` `PagedResponse<EmployeeResponseDTO>` |
| `GET` | `/employees/{id}` | Employee by database id | `200` `EmployeeResponseDTO` / `404` |
| `POST` | `/employees` | Create (blank `employeeId` → auto `EMP-XXXX`) | `201` + `Location` header / `400` / `409` |
| `PUT` | `/employees/{id}` | Full update; uniqueness checked against other records | `200` / `400` / `404` / `409` |
| `DELETE` | `/employees/{id}` | Delete | `204` / `404` |
| `GET` | `/employees/export/csv?search=&department=&status=` | RFC 4180 CSV attachment `employees.csv` | `200` `text/csv` |
| `GET` | `/departments` | All departments with `totalEmployees` / `activeEmployees` | `200` `List<DepartmentSummaryDTO>` |
| `GET` | `/auth/me` | Authenticated principal (`{ username, authenticated, roles }`) | `200` / `401` |

**Query parameter values**

- `department`: `ENGINEERING`, `PRODUCT`, `DESIGN`, `MARKETING`, `SALES`, `HR`, `FINANCE`, `OPERATIONS`
- `status`: `ACTIVE`, `INACTIVE`
- `sortBy`: `id`, `employeeId`, `fullName`, `email`, `department`, `designation`, `dateOfJoining`,
  `salary`, `status`, `createdAt`, `updatedAt` (unknown values fall back to `id`)
- `size`: 1-100 (clamped)

**Employee payload (`EmployeeRequestDTO`)**

```json
{
  "employeeId": "EMP-2001",
  "fullName": "Nina Kapoor",
  "email": "nina.kapoor@kloudspot.com",
  "phoneNumber": "+91 90000 22222",
  "department": "DESIGN",
  "designation": "Product Designer",
  "dateOfJoining": "2023-09-18",
  "salary": 1150000.00,
  "status": "ACTIVE"
}
```

| Field | Rules |
|-------|-------|
| `employeeId` | optional; 3-20 chars `[A-Za-z0-9-]`; unique; auto-generated when blank |
| `fullName` | required, 2-100 chars |
| `email` | required, valid email, unique (case-insensitive) |
| `phoneNumber` | required, matches `^\+?[0-9\-\s()]{7,20}$` |
| `department` | required enum |
| `designation` | required, 2-100 chars |
| `dateOfJoining` | required, ISO `YYYY-MM-DD` |
| `salary` | required, `> 0`, max 10 integer digits and 2 decimals |
| `status` | required enum |

**Error envelope** (all 4xx/5xx responses)

```json
{
  "timestamp": "2024-06-03T10:15:30.123",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed for one or more fields",
  "path": "/api/v1/employees",
  "validationErrors": {
    "email": "Email must be a valid email address",
    "salary": "Salary must be greater than zero"
  }
}
```

| Status | When |
|--------|------|
| `400` | Bean validation failure (`validationErrors` populated), malformed JSON, invalid enum value |
| `401` | Missing or wrong credentials (JSON body, **no** `WWW-Authenticate` header) |
| `404` | Unknown employee id or route |
| `409` | Duplicate `email` or `employeeId` |
| `500` | Unexpected server error |

---

## Swagger UI and Postman

- **Swagger UI:** <http://localhost:8080/swagger-ui.html> - press **Authorize**, enter
  `admin` / `admin123`, then try any endpoint. The raw spec is at `/v3/api-docs`.
- **Postman:** import `postman_collection.json` (Postman v2.1). Basic Auth is configured at
  collection level and `baseUrl` defaults to `http://localhost:8080`. The collection covers every
  endpoint plus the 400/401/404/409 error cases, with assertions on each request. Run
  *Employees → Create employee* first; it stores the new id for the update/delete requests.

---

## Sample cURL commands

```bash
BASE=http://localhost:8080/api/v1
AUTH="-u admin:admin123"

# Who am I?
curl -s $AUTH $BASE/auth/me

# First page, 10 per page, sorted by salary descending
curl -s $AUTH "$BASE/employees?page=0&size=10&sortBy=salary&sortDir=desc"

# Search + department + status filter
curl -s $AUTH "$BASE/employees?search=aarav&department=ENGINEERING&status=ACTIVE"

# Get by id
curl -s $AUTH $BASE/employees/1

# Create (employeeId auto-generated)
curl -s -i $AUTH -H "Content-Type: application/json" -X POST $BASE/employees -d '{
  "fullName": "Postman Tester",
  "email": "postman.tester@kloudspot.com",
  "phoneNumber": "+91 90000 11111",
  "department": "PRODUCT",
  "designation": "QA Analyst",
  "dateOfJoining": "2024-06-03",
  "salary": 950000.00,
  "status": "ACTIVE"
}'

# Update (replace 26 with the id returned above)
curl -s $AUTH -H "Content-Type: application/json" -X PUT $BASE/employees/26 -d '{
  "fullName": "Postman Tester",
  "email": "postman.tester@kloudspot.com",
  "phoneNumber": "+91 90000 11111",
  "department": "PRODUCT",
  "designation": "Senior QA Analyst",
  "dateOfJoining": "2024-06-03",
  "salary": 1050000.00,
  "status": "INACTIVE"
}'

# Delete
curl -s -i $AUTH -X DELETE $BASE/employees/26

# Department headcounts
curl -s $AUTH $BASE/departments

# CSV export honouring filters (saved as employees.csv)
curl -s $AUTH -o employees.csv "$BASE/employees/export/csv?department=FINANCE&status=ACTIVE"

# Error cases
curl -s $AUTH $BASE/employees/999999                     # 404
curl -s $BASE/employees                                  # 401 (no credentials)
curl -s $AUTH "$BASE/employees?department=SPACE"         # 400 (invalid enum)
```

---

## Running the tests

### Backend - JUnit 5 + Mockito (no database required)

```bash
cd backend
mvn test
```

`EmployeeServiceTest` contains 24 tests across create (explicit and auto-generated `employeeId`,
duplicate email / employeeId), get-by-id and not-found, update (field changes, blank code kept,
conflicts, not-found), delete, paginated specification search and filter composition, department
summary counts and RFC 4180 CSV export (quoting, CRLF, header-only, writer failure).

### Frontend - Vitest + React Testing Library

```bash
cd frontend
npm install        # first time only
npm test           # single run (CI mode)
npm run test:watch # watch mode
```

`EmployeeListPage.test.tsx` contains 9 tests: table rendering and pagination summary, department
KPI cards, debounced search (name and email), status filter and *Clear Filters*, combined
department + status filters, empty state, CSV export with active filters, delete confirmation flow,
and the error/retry state. The API layer is mocked, so no backend is needed.

Type-check the frontend with `npm run typecheck`.

---

## Configuration

All settings have working defaults; override with environment variables.

### Backend (`application.yml`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SERVER_PORT` | `8080` | HTTP port |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/employeedb` | JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `postgres` | DB user |
| `SPRING_DATASOURCE_PASSWORD` | `postgres` | DB password |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | Schema management |
| `APP_SECURITY_USERNAME` | `admin` | Basic Auth user |
| `APP_SECURITY_PASSWORD` | `admin123` | Basic Auth password |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000,http://localhost:[*],http://127.0.0.1:[*],http://localhost,http://127.0.0.1` | Allowed origin patterns |
| `APP_SEED_ENABLED` | `true` | Insert 25 sample employees when the table is empty |
| `LOG_LEVEL_SQL` | `WARN` | Set to `DEBUG` to log SQL |

### Frontend

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `/api/v1` (relative, proxied) | Absolute API base when not using the Vite/nginx proxy |

### Docker Compose (`.env` or shell)

| Variable | Default | Purpose |
|----------|---------|---------|
| `FRONTEND_HOST_PORT` | `3000` | Host port for the UI |
| `BACKEND_HOST_PORT` | `8080` | Host port for the API |
| `POSTGRES_HOST_PORT` | `5433` | Host port for PostgreSQL |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `employeedb` / `postgres` / `postgres` | Database settings |
| `APP_SECURITY_USERNAME` / `APP_SECURITY_PASSWORD` | `admin` / `admin123` | Application login |
| `APP_SEED_ENABLED` | `true` | Seed sample data |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `port is already allocated` on 3000 / 8080 / 5433 | `FRONTEND_HOST_PORT=3001 BACKEND_HOST_PORT=8081 POSTGRES_HOST_PORT=5434 docker compose up --build` |
| Backend exits with `Connection refused` to PostgreSQL (manual setup) | Ensure PostgreSQL is running on 5432 and `employeedb` exists, or set `SPRING_DATASOURCE_*` |
| Browser shows "Unable to reach the server" | Backend is not running on 8080, or the Vite dev server was started from a different folder (`npm run dev` must run in `frontend/`) |
| Seed data missing | The seeder only runs on an **empty** table. `docker compose down -v` resets the volume |
| Login fails with correct password | `APP_SECURITY_*` overrides differ between the shell and compose; check `docker compose config` |
| Hibernate warns `constraint ... does not exist, skipping` at start-up | Expected with `ddl-auto=update` for named unique constraints; harmless |

---

## Design notes

- **Single-query filtering.** `EmployeeSpecification.withFilters()` builds `search OR` and the
  `department` / `status` predicates into one `AND`; LIKE wildcards in user input are escaped so
  `%` and `_` match literally. Sorting is whitelisted and page size clamped to 100.
- **Stateless security.** No sessions or CSRF tokens; every request carries the Basic header. The
  custom entry point returns a JSON `401` without `WWW-Authenticate`, which is what keeps the
  browser's native credentials dialog from appearing over the React login screen. Passwords are
  BCrypt-hashed in the in-memory user store.
- **CORS.** Origin *patterns* (`http://localhost:[*]`, `http://127.0.0.1:[*]`) are used instead of a
  fixed list so the UI works whether the reviewer opens `localhost` or `127.0.0.1`. In Docker, nginx
  also strips the `Origin` header for proxied `/api` calls because UI and API share one origin.
- **Auto-generated codes.** `EMP-` + (1000 + row count + 1), skipping any code already in use, so
  the seeded `EMP-1001..EMP-1025` is followed by `EMP-1026`. A database unique constraint backs the
  service-level check; a race would surface as a clean `409`.
- **CSV export.** Written straight to the servlet response writer with CRLF line endings and
  RFC 4180 quoting (fields containing `,`, `"` or line breaks are quoted; quotes are doubled).
- **Frontend state.** List filters, sort and pagination live in the URL (`useSearchParams`), so
  the back button, refresh and shareable links all preserve the view. Search is debounced (300 ms).
  The session token lives in `sessionStorage`; any `401` from the API clears it and redirects to
  the login page with an explanatory notice.
- **Zero-config review.** Defaults are chosen so `docker compose up --build` *or* the manual
  commands above work without editing a single file: relative API base URL behind a proxy,
  environment-variable overrides for everything else, seeded data, and pinned dependency versions
  (`package-lock.json`, Spring Boot BOM).
