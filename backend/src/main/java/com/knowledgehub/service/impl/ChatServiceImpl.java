package com.knowledgehub.service.impl;

import com.knowledgehub.dto.request.ChatMessageRequest;
import com.knowledgehub.dto.request.ChatSessionCreateRequest;
import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.ChatSessionResponse;
import com.knowledgehub.entity.*;
import com.knowledgehub.mapper.EntityMapper;
import com.knowledgehub.repository.*;
import com.knowledgehub.service.exception.ServiceEntityNotFoundException;
import com.knowledgehub.service.interfaces.ChatService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final EntityMapper entityMapper;

    @Override
    public ChatSessionResponse createSession(ChatSessionCreateRequest request) {
        User owner = userRepository.findById(request.ownerId())
                .orElseThrow(() -> new ServiceEntityNotFoundException("User not found: " + request.ownerId()));

        Workspace workspace = null;
        if (request.workspaceId() != null) {
            workspace = workspaceRepository.findById(request.workspaceId())
                    .orElseThrow(() -> new ServiceEntityNotFoundException("Workspace not found: " + request.workspaceId()));
        }

        ChatSession session = new ChatSession();
        session.setOwner(owner);
        session.setWorkspace(workspace);
        session.setTitle(request.title() != null && !request.title().isBlank() ? request.title() : "New Chat");

        ChatSession saved = chatSessionRepository.save(session);
        return entityMapper.toChatSessionResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ChatSessionResponse getSession(UUID id) {
        return chatSessionRepository.findById(id)
                .map(entityMapper::toChatSessionResponse)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Chat session not found: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getSessionsByOwner(UUID ownerId) {
        return chatSessionRepository.findByOwnerId(ownerId)
                .stream()
                .map(entityMapper::toChatSessionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatSessionResponse> getSessionsByWorkspace(UUID workspaceId) {
        return chatSessionRepository.findByWorkspaceId(workspaceId)
                .stream()
                .map(entityMapper::toChatSessionResponse)
                .toList();
    }

    @Override
    public ChatMessageResponse addMessage(UUID sessionId, ChatMessageRequest request) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Chat session not found: " + sessionId));

        ChatMessage message = new ChatMessage();
        message.setSession(session);
        message.setContent(request.content());
        message.setRole(request.role() != null ? request.role() : MessageRole.USER);
        message.setSources(request.sources());

        ChatMessage saved = chatMessageRepository.save(message);
        return entityMapper.toChatMessageResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(UUID sessionId) {
        if (!chatSessionRepository.existsById(sessionId)) {
            throw new ServiceEntityNotFoundException("Chat session not found: " + sessionId);
        }
        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(entityMapper::toChatMessageResponse)
                .toList();
    }

    @Override
    public void deleteSession(UUID id) {
        ChatSession session = chatSessionRepository.findById(id)
                .orElseThrow(() -> new ServiceEntityNotFoundException("Chat session not found: " + id));
        chatSessionRepository.delete(session);
    }
}