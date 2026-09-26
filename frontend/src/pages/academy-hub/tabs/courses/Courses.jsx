import { useState } from "react";
import {
    ArrowUpRight,
    BookOpen,
    CheckCircle2,
    Database,
    FileCheck,
    FileText,
    Filter,
    FolderGit2,
    GraduationCap,
    MoreHorizontal,
    Plus,
    Search,
    Sparkles,
    UploadCloud,
} from "lucide-react";
import "./Courses.css";

const COURSES_DATA = [
    {
        id: "cs204",
        code: "CS204",
        title: "Algorithms & Complexity",
        semester: "Fall 2026",
        instructor: "Dr. Nguyen Van A",
        docsCount: 14,
        vectorStatus: "Indexed",
        progress: 75,
        syllabus: [
            { name: "Lecture_01_Divide_Conquer.pdf", size: "2.4 MB", chunks: 84, status: "ready" },
            {
                name: "Lecture_04_Dynamic_Programming.pdf",
                size: "3.8 MB",
                chunks: 142,
                status: "ready",
            },
            { name: "Lab_03_Graph_Dijkstra_Spec.pdf", size: "1.1 MB", chunks: 36, status: "ready" },
        ],
    },
    {
        id: "se301",
        code: "SE301",
        title: "Software Architecture & Design Patterns",
        semester: "Fall 2026",
        instructor: "MSc. Tran Thi B",
        docsCount: 18,
        vectorStatus: "Indexed",
        progress: 60,
        syllabus: [
            { name: "Syllabus_SE301_Courseware.pdf", size: "850 KB", chunks: 28, status: "ready" },
            {
                name: "Chapter_05_Microservices_EventDriven.pdf",
                size: "4.2 MB",
                chunks: 160,
                status: "ready",
            },
            {
                name: "Clean_Architecture_Handbook.pdf",
                size: "5.6 MB",
                chunks: 210,
                status: "ready",
            },
        ],
    },
    {
        id: "ai402",
        code: "AI402",
        title: "Large Language Models & Agentic RAG",
        semester: "Fall 2026",
        instructor: "Dr. Le Hoang C",
        docsCount: 12,
        vectorStatus: "Syncing",
        progress: 92,
        syllabus: [
            {
                name: "GraphRAG_KnowledgeGraph_Traversal.pdf",
                size: "3.1 MB",
                chunks: 115,
                status: "ready",
            },
            {
                name: "Qdrant_Vector_Search_Benchmark.pdf",
                size: "1.9 MB",
                chunks: 64,
                status: "ready",
            },
            {
                name: "DeepSeek_Prompt_Engineering_Guide.pdf",
                size: "2.2 MB",
                chunks: 90,
                status: "syncing",
            },
        ],
    },
];

