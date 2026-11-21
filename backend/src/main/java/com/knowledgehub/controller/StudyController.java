package com.knowledgehub.controller;

import com.knowledgehub.dto.request.StudyMessageRequest;
import com.knowledgehub.dto.request.StudyNoteRequest;
import com.knowledgehub.dto.request.StudySourceRequest;
import com.knowledgehub.dto.request.StudyStudioRequest;
import com.knowledgehub.dto.response.StudyWorkspaceResponse;
import com.knowledgehub.service.interfaces.StudyService;
import com.knowledgehub.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Notebook học tập của tab Conversations (Academy Hub): nguồn tài liệu, tin
 * nhắn, ghi chú và công cụ Studio.
 *
 * <p>
 * Mọi endpoint đều trả về toàn bộ {@link StudyWorkspaceResponse} để FE cập nhật
 * một lần, tránh nhiều request rời rạc cho 3 cột của notebook.
 * </p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/study")
public class StudyController {

    private final StudyService studyService;

    /**
     * Mở notebook. sessionId bỏ trống thì BE chọn conversation mới nhất của
     * workspace (tạo mới nếu chưa có).
     */
    @GetMapping
    public ResponseEntity<StudyWorkspaceResponse> getWorkspace(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) UUID sessionId) {
        return ResponseEntity.ok(studyService.getWorkspace(user.getId(), workspaceId, sessionId));
    }

    // --------------------------------------------------------------- sources
    @PostMapping("/sessions/{sessionId}/sources")
    public ResponseEntity<StudyWorkspaceResponse> addSource(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @RequestBody StudySourceRequest request) {
        return ResponseEntity.ok(studyService.addSource(user.getId(), sessionId, request));
    }

    @DeleteMapping("/sessions/{sessionId}/sources/{attachmentId}")
    public ResponseEntity<StudyWorkspaceResponse> removeSource(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @PathVariable UUID attachmentId) {
        return ResponseEntity.ok(studyService.removeSource(user.getId(), sessionId, attachmentId));
    }

    @PatchMapping("/sessions/{sessionId}/sources/{attachmentId}")
    public ResponseEntity<StudyWorkspaceResponse> setSourceChecked(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @PathVariable UUID attachmentId,
            @RequestParam boolean checked) {
        return ResponseEntity.ok(studyService.setSourceChecked(user.getId(), sessionId, attachmentId, checked));
    }

    /**
     * Nút "Chọn tất cả" ở cột Nguồn.
     */
    @PatchMapping("/sessions/{sessionId}/sources/select-all")
    public ResponseEntity<StudyWorkspaceResponse> setAllSourcesChecked(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @RequestParam boolean checked) {
        return ResponseEntity.ok(studyService.setAllSourcesChecked(user.getId(), sessionId, checked));
    }

    // -------------------------------------------------------------- messages
    @PostMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<StudyWorkspaceResponse> sendMessage(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @Valid @RequestBody StudyMessageRequest request) {
        return ResponseEntity.ok(studyService.sendMessage(user.getId(), sessionId, request));
    }

    /**
     * Chạy công cụ Studio (tổng quan, flashcard, quiz, mindmap...).
     */
    @PostMapping("/sessions/{sessionId}/studio")
    public ResponseEntity<StudyWorkspaceResponse> runTool(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @Valid @RequestBody StudyStudioRequest request) {
        return ResponseEntity.ok(studyService.runTool(user.getId(), sessionId, request));
    }

    // ----------------------------------------------------------------- notes
    @PostMapping("/notes")
    public ResponseEntity<StudyWorkspaceResponse> addNote(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID sessionId,
            @Valid @RequestBody StudyNoteRequest request) {
        return ResponseEntity.ok(studyService.addNote(user.getId(), sessionId, request));
    }

    @DeleteMapping("/sessions/{sessionId}/notes/{noteId}")
    public ResponseEntity<StudyWorkspaceResponse> deleteNote(
            @AuthenticationPrincipal User user,
            @PathVariable UUID sessionId,
            @PathVariable UUID noteId) {
        return ResponseEntity.ok(studyService.deleteNote(user.getId(), sessionId, noteId));
    }
}
