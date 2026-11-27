package com.knowledgehub.controller;

import com.knowledgehub.dto.request.LoginRequest;
import com.knowledgehub.dto.request.RefreshTokenRequest;
import com.knowledgehub.dto.request.RegisterRequest;
import com.knowledgehub.dto.request.SendOtpRequest;
import com.knowledgehub.dto.request.VerifyOtpRequest;
import com.knowledgehub.dto.response.ApiResponse;
import com.knowledgehub.dto.response.AuthMeResponse;
import com.knowledgehub.dto.response.AuthResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.service.interfaces.AuthService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@AllArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<Void>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        authService.sendOtp(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("OTP code has been sent successfully")
                .build());
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Void>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        authService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("OTP verification successful")
                .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Account registered successfully")
                .data(response)
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.<AuthResponse>builder()
                .success(true)
                .message("Login successful")
                .data(response)
                .build());
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.<AuthResponse>builder()
                .success(true)
                .message("Token refreshed successfully")
                .data(response)
                .build());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthMeResponse>> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.<AuthMeResponse>builder()
                .success(true)
                .data(authService.me(user.getId()))
                .build());
    }
}