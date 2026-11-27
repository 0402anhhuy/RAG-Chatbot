package com.knowledgehub.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledgehub.entity.User;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtTokenServiceTest {
    private static final String SECRET = "a-test-secret-with-at-least-32-bytes-long";

    @Test
    void verifiesIssuedTokenForItsUser() {
        JwtTokenService service = new JwtTokenService(SECRET, Duration.ofMinutes(10), new ObjectMapper());
        User user = new User();
        user.setId(UUID.randomUUID());

        assertEquals(user.getId(), service.verify(service.issue(user)));
    }

    @Test
    void rejectsTamperedToken() {
        JwtTokenService service = new JwtTokenService(SECRET, Duration.ofMinutes(10), new ObjectMapper());
        User user = new User();
        user.setId(UUID.randomUUID());
        String[] parts = service.issue(user).split("\\.");
        parts[2] = (parts[2].startsWith("A") ? "B" : "A") + parts[2].substring(1);

        assertThrows(IllegalArgumentException.class, () -> service.verify(String.join(".", parts)));
    }

    @Test
    void acceptsSevenDayLifetime() {
        JwtTokenService service = new JwtTokenService(SECRET, Duration.ofDays(7), new ObjectMapper());
        User user = new User();
        user.setId(UUID.randomUUID());

        assertEquals(user.getId(), service.verify(service.issue(user)));
    }

    @Test
    void rejectsLifetimeAboveThirtyDays() {
        assertThrows(
                IllegalStateException.class,
                () -> new JwtTokenService(SECRET, Duration.ofDays(31), new ObjectMapper()));
    }

    @Test
    void rejectsWeakSigningSecret() {
        assertThrows(
                IllegalStateException.class,
                () -> new JwtTokenService("too-short", Duration.ofMinutes(10), new ObjectMapper()));
    }
}