const Courses = ({ onLaunchTool }) => {
    const [selectedCourse, setSelectedCourse] = useState(COURSES_DATA[0]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");

    const filteredCourses = COURSES_DATA.filter((course) => {
        const matchesQuery =
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.code.toLowerCase().includes(searchQuery.toLowerCase());
        if (activeFilter === "indexed") return matchesQuery && course.vectorStatus === "Indexed";
        if (activeFilter === "syncing") return matchesQuery && course.vectorStatus === "Syncing";
        return matchesQuery;
    });

    return (
        <div className="courses-tab-bounds">
            {/* Header Banner */}
            <div className="courses-header-banner">
                <div className="banner-left-meta">
                    <h2>Courseware & Knowledge Base</h2>
                    <span>
                        Manage syllabi, slide decks, lab rubrics, and RAG knowledge graphs per
                        module
                    </span>
                </div>
                <button type="button" className="btn-add-course">
                    <Plus size={14} />
                    <span>Enroll New Course</span>
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="courses-filter-bar">
                <div className="search-course-box">
                    <Search size={14} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by course code, lecture title, syllabus..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-pill-cluster">
                    <button
                        type="button"
                        className={`filter-pill ${activeFilter === "all" ? "active" : ""}`}
                        onClick={() => setActiveFilter("all")}
                    >
                        All ({COURSES_DATA.length})
                    </button>
                    <button
                        type="button"
                        className={`filter-pill ${activeFilter === "indexed" ? "active" : ""}`}
                        onClick={() => setActiveFilter("indexed")}
                    >
                        Vector Indexed
                    </button>
                    <button
                        type="button"
                        className={`filter-pill ${activeFilter === "syncing" ? "active" : ""}`}
                        onClick={() => setActiveFilter("syncing")}
                    >
                        Syncing
                    </button>
                </div>
            </div>

            {/* Two-Column Master / Detail Layout */}
            <div className="courses-split-grid">
                {/* Left Column: Course List */}
                <div className="courses-card-list">
                    {filteredCourses.map((c) => {
                        const isSelected = selectedCourse.id === c.id;
                        return (
                            <div
                                key={c.id}
                                className={`course-item-card ${isSelected ? "selected" : ""}`}
                                onClick={() => setSelectedCourse(c)}
                            >
                                <div className="card-top-row">
                                    <div className="course-code-badge">
                                        <GraduationCap size={13} />
                                        <span>{c.code}</span>
                                    </div>
                                    <span className={`status-pill ${c.vectorStatus.toLowerCase()}`}>
                                        {c.vectorStatus === "Indexed" ? (
                                            <CheckCircle2 size={11} />
                                        ) : (
                                            <Database size={11} />
                                        )}
                                        {c.vectorStatus}
                                    </span>
                                </div>

                                <strong className="course-title-text">{c.title}</strong>
                                <span className="course-inst-text">
                                    {c.instructor} · {c.semester}
                                </span>

                                <div className="card-bottom-row">
                                    <span className="file-count-meta">
                                        <FileText size={12} /> {c.docsCount} documents
                                    </span>
                                    <div className="progress-mini-bar">
                                        <div
                                            className="progress-mini-fill"
                                            style={{ width: `${c.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right Column: Selected Courseware & RAG Context */}
                <div className="course-detail-view">
                    <div className="detail-header-panel">
                        <div className="detail-lead-meta">
                            <div className="code-lead-tag">{selectedCourse.code}</div>
                            <div>
                                <h3>{selectedCourse.title}</h3>
                                <p>
                                    {selectedCourse.instructor} · {selectedCourse.semester}
                                </p>
                            </div>
                        </div>

                        {/* Quick AI Action Buttons */}
                        <div className="detail-actions-cluster">
                            <button
                                type="button"
                                className="btn-action-tool tutor"
                                onClick={() => onLaunchTool && onLaunchTool("tutor")}
                                title="Open Socratic Code Tutor for this module"
                            >
                                <Sparkles size={14} />
                                <span>Learn with Tutor</span>
                            </button>
                            <button
                                type="button"
                                className="btn-action-tool exam"
                                onClick={() => onLaunchTool && onLaunchTool("exam_prep")}
                                title="Generate adaptive practice drills"
                            >
                                <BookOpen size={14} />
                                <span>Practice Quizzes</span>
                            </button>
                        </div>
                    </div>

                    {/* Vector DB Engine Health */}
                    <div className="vector-metric-banner">
                        <div className="metric-col">
                            <span>Vector Store Engine</span>
                            <strong>Qdrant Cloud · 384 Chunks</strong>
                        </div>
                        <div className="metric-col">
                            <span>Retrieval Precision</span>
                            <strong className="high-rate">94.8% Cosine Match</strong>
                        </div>
                        <div className="metric-col">
                            <span>Knowledge Graph (GraphRAG)</span>
                            <strong>Neo4j Live Node Linking</strong>
                        </div>
                    </div>

                    {/* Syllabus Files Table */}
                    <div className="courseware-files-section">
                        <div className="files-section-header">
                            <strong>
                                Syllabus Materials & Handouts ({selectedCourse.syllabus.length})
                            </strong>
                            <button type="button" className="btn-upload-file">
                                <UploadCloud size={13} />
                                <span>Upload Slides / PDF</span>
                            </button>
                        </div>

                        <div className="syllabus-file-table">
                            <div className="table-header-row">
                                <span className="col-name">DOCUMENT NAME</span>
                                <span className="col-size">SIZE</span>
                                <span className="col-chunks">RAG CHUNKS</span>
                                <span className="col-status">STATUS</span>
                                <span className="col-actions"></span>
                            </div>

                            {selectedCourse.syllabus.map((file, idx) => (
                                <div key={idx} className="table-data-row">
                                    <div className="col-name file-primary-cell">
                                        <FileCheck size={14} className="file-icon" />
                                        <span>{file.name}</span>
                                    </div>
                                    <span className="col-size">{file.size}</span>
                                    <span className="col-chunks">
                                        <code>{file.chunks} chunks</code>
                                    </span>
                                    <span className="col-status">
                                        <span className={`file-badge ${file.status}`}>
                                            {file.status === "ready" ? "Indexed" : "Processing"}
                                        </span>
                                    </span>
                                    <div className="col-actions">
                                        <button type="button" className="btn-more-options">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Courses;
