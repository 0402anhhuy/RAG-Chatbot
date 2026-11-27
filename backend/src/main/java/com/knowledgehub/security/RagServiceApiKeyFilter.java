package com.knowledgehub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Xác thực service-to-service cho các endpoint /api/rag/** do rag-service gọi.
 * Dùng X-API-Key, không dùng JWT người dùng.
 */
@Component
public class RagServiceApiKeyFilter extends OncePerRequestFilter {
    private static final String HEADER = "X-API-Key";
    private static final List<String> INTERNAL_PREFIXES = List.of(
            "/api/rag/documents",
            "/api/rag/chunks",
            "/api/rag/document-context",
            "/api/rag/ingest/");

    private final byte[] expected;

    public RagServiceApiKeyFilter(@Value("${rag.service.api-key:}") String apiKey) {
        this.expected = apiKey == null ? new byte[0] : apiKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        if (path == null) {
            return true;
        }
        return INTERNAL_PREFIXES.stream().noneMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (expected.length == 0) {
            filterChain.doFilter(request, response);
            return;
        }

        String provided = request.getHeader(HEADER);
        if (provided == null || !MessageDigest.isEqual(expected, provided.getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"Unauthorized\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
