package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.LoginRequest;
import com.knowledgehub.dto.request.RegisterRequest;
import com.knowledgehub.dto.request.SendOtpRequest;
import com.knowledgehub.dto.request.VerifyOtpRequest;
import com.knowledgehub.dto.response.AuthResponse;
import com.knowledgehub.dto.response.UserResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.entity.UserRole;
import com.knowledgehub.repository.UserRepository;
import com.knowledgehub.service.interfaces.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    // Cache tạm: email -> OtpData (OTP + thời hạn hết hạn 5 phút)
    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();

    // Cache đánh dấu email đã verify thành công: email -> thời hạn hết hạn (15 phút để hoàn tất đăng ký)
    private final Map<String, Instant> verifiedEmails = new ConcurrentHashMap<>();

    private record OtpData(String otp, Instant expiresAt) {}

    @Override
    public void sendOtp(SendOtpRequest request) {
        String email = request.email().trim().toLowerCase();

        // 1. Kiểm tra xem email đã có tài khoản chưa
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email has already been registered");
        }

        // 2. Sinh mã OTP 6 chữ số ngẫu nhiên
        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        Instant expiresAt = Instant.now().plusSeconds(5 * 60); // Hết hạn sau 5 phút

        otpStorage.put(email, new OtpData(otp, expiresAt));

        // 3. Gửi email chứa OTP
        sendEmail(email, otp);
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
        user.setRole(request.role() != null ? request.role() : UserRole.USER);
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

        // Tạm thời trả về mock token nếu bạn chưa cấu hình JWT Filter
        String dummyToken = "mock-jwt-token-" + user.getId();
        return AuthResponse.of(dummyToken, UserResponse.fromEntity(user));
    }

    private void sendEmail(String to, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("Your Verification Code - RAG Chatbot");
            message.setText("Hello,\n\nYour OTP verification code is: " + otp +
                    "\n\nThis code will expire in 5 minutes. Please do not share it with anyone.");
            mailSender.send(message);
            log.info("OTP sent to email: {}", to);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", to, e.getMessage());
            // In thẳng ra console để bạn vẫn test được ngay cả khi chưa config SMTP email
            log.info(">>> [DEV MODE BACKUP] OTP for {} is: {}", to, otp);
        }
    }
}