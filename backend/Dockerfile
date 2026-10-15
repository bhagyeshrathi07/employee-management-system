# =================================================================================================
# Stage 1: build the Spring Boot fat jar with Maven
# =================================================================================================
FROM maven:3.9.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Resolve dependencies first so this layer is cached until pom.xml changes.
COPY pom.xml ./
RUN mvn -B -q -e dependency:go-offline

# Compile and package (unit tests run via `mvn test` locally / in CI; skipped here for image speed).
COPY src ./src
RUN mvn -B -q -e clean package -DskipTests

# =================================================================================================
# Stage 2: minimal JRE runtime
# =================================================================================================
FROM eclipse-temurin:17-jre-alpine

# curl is used by the container HEALTHCHECK and the docker-compose healthcheck.
RUN apk add --no-cache curl \
    && addgroup -S ems \
    && adduser -S ems -G ems

WORKDIR /app
COPY --from=build /app/target/employee-management-system.jar app.jar

USER ems

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom" \
    SERVER_PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=12 \
    CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
