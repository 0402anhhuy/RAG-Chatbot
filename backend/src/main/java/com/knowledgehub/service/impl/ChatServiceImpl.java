package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.ChatMessageRequest;
import com.knowledgehub.dto.request.ChatSessionCreateRequest;
import com.knowledgehub.dto.request.ChatSessionTokenUsageRequest;
import com.knowledgehub.dto.request.ChatSessionUpdateRequest;
import com.knowledgehub.dto.request.UsageEventRequest;
import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.ChatSessionPageResponse;
import com.knowledgehub.dto.response.ChatSessionResponse;
import com.knowledgehub.entity.*;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.*;
import com.knowledgehub.rag.RagWorkspaceAccess;
import com.knowledgehub.repository.ProjectMemberRepository;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.AnalyticsService;
import com.knowledgehub.service.interfaces.ChatService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_ARCHIVED = "ARCHIVED";
    private static final String STATUS_ALL = "ALL";

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectRepository projectRepository;
    private final EntityMapper entityMapper;
    private final AnalyticsService analyticsService;
    private final RagWorkspaceAccess workspaceAccess;
    private final ProjectMemberRepository projectMemberRepository;

    @Override
    public ChatSessionResponse createSession(UUID ownerId, ChatSessionCreateRequest request) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + ownerId));

        Workspace workspace = null;
        if (request.workspaceId() != null) {
            workspaceAccess.requireReadAccess(ownerId, request.workspaceId(), List.of());
            workspace = workspaceRepository.findById(request.workspaceId())
                    .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + request.workspaceId()));
        }

        Project project = null;
        if (request.projectId() != null) {
            project = projectRepository.findById(request.projectId())
                    .orElseThrow(() -> new ServiceEntityNotFoundException("Project not found: " + request.projectId()));
            requireProjectAccess(ownerId, project);
        }

        ChatSession session = new ChatSession();
        session.setOwner(owner);
        session.setWorkspace(workspace);
        session.setProject(project);
        session.setModel(request.model());
        session.setTitle(request.title() != null && !request.title().isBlank() ? request.title() : "New Chat");

        ChatSession saved = chatSessionRepository.save(session);
        return entityMapper.toChatSessionResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ChatSessionResponse getSession(UUID ownerId, UUID id) {
        return entityMapper.toChatSessionResponse(findOwnedSession(ownerId, id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getSessionsByOwner(UUID ownerId) {
        return chatSessionRepository.findByOwnerIdOrderByUpdatedAtDesc(ownerId)
                .stream()
                .map(entityMapper::toChatSessionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getSessionsByWorkspace(UUID ownerId, UUID workspaceId) {
        workspaceAccess.requireReadAccess(ownerId, workspaceId, List.of());
        return chatSessionRepository.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId)
                .stream()
                .filter(session -> session.getOwner() != null && ownerId.equals(session.getOwner().getId()))
                .map(entityMapper::toChatSessionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ChatSessionPageResponse searchSessions(UUID ownerId, String status, String search, UUID projectId,
            int page, int size) {
        String normalizedStatus = normalizeStatus(status);
        String normalizedSearch = search == null ? "" : search.trim();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Boolean archived = switch (normalizedStatus) {
            case STATUS_ACTIVE ->
                Boolean.FALSE;
            case STATUS_ARCHIVED ->
                Boolean.TRUE;
            default ->
                null;
        };

        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Direction.DESC, "updatedAt"));

        Page<ChatSession> result = chatSessionRepository.search(
                ownerId, archived, normalizedSearch, projectId, pageable);

        long activeCount = ownerId == null ? 0 : chatSessionRepository.countByOwnerIdAndArchived(ownerId, false);
        long archivedCount = ownerId == null ? 0 : chatSessionRepository.countByOwnerIdAndArchived(ownerId, true);
        long allCount = ownerId == null ? chatSessionRepository.count() : chatSessionRepository.countByOwnerId(ownerId);

        return new ChatSessionPageResponse(
                result.getContent().stream().map(entityMapper::toChatSessionResponse).toList(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber(),
                result.getSize(),
                activeCount,
                archivedCount,
                allCount);
    }

    @Override
    public ChatSessionResponse updateSession(UUID ownerId, UUID id, ChatSessionUpdateRequest changes) {
        ChatSession session = findOwnedSession(ownerId, id);

        if (changes.title() != null && !changes.title().isBlank()) {
            session.setTitle(changes.title().trim());
        }
        if (changes.model() != null && !changes.model().isBlank()) {
            session.setModel(changes.model().trim());
        }
        if (changes.bookmarked() != null) {
            session.setBookmarked(changes.bookmarked());
        }
        if (changes.projectId() != null) {
            Project project = projectRepository.findById(changes.projectId())
                    .orElseThrow(() -> new ServiceEntityNotFoundException(
                            "Project not found: " + changes.projectId()));
            requireProjectAccess(ownerId, project);
            session.setProject(project);
        }

        return entityMapper.toChatSessionResponse(chatSessionRepository.save(session));
    }

    @Override
    public ChatSessionResponse setArchived(UUID ownerId, UUID id, boolean archived) {
        ChatSession session = findOwnedSession(ownerId, id);
        session.setArchived(archived);
        session.setArchivedAt(archived ? Instant.now() : null);
        return entityMapper.toChatSessionResponse(chatSessionRepository.save(session));
    }

    @Override
    public ChatSessionResponse toggleBookmarked(UUID ownerId, UUID id) {
        ChatSession session = findOwnedSession(ownerId, id);
        session.setBookmarked(!session.isBookmarked());
        return entityMapper.toChatSessionResponse(chatSessionRepository.save(session));
    }

    @Override
    public ChatSessionResponse recordTokenUsage(UUID ownerId, UUID id, ChatSessionTokenUsageRequest request) {
        ChatSession session = findOwnedSession(ownerId, id);

        long promptTokens = request.promptTokens() != null ? request.promptTokens() : 0L;
        long completionTokens = request.completionTokens() != null ? request.completionTokens() : 0L;
        double cost = request.cost() != null ? request.cost() : 0d;

        session.setPromptTokens(session.getPromptTokens() + promptTokens);
        session.setCompletionTokens(session.getCompletionTokens() + completionTokens);
        session.setTotalTokens(session.getTotalTokens() + promptTokens + completionTokens);
        session.setTotalCost(session.getTotalCost() + cost);

        // Session thuộc project thì ghi lượt dùng này vào nguồn số liệu Analytics.
        if (session.getProject() != null && session.getProvider() != null) {
            analyticsService.recordUsage(session.getProject().getId(), new UsageEventRequest(
                    session.getProvider(),
                    session.getModel(),
                    promptTokens,
                    completionTokens,
                    0L,
                    0L,
                    1L,
                    0,
                    0,
                    0,
                    session.getOwner() != null ? session.getOwner().getId() : null,
                    null,
                    null,
                    false,
                    null,
                    cost > 0 ? cost : null,
                    null));
        }

        return entityMapper.toChatSessionResponse(chatSessionRepository.save(session));
    }

    @Override
    public ChatMessageResponse addMessage(UUID ownerId, UUID sessionId, ChatMessageRequest request) {
        ChatSession session = findOwnedSession(ownerId, sessionId);

        ChatMessage message = new ChatMessage();
        message.setSession(session);
        message.setContent(request.content());
        message.setRole(request.role() != null ? request.role() : MessageRole.USER);
        message.setSources(request.sources());
        message.setTokenCount(request.tokens() != null ? request.tokens() : 0L);
        message.setCost(request.cost() != null ? request.cost() : 0d);

        ChatMessage saved = chatMessageRepository.save(message);

        // Tổng hợp token/cost của message vào session để tab Conversations hiển thị
        session.setTotalTokens(session.getTotalTokens() + saved.getTokenCount());
        session.setTotalCost(session.getTotalCost() + saved.getCost());
        chatSessionRepository.save(session);

        // Tin nhắn có token là một lượt dùng thật: ghi vào Analytics của project.
        if (session.getProject() != null && session.getProvider() != null && saved.getTokenCount() > 0) {
            boolean assistant = saved.getRole() != MessageRole.USER;
            analyticsService.recordUsage(session.getProject().getId(), new UsageEventRequest(
                    session.getProvider(),
                    session.getModel(),
                    assistant ? 0L : saved.getTokenCount(),
                    assistant ? saved.getTokenCount() : 0L,
                    0L,
                    0L,
                    1L,
                    0,
                    0,
                    0,
                    session.getOwner() != null ? session.getOwner().getId() : null,
                    null,
                    null,
                    false,
                    null,
                    saved.getCost() > 0 ? saved.getCost() : null,
                    null));
        }

        return entityMapper.toChatMessageResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(UUID ownerId, UUID sessionId) {
        findOwnedSession(ownerId, sessionId);
        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(entityMapper::toChatMessageResponse)
                .toList();
    }

    @Override
    public void deleteSession(UUID ownerId, UUID id) {
        ChatSession session = findOwnedSession(ownerId, id);
        chatSessionRepository.delete(session);
    }

    private ChatSession findOwnedSession(UUID ownerId, UUID id) {
        ChatSession session = findSession(id);
        if (session.getOwner() == null || !ownerId.equals(session.getOwner().getId())) {
            throw new ServiceEntityNotFoundException("Chat session not found: " + id);
        }
        return session;
    }

    private void requireProjectAccess(UUID userId, Project project) {
        boolean isOwner = project.getOwner() != null && userId.equals(project.getOwner().getId());
        if (!isOwner && !projectMemberRepository.existsByProjectIdAndUserId(project.getId(), userId)) {
            throw new ServiceEntityNotFoundException("Project not found: " + project.getId());
        }
    }

    private ChatSession findSession(UUID id) {
        return chatSessionRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Chat session not found: " + id));
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return STATUS_ALL;
        }
        String upper = status.trim().toUpperCase();
        return switch (upper) {
            case STATUS_ACTIVE, STATUS_ARCHIVED ->
                upper;
            default ->
                STATUS_ALL;
        };
    }
}
