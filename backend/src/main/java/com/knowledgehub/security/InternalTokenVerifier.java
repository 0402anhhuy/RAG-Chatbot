package com.knowledgehub.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Xác thực service-to-service cho các endpoint nội bộ mà rag-service gọi.
 * Không dùng JWT người dùng và không log token.
 */
@Component
public class InternalTokenVerifier {

    private final byte[] expected;

    public InternalTokenVerifier(
            @Value("${rag.internal-token:local-development-rag-internal-token-32}") String token) {
        this.expected = token.getBytes(StandardCharsets.UTF_8);
    }

    public void requireValid(String provided) {
        if (provided == null || provided.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Internal token is required");
        }
        byte[] actual = provided.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, actual)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal token");
        }
    }
}
