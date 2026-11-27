package com.knowledgehub.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgehub.entity.User;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {
    private static final String JWT_HEADER = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final TypeReference<Map<String, Object>> JSON_OBJECT = new TypeReference<>() {};
    private static final String TOKEN_TYPE_ACCESS = "access";
    private static final String TOKEN_TYPE_REFRESH = "refresh";

    private final byte[] secret;
    private final Duration lifetime;
    private final Duration refreshLifetime;
    private final ObjectMapper objectMapper;

    public JwtTokenService(
            @Value("${JWT_SECRET:}") String secret,
            @Value("${JWT_TTL:PT168H}") Duration lifetime,
            @Value("${JWT_REFRESH_TTL:P30D}") Duration refreshLifetime,
            ObjectMapper objectMapper) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        if (this.secret.length < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
        }
        if (lifetime.isZero() || lifetime.isNegative()) {
            throw new IllegalStateException("JWT_TTL must be a positive duration");
        }
        if (lifetime.compareTo(Duration.ofDays(30)) > 0) {
            throw new IllegalStateException("JWT_TTL must not exceed 30 days");
        }
        if (refreshLifetime.isZero() || refreshLifetime.isNegative()) {
            throw new IllegalStateException("JWT_REFRESH_TTL must be a positive duration");
        }
        if (refreshLifetime.compareTo(Duration.ofDays(365)) > 0) {
            throw new IllegalStateException("JWT_REFRESH_TTL must not exceed 365 days");
        }
        this.lifetime = lifetime;
        this.refreshLifetime = refreshLifetime;
        this.objectMapper = objectMapper;
    }

    public String issue(User user) {
        return issue(user, lifetime, TOKEN_TYPE_ACCESS);
    }

    /** Sinh refresh token (sống lâu hơn access token) để client tự gia hạn phiên. */
    public String issueRefresh(User user) {
        return issue(user, refreshLifetime, TOKEN_TYPE_REFRESH);
    }

    private String issue(User user, Duration ttl, String type) {
        Instant issuedAt = Instant.now();
        Map<String, Object> claims = Map.of(
                "sub", user.getId().toString(),
                "iat", issuedAt.getEpochSecond(),
                "exp", issuedAt.plus(ttl).getEpochSecond(),
                "type", type);
        String payload = encodeJson(claims);
        String unsignedToken = JWT_HEADER + "." + payload;
        return unsignedToken + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(sign(unsignedToken));
    }

    public UUID verify(String token) {
        return verify(token, TOKEN_TYPE_ACCESS);
    }

    /** Xác thực refresh token (từ chối access token dùng sai mục đích). */
    public UUID verifyRefresh(String token) {
        return verify(token, TOKEN_TYPE_REFRESH);
    }

    private UUID verify(String token, String expectedType) {
        if (token == null || token.length() > 8192) {
            throw new IllegalArgumentException("Invalid bearer token");
        }
        String[] parts = token.split("\\.", -1);
        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid bearer token");
        }

        String unsignedToken = parts[0] + "." + parts[1];
        byte[] suppliedSignature;
        try {
            suppliedSignature = Base64.getUrlDecoder().decode(parts[2]);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid bearer token", exception);
        }
        if (!MessageDigest.isEqual(sign(unsignedToken), suppliedSignature)) {
            throw new IllegalArgumentException("Invalid bearer token");
        }

        Map<String, Object> header = decodeJson(parts[0]);
        if (!"HS256".equals(header.get("alg")) || !"JWT".equals(header.get("typ"))) {
            throw new IllegalArgumentException("Unsupported bearer token");
        }
        Map<String, Object> claims = decodeJson(parts[1]);
        Object subject = claims.get("sub");
        Object expiry = claims.get("exp");
        if (!(subject instanceof String userId) || !(expiry instanceof Number expiration)) {
            throw new IllegalArgumentException("Invalid bearer token claims");
        }
        // Access token cũ (phát hành trước khi có refresh) không có claim "type" -> coi như access.
        Object type = claims.get("type");
        if (type != null && !expectedType.equals(type)) {
            throw new IllegalArgumentException("Invalid bearer token type");
        }
        if (Instant.now().getEpochSecond() >= expiration.longValue()) {
            throw new IllegalArgumentException("Bearer token has expired");
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid bearer token subject", exception);
        }
    }

    private byte[] sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            return mac.doFinal(value.getBytes(StandardCharsets.US_ASCII));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Unable to sign access token", exception);
        }
    }

    private String encodeJson(Object value) {
        try {
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to encode access token", exception);
        }
    }

    private Map<String, Object> decodeJson(String value) {
        try {
            byte[] json = Base64.getUrlDecoder().decode(value);
            return objectMapper.readValue(json, JSON_OBJECT);
        } catch (IllegalArgumentException | IOException exception) {
            throw new IllegalArgumentException("Invalid bearer token", exception);
        }
    }
}
