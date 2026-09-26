import { useState, useRef } from "react";
import {
    BookOpen,
    CheckCircle2,
    Clock,
    Database,
    Download,
    ExternalLink,
    Eye,
    FileSpreadsheet,
    FileText,
    FileType,
    Filter,
    Layers,
    Maximize2,
    MoreHorizontal,
    Plus,
    Presentation,
    RefreshCw,
    Search,
    Sparkles,
    Trash2,
    UploadCloud,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import "./Documents.css";

const MOCK_DOCUMENTS = [
    {
        id: "doc-1",
        title: "Lecture_04_Dynamic_Programming.pdf",
        type: "pdf",
        size: "3.8 MB",
        uploadedAt: "Yesterday, 14:20",
        chunks: 142,
        status: "Indexed",
        courseCode: "CS204",
        previewData: {
            totalPages: 24,
            currentPage: 18,
            excerpt:
                "The 0/1 Knapsack Problem: Given a set of n items numbered from 1 up to n, each with a weight w[i] and a value v[i], along with a maximum weight capacity W.",
            highlightFormula: "dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i])",
            citationNote: "Vector matched in 12 quiz questions",
        },
    },
    {
        id: "doc-2",
        title: "Clean_Architecture_Domain_Guidelines.docx",
        type: "docx",
        size: "1.4 MB",
        uploadedAt: "3 days ago",
        chunks: 86,
        status: "Indexed",
        courseCode: "SE301",
        previewData: {
            heading: "Domain-Driven Design (DDD) Entity Separation",
            author: "MSc. Tran Thi B",
            paragraphs: [
                "1. Core Domain Layer: Entities must remain completely isolated from presentation or infrastructure framework dependencies.",
                "2. Use Case Interactors: Coordinate business flows, accepting boundary request data transfer objects (DTOs) and emitting response DTOs.",
                "3. Inversion of Control: Database persistence gateways are specified as interfaces in the application layer and implemented externally.",
            ],
        },
    },
    {
        id: "doc-3",
        title: "Benchmark_Retrieval_Vector_Latency.xlsx",
        type: "xlsx",
        size: "620 KB",
        uploadedAt: "1 week ago",
        chunks: 48,
        status: "Indexed",
        courseCode: "AI402",
        previewData: {
            sheetName: "Vector_DB_Benchmark",
            headers: ["Model", "Database", "Index Type", "Top-K", "Latency (ms)", "Precision@5"],
            rows: [
                [
                    "text-embedding-3-small",
                    "Qdrant Cloud",
                    "HNSW (Cosine)",
                    "5",
                    "18.4 ms",
                    "94.6%",
                ],
                ["bge-large-en-v1.5", "Pinecone Serverless", "HNSW", "5", "26.1 ms", "92.1%"],
                ["all-MiniLM-L6-v2", "ChromaDB (Local)", "Flat", "5", "12.8 ms", "88.4%"],
                ["text-embedding-ada-002", "Neo4j Vector", "Lucene HNSW", "5", "31.2 ms", "91.0%"],
            ],
        },
    },
    {
        id: "doc-4",
        title: "Microservices_Event_Driven_Patterns.pptx",
        type: "pptx",
        size: "8.5 MB",
        uploadedAt: "Sep 20, 2026",
        chunks: 110,
        status: "Indexed",
        courseCode: "SE301",
        previewData: {
            totalSlides: 36,
            currentSlide: 12,
            slideTitle: "Transactional Outbox Pattern & Event Sourcing",
            slideBullets: [
                "Dual-write anti-pattern: Updating an RDBMS and publishing to Kafka concurrently leads to inconsistency during network partitions.",
                "Solution: Insert events into an 'OUTBOX' table within the exact same database transaction.",
                "Polling publisher / Debezium CDC reads write-ahead logs (WAL) to push events into broker with at-least-once delivery.",
            ],
        },
    },
    {
        id: "doc-5",
        title: "GraphRAG_KnowledgeGraph_Spec.md",
        type: "md",
        size: "94 KB",
        uploadedAt: "Sep 18, 2026",
        chunks: 24,
        status: "Indexed",
        courseCode: "AI402",
        previewData: {
            rawMarkdown: `# GraphRAG Node Traversal Pipeline

## Overview
Combining **Dense Vector Search** with **Neo4j Cypher Traversal** facilitates multi-hop reasoning over unstructured courseware.

### Pipeline Stages:
- **Entity Extraction:** SpaCy / LLM identifying Nodes (\`Concept\`, \`Algorithm\`, \`Course\`).
- **Relationship Linking:** Extracted triples (\`Dijkstra\` -[:BELONGS_TO]-> \`Graph_Theory\`).
- **Hybrid Fusion:** Reciprocal Rank Fusion (RRF) scores vector similarity alongside graph depth.
`,
        },
    },
];

const Documents = ({ onLaunchTool }) => {
    const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
    const [selectedDoc, setSelectedDoc] = useState(MOCK_DOCUMENTS[0]);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [zoomLevel, setZoomLevel] = useState(100);
    const fileUploadRef = useRef(null);

    const getDocIcon = (type) => {
        switch (type) {
            case "pdf":
                return <FileText size={16} className="file-type-icon pdf" />;
            case "docx":
            case "doc":
                return <FileType size={16} className="file-type-icon docx" />;
            case "xlsx":
            case "csv":
                return <FileSpreadsheet size={16} className="file-type-icon xlsx" />;
            case "pptx":
                return <Presentation size={16} className="file-type-icon pptx" />;
            case "md":
                return <BookOpen size={16} className="file-type-icon md" />;
            default:
                return <FileText size={16} className="file-type-icon default" />;
        }
    };

    const filteredDocs = documents.filter((doc) => {
        const matchesQuery =
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.courseCode.toLowerCase().includes(searchQuery.toLowerCase());
        if (typeFilter !== "all" && doc.type !== typeFilter) return false;
        return matchesQuery;
    });

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const extension = file.name.split(".").pop().toLowerCase();
        const newDoc = {
            id: `doc-${Date.now()}`,
            title: file.name,
            type: extension,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            uploadedAt: "Just now",
            chunks: Math.floor(Math.random() * 80) + 20,
            status: "Indexed",
            courseCode: "GEN",
            previewData: {
                totalPages: 1,
                excerpt:
                    "Uploaded file successfully ingested and indexed into Qdrant vector store.",
            },
        };

        setDocuments((prev) => [newDoc, ...prev]);
        setSelectedDoc(newDoc);
    };

    return (
        <div className="documents-tab-bounds">
            {/* Header Banner */}
            <div className="documents-header-banner">
                <div>
                    <h2>Courseware Documents & Assets</h2>
                    <span>
                        Manage uploaded learning materials (PDF, Word, Excel, PPT, Markdown) with
                        real-time vector indexing and inline inspection
                    </span>
                </div>
                <div className="banner-actions-group">
                    <button
                        type="button"
                        className="btn-upload-document"
                        onClick={() => fileUploadRef.current?.click()}
                    >
                        <UploadCloud size={14} />
                        <span>Upload Documents</span>
                    </button>
                    <input
                        ref={fileUploadRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt"
                        hidden
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            {/* Split Screen Master-Detail Layout */}
            <div className="documents-split-container">
                {/* CỘT TRÁI: DANH SÁCH TÀI LIỆU */}
                <div className="documents-sidebar-list">
                    {/* Search bar */}
                    <div className="docs-search-bar">
                        <Search size={14} className="search-glyph" />
                        <input
                            type="text"
                            placeholder="Filter documents, extensions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Type Pills */}
                    <div className="docs-type-filters">
                        <button
                            type="button"
                            className={`type-pill ${typeFilter === "all" ? "active" : ""}`}
                            onClick={() => setTypeFilter("all")}
                        >
                            All ({documents.length})
                        </button>
                        <button
                            type="button"
                            className={`type-pill ${typeFilter === "pdf" ? "active" : ""}`}
                            onClick={() => setTypeFilter("pdf")}
                        >
                            PDF
                        </button>
                        <button
                            type="button"
                            className={`type-pill ${typeFilter === "docx" ? "active" : ""}`}
                            onClick={() => setTypeFilter("docx")}
                        >
                            Word
                        </button>
                        <button
                            type="button"
                            className={`type-pill ${typeFilter === "xlsx" ? "active" : ""}`}
                            onClick={() => setTypeFilter("xlsx")}
                        >
                            Excel
                        </button>
                        <button
                            type="button"
                            className={`type-pill ${typeFilter === "pptx" ? "active" : ""}`}
                            onClick={() => setTypeFilter("pptx")}
                        >
                            PPT
                        </button>
                        <button
                            type="button"
                            className={`type-pill ${typeFilter === "md" ? "active" : ""}`}
                            onClick={() => setTypeFilter("md")}
                        >
                            MD
                        </button>
                    </div>

                    {/* Document Items List */}
                    <div className="docs-scroll-track">
                        {filteredDocs.map((doc) => {
                            const isSelected = selectedDoc?.id === doc.id;
                            return (
                                <div
                                    key={doc.id}
                                    className={`doc-item-entry ${isSelected ? "selected" : ""}`}
                                    onClick={() => setSelectedDoc(doc)}
                                >
                                    <div className="doc-icon-wrapper">{getDocIcon(doc.type)}</div>
                                    <div className="doc-meta-column">
                                        <div className="doc-title-row">
                                            <strong className="doc-title-text" title={doc.title}>
                                                {doc.title}
                                            </strong>
                                        </div>
                                        <div className="doc-sub-details">
                                            <span className="doc-course-tag">{doc.courseCode}</span>
                                            <span>{doc.size}</span>
                                            <span>•</span>
                                            <span className="doc-chunks-stat">
                                                <Database size={10} /> {doc.chunks} chunks
                                            </span>
                                        </div>
                                    </div>
                                    <span className="doc-status-dot" title="Vectorized in Qdrant" />
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Storage Stats */}
                    <div className="docs-sidebar-footer">
                        <div className="storage-meter-row">
                            <span>Storage Utilized</span>
                            <strong>15.2 MB / 500 MB</strong>
                        </div>
                        <div className="storage-progress-rail">
                            <div className="storage-fill" style={{ width: "8%" }} />
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: XEM TRƯỚC TÀI LIỆU TRỰC TIẾP (PREVIEW CANVAS) */}
                <div className="documents-preview-canvas">
                    {selectedDoc ? (
                        <>
                            {/* Preview Toolbar */}
                            <div className="preview-top-toolbar">
                                <div className="preview-file-identity">
                                    {getDocIcon(selectedDoc.type)}
                                    <div>
                                        <strong>{selectedDoc.title}</strong>
                                        <small>
                                            {selectedDoc.size} • Uploaded {selectedDoc.uploadedAt}
                                        </small>
                                    </div>
                                </div>

                                <div className="preview-controls-cluster">
                                    <div className="zoom-controls">
                                        <button
                                            type="button"
                                            className="btn-toolbar-glyph"
                                            onClick={() =>
                                                setZoomLevel((prev) => Math.max(70, prev - 10))
                                            }
                                            title="Zoom Out"
                                        >
                                            <ZoomOut size={14} />
                                        </button>
                                        <span className="zoom-percentage">{zoomLevel}%</span>
                                        <button
                                            type="button"
                                            className="btn-toolbar-glyph"
                                            onClick={() =>
                                                setZoomLevel((prev) => Math.min(150, prev + 10))
                                            }
                                            title="Zoom In"
                                        >
                                            <ZoomIn size={14} />
                                        </button>
                                    </div>

                                    <div className="toolbar-divider" />

                                    <button
                                        type="button"
                                        className="btn-ai-query-file"
                                        onClick={() => onLaunchTool && onLaunchTool("tutor")}
                                        title="Send file context to Socratic Tutor"
                                    >
                                        <Sparkles size={13} />
                                        <span>Ask Tutor</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="btn-toolbar-glyph"
                                        title="Download Original"
                                    >
                                        <Download size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Viewer Body with Multi-type Rendering */}
                            <div className="preview-scroll-viewport">
                                <div
                                    className="preview-paper-sheet"
                                    style={{
                                        transform: `scale(${zoomLevel / 100})`,
                                        transformOrigin: "top center",
                                    }}
                                >
                                    {/* 1. PDF VIEWER */}
                                    {selectedDoc.type === "pdf" && (
                                        <div className="pdf-viewer-mock">
                                            <div className="pdf-page-indicator">
                                                Page {selectedDoc.previewData.currentPage} of{" "}
                                                {selectedDoc.previewData.totalPages}
                                            </div>
                                            <h3>{selectedDoc.title.replace(".pdf", "")}</h3>
                                            <p className="pdf-paragraph-text">
                                                {selectedDoc.previewData.excerpt}
                                            </p>
                                            <div className="pdf-formula-highlight">
                                                <code>
                                                    {selectedDoc.previewData.highlightFormula}
                                                </code>
                                            </div>
                                            <p className="pdf-paragraph-text">
                                                The time complexity of this state space is bounded
                                                by O(n × W). Through memory table memoization,
                                                overlapping subproblems are calculated strictly
                                                once.
                                            </p>
                                            <div className="rag-reference-stamp">
                                                <Database size={12} color="#059669" />
                                                <span>{selectedDoc.previewData.citationNote}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. WORD (.DOCX) VIEWER */}
                                    {selectedDoc.type === "docx" && (
                                        <div className="word-viewer-mock">
                                            <div className="word-document-header">
                                                <h2>{selectedDoc.previewData.heading}</h2>
                                                <span className="doc-author">
                                                    Author: {selectedDoc.previewData.author}
                                                </span>
                                            </div>
                                            <div className="word-body-content">
                                                {selectedDoc.previewData.paragraphs.map(
                                                    (p, idx) => (
                                                        <p key={idx} className="word-text-line">
                                                            {p}
                                                        </p>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. EXCEL (.XLSX) SPREADSHEET VIEWER */}
                                    {selectedDoc.type === "xlsx" && (
                                        <div className="excel-viewer-mock">
                                            <div className="excel-sheet-tab-bar">
                                                <span className="sheet-tab active">
                                                    <FileSpreadsheet size={13} />{" "}
                                                    {selectedDoc.previewData.sheetName}
                                                </span>
                                            </div>
                                            <div className="excel-table-wrapper">
                                                <table className="excel-grid-table">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            {selectedDoc.previewData.headers.map(
                                                                (h, i) => (
                                                                    <th key={i}>{h}</th>
                                                                ),
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedDoc.previewData.rows.map(
                                                            (row, rIdx) => (
                                                                <tr key={rIdx}>
                                                                    <td className="row-num-cell">
                                                                        {rIdx + 1}
                                                                    </td>
                                                                    {row.map((cell, cIdx) => (
                                                                        <td key={cIdx}>{cell}</td>
                                                                    ))}
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. POWERPOINT (.PPTX) VIEWER */}
                                    {selectedDoc.type === "pptx" && (
                                        <div className="pptx-viewer-mock">
                                            <div className="slide-frame-container">
                                                <div className="slide-top-header">
                                                    <span className="slide-tag">
                                                        SLIDE {selectedDoc.previewData.currentSlide}{" "}
                                                        / {selectedDoc.previewData.totalSlides}
                                                    </span>
                                                    <h4>{selectedDoc.previewData.slideTitle}</h4>
                                                </div>
                                                <ul className="slide-bullet-points">
                                                    {selectedDoc.previewData.slideBullets.map(
                                                        (bullet, idx) => (
                                                            <li key={idx}>{bullet}</li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    )}

                                    {/* 5. MARKDOWN (.MD) VIEWER */}
                                    {selectedDoc.type === "md" && (
                                        <div className="markdown-viewer-mock">
                                            <div className="md-rendered-body">
                                                <pre className="md-code-raw">
                                                    <code>
                                                        {selectedDoc.previewData.rawMarkdown}
                                                    </code>
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-document-selected">
                            <BookOpen size={36} color="#cbd5e1" />
                            <p>Select any document from the list to preview its content directly</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Documents;
