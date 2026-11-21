package com.knowledgehub.service.interfaces;

import com.knowledgehub.dto.request.WorkbenchFileCreateRequest;
import com.knowledgehub.dto.request.WorkbenchFileUpdateRequest;
import com.knowledgehub.dto.request.WorkbenchSettingsUpdateRequest;
import com.knowledgehub.dto.request.WorkbenchSyncRequest;
import com.knowledgehub.dto.response.WorkbenchFileContentResponse;
import com.knowledgehub.dto.response.WorkbenchFileResponse;
import com.knowledgehub.dto.response.WorkbenchSettingsResponse;

import java.util.List;
import java.util.UUID;

/**
 * Dữ liệu cho tab IDE trong một project: cây file, editor, sync thư mục, tải
 * transcript và cấu hình thanh prompt.
 */
public interface WorkbenchService {

    List<WorkbenchFileResponse> listFiles(UUID projectId, String search, String extension, boolean tree);

    WorkbenchFileResponse createFile(UUID projectId, WorkbenchFileCreateRequest request);

    WorkbenchFileContentResponse getFileContent(UUID projectId, UUID fileId);

    WorkbenchFileContentResponse saveFileContent(UUID projectId, UUID fileId, WorkbenchFileUpdateRequest request);

    void deleteFile(UUID projectId, UUID fileId);

    /**
     * Đẩy toàn bộ file client đang có lên workspace (sync to folder).
     */
    List<WorkbenchFileResponse> syncToWorkspace(UUID projectId, List<WorkbenchSyncRequest> files);

    WorkbenchFileResponse uploadFile(UUID projectId, String path, String content);

    /**
     * Transcript dạng markdown của một conversation (hoặc cả workspace nếu
     * null).
     */
    String buildTranscript(UUID projectId, UUID conversationId);

    WorkbenchSettingsResponse getSettings(UUID projectId, UUID conversationId);

    WorkbenchSettingsResponse updateSettings(
            UUID projectId, UUID conversationId, WorkbenchSettingsUpdateRequest request);
}
