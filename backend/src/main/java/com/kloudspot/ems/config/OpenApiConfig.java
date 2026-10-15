package com.kloudspot.ems.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger / OpenAPI metadata. Registers the HTTP Basic security scheme so the
 * "Authorize" button in Swagger UI works with admin / admin123.
 */
@Configuration
public class OpenApiConfig {

    public static final String BASIC_AUTH_SCHEME = "basicAuth";

    @Bean
    public OpenAPI employeeManagementOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Employee Management System API")
                        .description("REST API for the Kloudspot Candidate Technical Assessment. "
                                + "All `/api/**` endpoints require HTTP Basic authentication "
                                + "(default credentials: admin / admin123).")
                        .version("1.0.0")
                        .contact(new Contact().name("Kloudspot EMS").email("support@kloudspot.example"))
                        .license(new License().name("MIT")))
                .components(new Components()
                        .addSecuritySchemes(BASIC_AUTH_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("basic")
                                .description("HTTP Basic authentication")))
                .addSecurityItem(new SecurityRequirement().addList(BASIC_AUTH_SCHEME));
    }
}
