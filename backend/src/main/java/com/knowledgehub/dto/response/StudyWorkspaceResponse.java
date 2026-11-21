package com.knowledgehub.dto.response;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Toàn bộ dữ liệu cho tab Conversations của Academy Hub.
 *
 * @param sessionId conversation đang mở (null nếu workspace chưa có
 * conversation)
 * @param title tiêu đề notebook (lấy từ conversation)
 * @param activeSourceCount số nguồn đang bật, dùng cho dòng "N nguồn"
 * @param tools danh sách công cụ Studio; BE trả để FE không phải hardcode
 */
public record StudyWorkspaceResponse(
        UUID sessionId,
        UUID workspaceId,
        String title,
        List<Source> sources,
        List<Message> messages,
        List<Note> notes,
        List<StudioTool> tools,
        int activeSourceCount) {

    /**
     * Một nguồn tài liệu của conversation.
     */
    public record Source(
            UUID attachmentId,
            UUID documentId,
            String name,
            String type,
            String size,
            boolean checked,
            boolean hasStoredFile) {

    }

    /**
     * Một tin nhắn trong notebook. sender: "user" | "ai".
     */
    public record Message(
            UUID id,
            String sender,
            String text,
            String timestamp,
            List<Map<String, Object>> citations) {

    }

    public record Note(
            UUID id,
            String title,
            String content,
            String date) {

    }

    /**
     * Công cụ Studio. id khớp với activeSubTool ở AcademyHub.
     */
    public record StudioTool(
            String id,
            String label,
            String icon,
            String color,
            boolean available) {

    }
}
