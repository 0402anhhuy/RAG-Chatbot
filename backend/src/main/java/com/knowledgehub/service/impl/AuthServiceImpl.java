package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.LoginRequest;
import com.knowledgehub.dto.request.RefreshTokenRequest;
import com.knowledgehub.dto.request.RegisterRequest;
import com.knowledgehub.dto.request.SendOtpRequest;
import com.knowledgehub.dto.request.VerifyOtpRequest;
import com.knowledgehub.dto.response.AuthMeResponse;
import com.knowledgehub.dto.response.AuthResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.UserRole;
import com.knowledgehub.repository.TaskRepository;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.security.JwtTokenService;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.AuthService;
import com.knowledgehub.service.interfaces.UserSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final JavaMailSender mailSender;
    private final UserSettingsService userSettingsService;
    private final TaskRepository taskRepository;

    // Cache tạm: email -> OtpData (OTP + thời hạn hết hạn 5 phút)
    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();
    private final Map<String, Instant> otpSentAt = new ConcurrentHashMap<>();

    // Cache đánh dấu email đã verify thành công: email -> thời hạn hết hạn (15 phút để hoàn tất đăng ký)
    private final Map<String, Instant> verifiedEmails = new ConcurrentHashMap<>();

    private record OtpData(String otp, Instant expiresAt, AtomicInteger attempts) {}

    @Override
    public void sendOtp(SendOtpRequest request) {
        String email = request.email().trim().toLowerCase();

        // 1. Kiểm tra xem email đã có tài khoản chưa
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email has already been registered");
        }
        Instant now = Instant.now();
        if (!reserveOtpSend(email, now)) {
            throw new IllegalStateException("Please wait before requesting another verification code");
        }

        // 2. Sinh mã OTP 6 chữ số ngẫu nhiên
        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        Instant expiresAt = now.plusSeconds(5 * 60); // Hết hạn sau 5 phút
        try {
            sendEmail(email, otp);
        } catch (MailException exception) {
            otpSentAt.remove(email, now);
            throw exception;
        }
        otpStorage.put(email, new OtpData(otp, expiresAt, new AtomicInteger()));
        otpSentAt.put(email, now);
    }

    @Override
    public void verifyOtp(VerifyOtpRequest request) {
        String email = request.email().trim().toLowerCase();
        String otp = request.otp().trim();

        OtpData otpData = otpStorage.get(email);

        if (otpData == null) {
            throw new IllegalArgumentException("No OTP requested for this email or it has expired");
        }

        if (Instant.now().isAfter(otpData.expiresAt())) {
            otpStorage.remove(email);
            throw new IllegalArgumentException("OTP code has expired. Please request a new one");
        }

        if (!otpData.otp().equals(otp)) {
            if (otpData.attempts().incrementAndGet() >= 5) {
                otpStorage.remove(email, otpData);
                throw new IllegalArgumentException("Too many invalid OTP attempts. Request a new code");
            }
            throw new IllegalArgumentException("Invalid OTP code");
        }

        // Xác thực thành công: Xóa mã OTP cũ và lưu cờ đã verify (hiệu lực 15 phút)
        otpStorage.remove(email);
        verifiedEmails.put(email, Instant.now().plusSeconds(15 * 60));
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();

        // 1. Kiểm tra email đã vượt qua bước verify OTP chưa
        Instant verifiedExpiry = verifiedEmails.get(email);
        if (verifiedExpiry == null || Instant.now().isAfter(verifiedExpiry)) {
            verifiedEmails.remove(email);
            throw new IllegalStateException("Email has not been verified or verification has expired");
        }

        // 2. Kiểm tra trùng email lần cuối
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        // 3. Tạo User Entity mới
        User user = new User();
        user.setName(request.name().trim());
        user.setPhone(request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.USER);
        user.setActive(true);

        User savedUser = userRepository.save(user);

        // Đăng ký xong dọn dẹp cờ verify
        verifiedEmails.remove(email);

        return UserResponse.fromEntity(savedUser);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!user.isActive()) {
            throw new IllegalStateException("Account is currently deactivated");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return AuthResponse.of(
                jwtTokenService.issue(user),
                jwtTokenService.issueRefresh(user),
                UserResponse.fromEntity(user));
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshTokenRequest request) {
        // 1. Kiểm tra chữ ký + hạn của refresh token
        UUID userId = jwtTokenService.verifyRefresh(request.refreshToken().trim());

        // 2. User phải còn tồn tại và còn active
        User user = userRepository.findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Session is no longer valid"));

        // 3. Cấp bộ token mới (xoay refresh token để phiên không bao giờ hết khi user đang dùng)
        return AuthResponse.of(
                jwtTokenService.issue(user),
                jwtTokenService.issueRefresh(user),
                UserResponse.fromEntity(user));
    }

    @Override
    @Transactional(readOnly = true)
    public AuthMeResponse me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + userId));
        return new AuthMeResponse(
                user.getId(),
                UserResponse.fromEntity(user),
                userSettingsService.getSettings(user.getId()),
                taskRepository.countByProjectOwnerIdAndArchivedFalse(user.getId()));
    }

    private void sendEmail(String to, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Your Verification Code - RAG Chatbot");
        message.setText("Hello,\n\nYour OTP verification code is: " + otp +
                "\n\nThis code will expire in 5 minutes. Please do not share it with anyone.");
        mailSender.send(message);
    }

    private boolean reserveOtpSend(String email, Instant now) {
        java.util.concurrent.atomic.AtomicBoolean reserved = new java.util.concurrent.atomic.AtomicBoolean();
        otpSentAt.compute(email, (key, lastSentAt) -> {
            if (lastSentAt == null || !now.isBefore(lastSentAt.plusSeconds(60))) {
                reserved.set(true);
                return now;
            }
            return lastSentAt;
        });
        return reserved.get();
    }
}