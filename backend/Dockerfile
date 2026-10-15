# =================================================================================================
# Stage 1: build the Spring Boot fat jar with Maven
#   Multi-arch (amd64 + arm64) Ubuntu-based Temurin image. The *-alpine variants of the Maven and
#   Temurin JRE images are published for amd64 only, which breaks `docker compose up --build` on
#   Apple Silicon / ARM hosts.
# =================================================================================================
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

# Resolve dependencies first so this layer is cached until pom.xml changes.
COPY pom.xml ./
RUN mvn -B -e dependency:go-offline

# Compile and package (unit tests run via `mvn test` locally / in CI; skipped here for image speed).
COPY src ./src
RUN mvn -B -e clean package -DskipTests

# =================================================================================================
# Stage 2: minimal JRE runtime (multi-arch)
# =================================================================================================
FROM eclipse-temurin:17-jre

# curl is used by the container HEALTHCHECK and the docker-compose healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system ems \
    && useradd --system --gid ems --no-create-home --shell /usr/sbin/nologin ems

WORKDIR /app
COPY --from=build /app/target/employee-management-system.jar app.jar

USER ems

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom" \
    SERVER_PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=12 \
    CMD curl -fsS http://127.0.0.1:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
