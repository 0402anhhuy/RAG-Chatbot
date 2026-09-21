package com.knowledgehub.controller;

import com.knowledgehub.dto.request.ChatMessageRequest;
import com.knowledgehub.dto.request.ChatSessionCreateRequest;
import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.ChatSessionResponse;
import com.knowledgehub.service.interfaces.ChatService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/sessions")
    public ResponseEntity<ChatSessionResponse> createSession(
            @Valid @RequestBody ChatSessionCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.createSession(request));
    }

    @GetMapping("/sessions/{id}")
    public ResponseEntity<ChatSessionResponse> getSession(@PathVariable UUID id) {
        return ResponseEntity.ok(chatService.getSession(id));
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionResponse>> getSessions(
            @RequestParam(required = false) UUID ownerId,
            @RequestParam(required = false) UUID workspaceId) {
        if (ownerId != null) {
            return ResponseEntity.ok(chatService.getSessionsByOwner(ownerId));
        }
        if (workspaceId != null) {
            return ResponseEntity.ok(chatService.getSessionsByWorkspace(workspaceId));
        }
        throw new IllegalArgumentException("ownerId or workspaceId is required");
    }

    @PostMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ChatMessageResponse> addMessage(
            @PathVariable UUID sessionId,
            @Valid @RequestBody ChatMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatService.addMessage(sessionId, request));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(chatService.getMessages(sessionId));
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable UUID id) {
        chatService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }
}