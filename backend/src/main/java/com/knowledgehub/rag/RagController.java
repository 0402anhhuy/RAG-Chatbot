package com.knowledgehub.rag;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.knowledgehub.entity.User;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/rag")
public class RagController {
    private final RagServiceClient ragClient;
    private final RagWorkspaceAccess workspaceAccess;

    public RagController(RagServiceClient ragClient, RagWorkspaceAccess workspaceAccess) {
        this.ragClient = ragClient;
        this.workspaceAccess = workspaceAccess;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return ragClient.health();
    }

    @PostMapping("/sessions")
    public Map<String, Object> createSession() {
        return Map.of("id", UUID.randomUUID().toString(), "messages", List.of());
    }

    @PostMapping("/messages")
    public Map<String, Object> sendMessage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody RagMessageRequest request) {
        UUID workspaceId = request.workspaceId();
        List<UUID> documentIds = request.documentId() == null
                ? List.of()
                : List.of(request.documentId());
        workspaceAccess.requireReadAccess(user.getId(), workspaceId, documentIds);
        List<Map<String, String>> history = request.history() == null ? List.of() : request.history();
        return ragClient.sendMessage(
                request.sessionId(),
                request.content(),
                workspaceId.toString(),
                documentIds.isEmpty() ? null : documentIds.stream().map(UUID::toString).toList(),
                history);
    }

    @PostMapping("/study/flashcards")
    public Map<String, Object> createFlashcards(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody StudyGenerationRequest request) {
        requireStudyAccess(user, request);
        return ragClient.generateFlashcards(
                request.workspaceId().toString(), request.documentIds().stream().map(UUID::toString).toList(),
                request.maxItems() == null ? 20 : request.maxItems());
    }

    @PostMapping("/study/exams")
    public Map<String, Object> createExam(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody StudyGenerationRequest request) {
        requireStudyAccess(user, request);
        return ragClient.generateExam(
                request.workspaceId().toString(), request.documentIds().stream().map(UUID::toString).toList(),
                request.maxItems() == null ? 20 : request.maxItems());
    }

    private void requireStudyAccess(User user, StudyGenerationRequest request) {
        workspaceAccess.requireReadAccess(
                user.getId(),
                request.workspaceId(),
                request.documentIds());
    }

    public record RagMessageRequest(
            @NotBlank String sessionId,
            @NotBlank @Size(max = 20000) String content,
            UUID documentId,
            @NotNull UUID workspaceId,
            List<Map<String, String>> history) {}

    public record StudyGenerationRequest(
            @NotNull UUID workspaceId,
            @NotEmpty @Size(max = 100) List<@NotNull UUID> documentIds,
            @Min(1) @Max(50) Integer maxItems) {}
}
