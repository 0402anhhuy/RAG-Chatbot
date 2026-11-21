package com.knowledgehub.entity;

/**
 * Trạng thái của một ingest job do rag-service chạy.
 */
public enum RagIngestJobStatus {
    QUEUED("queued"),
    RUNNING("running"),
    SUCCEEDED("succeeded"),
    FAILED("failed"),
    DELETED("deleted");

    private final String wireValue;

    RagIngestJobStatus(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static RagIngestJobStatus fromWire(String value) {
        if (value == null) {
            return null;
        }
        for (RagIngestJobStatus status : values()) {
            if (status.wireValue.equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown RAG ingest job status: " + value);
    }
}
