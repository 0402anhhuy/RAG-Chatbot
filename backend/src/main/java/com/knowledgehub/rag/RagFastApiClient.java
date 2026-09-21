package com.knowledgehub.rag;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class RagFastApiClient {
    private final RestClient client;

    public RagFastApiClient(@Value("${rag.fastapi.base-url}") String baseUrl) {
        this.client = RestClient.builder().baseUrl(baseUrl).build();
    }

    public Map<?, ?> health() {
        return client.get().uri("/api/health").retrieve().body(Map.class);
    }

    public Map<?, ?> createSession() {
        return client.post().uri("/api/chat/sessions").retrieve().body(Map.class);
    }

    public Map<?, ?> sendMessage(String sessionId, String content, String documentId) {
        return client.post()
                .uri("/api/chat/sessions/{sessionId}/messages", sessionId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("content", content, "document_id", documentId))
                .retrieve()
                .body(Map.class);
    }
}
