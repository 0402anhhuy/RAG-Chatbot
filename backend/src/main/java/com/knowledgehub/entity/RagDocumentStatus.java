package com.knowledgehub.entity;

/**
 * Vòng đời ingest của một tài liệu trong RAG catalog.
 *
 * <p>
 * Khác với {@link DocumentStatus} (trạng thái hiển thị cho người dùng), enum này
 * theo dõi tiến trình index của rag-service: queued -> processing -> ready, hoặc
 * failed / deleted.
 * </p>
 */
public enum RagDocumentStatus {
    QUEUED("queued"),
    PROCESSING("processing"),
    READY("ready"),
    FAILED("failed"),
    DELETED("deleted");

    private final String wireValue;

    RagDocumentStatus(String wireValue) {
        this.wireValue = wireValue;
    }

    /** Giá trị mà rag-service dùng trong API và câu lệnh SQL. */
    public String wireValue() {
        return wireValue;
    }

    public static RagDocumentStatus fromWire(String value) {
        if (value == null) {
            return null;
        }
        for (RagDocumentStatus status : values()) {
            if (status.wireValue.equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown RAG document status: " + value);
    }
}
