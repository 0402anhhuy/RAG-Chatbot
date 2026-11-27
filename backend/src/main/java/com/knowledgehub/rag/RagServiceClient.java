package com.knowledgehub.rag;

import java.time.Duration;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RagServiceClient {
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestClient client;
    private final int maxRetries;

    public RagServiceClient(
            @Value("${rag.service.base-url:http://localhost:8000}") String baseUrl,
            @Value("${rag.service.api-key:}") String apiKey,
            @Value("${rag.service.connect-timeout:PT2S}") Duration connectTimeout,
            @Value("${rag.service.read-timeout:PT5M}") Duration readTimeout,
            @Value("${rag.service.max-retries:2}") int maxRetries) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) connectTimeout.toMillis());
        requestFactory.setReadTimeout((int) readTimeout.toMillis());
        this.client = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader("X-API-Key", apiKey)
                .build();
        this.maxRetries = Math.max(0, Math.min(maxRetries, 3));
    }

    public Map<String, Object> health() {
        return execute(() -> requireBody(client.get()
                .uri("/api/v1/health/readiness")
                .retrieve()
                .body(MAP_TYPE)));
    }

    public Map<String, Object> sendMessage(
            String sessionId,
            String content,
            String workspaceId,
            List<String> documentIds,
            List<Map<String, String>> history) {
        return sendMessage(sessionId, content, workspaceId, documentIds, history, RagCallContext.none());
    }

    public Map<String, Object> sendMessage(
            String sessionId,
            String content,
            String workspaceId,
            List<String> documentIds,
            List<Map<String, String>> history,
            RagCallContext context) {
        Map<String, Object> body = new HashMap<>();
        body.put("query", content);
        body.put("workspaceId", workspaceId);
        body.put("conversation_id", sessionId);
        body.put("chat_history", history);
        if (context != null && context.projectId() != null) {
            body.put("projectId", context.projectId());
        }
        if (context != null && context.hasUser()) {
            body.put("userId", context.userId());
        }
        if (documentIds != null && !documentIds.isEmpty()) {
            body.put("documentIds", documentIds);
        }
        final String json;
        try {
            json = new ObjectMapper().writeValueAsString(body);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to encode RAG request", exception);
        }
        return execute(() -> requireBody(client.post()
                .uri("/api/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(principalHeaders(context))
                .body(json)
                .retrieve()
                .body(MAP_TYPE)));
    }

    public int indexDocument(
            byte[] content,
            String filename,
            String workspaceId,
            String documentId,
            String courseCode) {
        return indexDocument(content, filename, workspaceId, documentId, courseCode, RagCallContext.none());
    }

    public int indexDocument(
            byte[] content,
            String filename,
            String workspaceId,
            String documentId,
            String courseCode,
            RagCallContext context) {
        ByteArrayResource file = new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("file", file)
                .filename(filename)
                .contentType(MediaType.APPLICATION_OCTET_STREAM);
        parts.part("workspaceId", workspaceId);
        parts.part("documentId", documentId);
        parts.part("courseCode", courseCode);
        parts.part("waitUntilReady", "true");
        Map<String, Object> response = execute(() -> requireBody(client.post()
                .uri("/api/v1/documents/upload")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .headers(principalHeaders(context))
                .body(parts.build())
                .retrieve()
                .body(MAP_TYPE)));
        Object rawData = response.get("data");
        if (!(rawData instanceof Map<?, ?> data) || !"ready".equals(data.get("document_status"))) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "RAG service did not finish document indexing");
        }
        Object chunkCount = data.get("chunk_count");
        if (!(chunkCount instanceof Number count)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "RAG service returned no indexed chunk count");
        }
        return count.intValue();
    }

    public void deleteDocument(String documentId) {
        deleteDocument(documentId, RagCallContext.none());
    }

    public void deleteDocument(String documentId, RagCallContext context) {
        execute(() -> {
            client.delete()
                    .uri("/api/v1/documents/{documentId}", documentId)
                    .headers(principalHeaders(context))
                    .retrieve()
                    .toBodilessEntity();
            return Boolean.TRUE;
        });
    }

    public Map<String, Object> generateFlashcards(String workspaceId, List<String> documentIds, int maxItems) {
        return generateStudyItems("/api/v1/study/flashcards", workspaceId, documentIds, maxItems,
                RagCallContext.none());
    }

    public Map<String, Object> generateFlashcards(
            String workspaceId, List<String> documentIds, int maxItems, RagCallContext context) {
        return generateStudyItems("/api/v1/study/flashcards", workspaceId, documentIds, maxItems, context);
    }

    public Map<String, Object> generateExam(String workspaceId, List<String> documentIds, int maxItems) {
        return generateStudyItems("/api/v1/study/exams", workspaceId, documentIds, maxItems,
                RagCallContext.none());
    }

    public Map<String, Object> generateExam(
            String workspaceId, List<String> documentIds, int maxItems, RagCallContext context) {
        return generateStudyItems("/api/v1/study/exams", workspaceId, documentIds, maxItems, context);
    }

    private Map<String, Object> generateStudyItems(
            String path,
            String workspaceId,
            List<String> documentIds,
            int maxItems,
            RagCallContext context) {
        Map<String, Object> body = new HashMap<>();
        body.put("workspaceId", workspaceId);
        body.put("documentIds", documentIds);
        body.put("maxItems", maxItems);
        if (context != null && context.projectId() != null) {
            body.put("projectId", context.projectId());
        }
        if (context != null && context.hasUser()) {
            body.put("userId", context.userId());
        }
        return execute(() -> requireBody(client.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .headers(principalHeaders(context))
                .body(body)
                .retrieve()
                .body(MAP_TYPE)));
    }

    /**
     * Header principal do Spring tự xác thực; RAG chỉ kiểm tra lại hình dạng và
     * allowlist workspace.
     */
    private static Consumer<HttpHeaders> principalHeaders(RagCallContext context) {
        return headers -> {
            if (context == null) {
                return;
            }
            if (context.hasUser()) {
                headers.set("X-User-Id", context.userId());
            }
            if (context.workspaceIds() != null && !context.workspaceIds().isEmpty()) {
                headers.set("X-User-Workspaces", String.join(",", context.workspaceIds()));
            }
        };
    }

    private <T> T execute(Supplier<T> request) {
        for (int attempt = 0; ; attempt++) {
            try {
                return request.get();
            } catch (RestClientResponseException exception) {
                int status = exception.getStatusCode().value();
                if (attempt < maxRetries && (status == 429 || status >= 500)) {
                    pause(attempt);
                    continue;
                }
                throw mapFailure(status, exception);
            } catch (ResourceAccessException exception) {
                if (attempt < maxRetries) {
                    pause(attempt);
                    continue;
                }
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY, "RAG service is unavailable", exception);
            }
        }
    }

    private static Map<String, Object> requireBody(Map<String, Object> body) {
        if (body == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "RAG service returned an empty response");
        }
        return body;
    }

    private static ResponseStatusException mapFailure(int status, Exception cause) {
        if (status == 404) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, "RAG resource was not found", cause);
        }
        if (status == 422) {
            return new ResponseStatusException(HttpStatus.BAD_REQUEST, "RAG request was rejected", cause);
        }
        if (status == 401 || status == 403 || status == 429 || status >= 500) {
            return new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "RAG service request failed", cause);
        }
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "RAG service request failed", cause);
    }

    private static void pause(int attempt) {
        try {
            Thread.sleep(Math.min(1000L, 100L << attempt));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "RAG request was interrupted", exception);
        }
    }
}
