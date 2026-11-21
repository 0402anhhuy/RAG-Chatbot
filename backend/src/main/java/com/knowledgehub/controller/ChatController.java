package com.knowledgehub.controller;

import com.knowledgehub.dto.request.ChatMessageRequest;
import com.knowledgehub.dto.request.ChatSessionCreateRequest;
import com.knowledgehub.dto.request.ChatSessionTokenUsageRequest;
import com.knowledgehub.dto.request.ChatSessionUpdateRequest;
import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.ChatSessionPageResponse;
import com.knowledgehub.dto.response.ChatSessionResponse;
import com.knowledgehub.entity.User;
import com.knowledgehub.service.interfaces.ChatService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/sessions")
    public ResponseEntity<ChatSessionResponse> createSession(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ChatSessionCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.createSession(user.getId(), request));
    }

    @GetMapping("/sessions/{id}")
    public ResponseEntity<ChatSessionResponse> getSession(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(chatService.getSession(user.getId(), id));
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionResponse>> getSessions(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) UUID workspaceId) {
        if (ownerId != null) {
            requireSameOwner(user, ownerId);
            return ResponseEntity.ok(chatService.getSessionsByOwner(user.getId()));
        }
        if (workspaceId != null) {
            return ResponseEntity.ok(chatService.getSessionsByWorkspace(user.getId(), workspaceId));
        }
        return ResponseEntity.ok(chatService.getSessionsByOwner(user.getId()));
    }

    /**
     * Danh sách conversation có phân trang / tìm kiếm / lọc trạng thái cho tab
     * Conversations.
     *
     * @param status ACTIVE | ARCHIVED | ALL
     */
    @GetMapping("/conversations")
    public ResponseEntity<ChatSessionPageResponse> listConversations(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(defaultValue = "ACTIVE") String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        if (ownerId != null) {
            requireSameOwner(user, ownerId);
        }
        return ResponseEntity.ok(chatService.searchSessions(user.getId(), status, search, projectId, page, size));
    }

    @PatchMapping("/sessions/{id}")
    public ResponseEntity<ChatSessionResponse> updateSession(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody ChatSessionUpdateRequest changes) {
        return ResponseEntity.ok(chatService.updateSession(user.getId(), id, changes));
    }

    @PatchMapping("/sessions/{id}/archive")
    public ResponseEntity<ChatSessionResponse> archiveSession(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "true") boolean archived) {
        return ResponseEntity.ok(chatService.setArchived(user.getId(), id, archived));
    }

    @PatchMapping("/sessions/{id}/bookmark")
    public ResponseEntity<ChatSessionResponse> toggleBookmark(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(chatService.toggleBookmarked(user.getId(), id));
    }

    @PostMapping("/sessions/{id}/usage")
    public ResponseEntity<ChatSessionResponse> recordUsage(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody ChatSessionTokenUsageRequest request) {
        return ResponseEntity.ok(chatService.recordTokenUsage(user.getId(), id, request));
    }

    @PostMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ChatMessageResponse> addMessage(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @Valid @RequestBody ChatMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.addMessage(user.getId(), sessionId, request));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(chatService.getMessages(user.getId(), sessionId));
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        chatService.deleteSession(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    private void requireSameOwner(User user, UUID requestedOwnerId) {
        if (!user.getId().equals(requestedOwnerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner does not match authenticated user");
        }
    }
}
