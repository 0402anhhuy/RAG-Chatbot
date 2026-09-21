package com.knowledgehub.rag;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rag")
public class RagController {
    private final RagFastApiClient ragClient;

    public RagController(RagFastApiClient ragClient) {
        this.ragClient = ragClient;
    }

    @GetMapping("/health")
    public Map<?, ?> health() {
        return ragClient.health();
    }

    @PostMapping("/sessions")
    public Map<?, ?> createSession() {
        return ragClient.createSession();
    }

    @PostMapping("/messages")
    public Map<?, ?> sendMessage(@RequestBody RagMessageRequest request) {
        return ragClient.sendMessage(request.sessionId(), request.content(), request.documentId());
    }

    public record RagMessageRequest(String sessionId, String content, String documentId) {}
}
