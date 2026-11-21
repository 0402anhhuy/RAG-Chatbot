package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.LoginRequest;
import com.knowledgehub.dto.request.RegisterRequest;
import com.knowledgehub.dto.request.SendOtpRequest;
import com.knowledgehub.dto.request.VerifyOtpRequest;
import com.knowledgehub.dto.response.AuthMeResponse;
import com.knowledgehub.dto.response.AuthResponse;
import com.knowledgehub.dto.response.UserResponse;

import java.util.UUID;

public interface AuthService {
    void sendOtp(SendOtpRequest request);
    void verifyOtp(VerifyOtpRequest request);
    UserResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthMeResponse me(UUID userId);
}