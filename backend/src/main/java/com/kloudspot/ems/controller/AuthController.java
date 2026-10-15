package com.kloudspot.ems.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lightweight endpoint the frontend uses to validate Basic Auth credentials on login.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth", description = "Authentication helpers")
public class AuthController {

    @Operation(summary = "Current authenticated user",
            description = "Returns the authenticated principal. Used by the login screen to verify credentials.")
    @ApiResponse(responseCode = "200", description = "Authenticated user details")
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("username", authentication.getName());
        body.put("authenticated", authentication.isAuthenticated());
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        body.put("roles", roles);
        return ResponseEntity.ok(body);
    }
}
