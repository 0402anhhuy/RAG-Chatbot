package com.knowledgehub.controller;

import com.knowledgehub.dto.response.ResolvedProviderResponse;
import com.knowledgehub.security.InternalTokenVerifier;
import com.knowledgehub.service.interfaces.ProviderCredentialResolver;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint nội bộ cho rag-service lấy provider config đã giải mã.
 * Xác thực bằng service token, không dùng JWT người dùng.
 */
@RestController
@RequestMapping("/api/internal/rag")
public class InternalProviderController {

    private final ProviderCredentialResolver resolver;
    private final InternalTokenVerifier tokenVerifier;

    public InternalProviderController(
            ProviderCredentialResolver resolver,
            InternalTokenVerifier tokenVerifier) {
        this.resolver = resolver;
        this.tokenVerifier = tokenVerifier;
    }

    @GetMapping("/providers/resolve")
    public ResponseEntity<ResolvedProviderResponse> resolve(
            @RequestHeader(value = "X-Internal-Token", required = false) String internalToken,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(defaultValue = "chat") String purpose) {
        tokenVerifier.requireValid(internalToken);
        return ResponseEntity.ok(resolver.resolve(projectId, userId, purpose));
    }
}
