package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.ChatMessageRequest;
import com.knowledgehub.dto.request.ChatSessionCreateRequest;
import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.ChatSessionResponse;
import java.util.List;
import java.util.UUID;

public interface ChatService {
    ChatSessionResponse createSession(ChatSessionCreateRequest request);
    ChatSessionResponse getSession(UUID id);
    List<ChatSessionResponse> getSessionsByOwner(UUID ownerId);
    List<ChatSessionResponse> getSessionsByWorkspace(UUID workspaceId);
    ChatMessageResponse addMessage(UUID sessionId, ChatMessageRequest request);
    List<ChatMessageResponse> getMessages(UUID sessionId);
    void deleteSession(UUID id);
}