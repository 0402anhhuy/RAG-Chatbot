package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.ChatMessageRequest;
import com.knowledgehub.dto.request.ChatSessionCreateRequest;
import com.knowledgehub.dto.request.ChatSessionTokenUsageRequest;
import com.knowledgehub.dto.request.ChatSessionUpdateRequest;
import com.knowledgehub.dto.response.ChatMessageResponse;
import com.knowledgehub.dto.response.ChatSessionPageResponse;
import com.knowledgehub.dto.response.ChatSessionResponse;
import java.util.List;
import java.util.UUID;

public interface ChatService {

    ChatSessionResponse createSession(UUID ownerId, ChatSessionCreateRequest request);

    ChatSessionResponse getSession(UUID ownerId, UUID id);

    List<ChatSessionResponse> getSessionsByOwner(UUID ownerId);

    List<ChatSessionResponse> getSessionsByWorkspace(UUID ownerId, UUID workspaceId);

    /**
     * Truy vấn danh sách conversation có phân trang, tìm kiếm và lọc trạng
     * thái.
     *
     * @param status ACTIVE | ARCHIVED | ALL (null tương đương ALL)
     */
    ChatSessionPageResponse searchSessions(UUID ownerId, String status, String search, UUID projectId,
            int page, int size);

    ChatSessionResponse updateSession(UUID ownerId, UUID id, ChatSessionUpdateRequest changes);

    ChatSessionResponse setArchived(UUID ownerId, UUID id, boolean archived);

    ChatSessionResponse toggleBookmarked(UUID ownerId, UUID id);

    ChatSessionResponse recordTokenUsage(UUID ownerId, UUID id, ChatSessionTokenUsageRequest request);

    ChatMessageResponse addMessage(UUID ownerId, UUID sessionId, ChatMessageRequest request);

    List<ChatMessageResponse> getMessages(UUID ownerId, UUID sessionId);

    void deleteSession(UUID ownerId, UUID id);
}
