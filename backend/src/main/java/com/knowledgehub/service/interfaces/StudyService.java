package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.StudyMessageRequest;
import com.knowledgehub.dto.request.StudyNoteRequest;
import com.knowledgehub.dto.request.StudySourceRequest;
import com.knowledgehub.dto.request.StudyStudioRequest;
import com.knowledgehub.dto.response.StudyWorkspaceResponse;

import java.util.UUID;

/**
 * Notebook học tập của tab Conversations (Academy Hub): nguồn tài liệu, tin
 * nhắn, ghi chú và công cụ Studio.
 */
public interface StudyService {

    /**
     * Dữ liệu notebook của workspace. Nếu sessionId null, BE tự chọn
     * conversation mới nhất của owner trong workspace (hoặc tạo mới khi chưa
     * có).
     */
    StudyWorkspaceResponse getWorkspace(UUID ownerId, UUID workspaceId, UUID sessionId);

    StudyWorkspaceResponse addSource(UUID ownerId, UUID sessionId, StudySourceRequest request);

    StudyWorkspaceResponse removeSource(UUID ownerId, UUID sessionId, UUID attachmentId);

    StudyWorkspaceResponse setSourceChecked(UUID ownerId, UUID sessionId, UUID attachmentId, boolean checked);

    StudyWorkspaceResponse setAllSourcesChecked(UUID ownerId, UUID sessionId, boolean checked);

    /**
     * Gửi câu hỏi, trả về notebook đã có câu trả lời của trợ lý.
     */
    StudyWorkspaceResponse sendMessage(UUID ownerId, UUID sessionId, StudyMessageRequest request);

    StudyWorkspaceResponse runTool(UUID ownerId, UUID sessionId, StudyStudioRequest request);

    StudyWorkspaceResponse addNote(UUID ownerId, UUID sessionId, StudyNoteRequest request);

    StudyWorkspaceResponse deleteNote(UUID ownerId, UUID sessionId, UUID noteId);
}
