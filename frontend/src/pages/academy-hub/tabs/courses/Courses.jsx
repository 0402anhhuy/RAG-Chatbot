import { useState } from "react";
import {
    BookOpen,
    Download,
    FileText,
    GraduationCap,
    MoreHorizontal,
    Plus,
    Search,
    Sparkles,
    UploadCloud,
    CheckCircle,
    Clock,
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
        progress: 75,
        completedLessons: 9,
        totalLessons: 12,
        syllabus: [
            {
                name: "Lecture_01_Divide_Conquer.pdf",
                size: "2.4 MB",
                uploadedAt: "Sep 20, 2026",
                status: "ready",
            },
            {
                name: "Lecture_04_Dynamic_Programming.pdf",
                size: "3.8 MB",
                uploadedAt: "Sep 25, 2026",
                status: "ready",
            },
            {
                name: "Lab_03_Graph_Dijkstra_Spec.pdf",
                size: "1.1 MB",
                uploadedAt: "Sep 28, 2026",
                status: "ready",
            },
        ],
    },
    {
        id: "se301",
        code: "SE301",
        title: "Software Architecture & Design Patterns",
        semester: "Fall 2026",
        instructor: "MSc. Tran Thi B",
        docsCount: 18,
        progress: 60,
        completedLessons: 6,
        totalLessons: 10,
        syllabus: [
            {
                name: "Syllabus_SE301_Courseware.pdf",
                size: "850 KB",
                uploadedAt: "Sep 15, 2026",
                status: "ready",
            },
            {
                name: "Chapter_05_Microservices_EventDriven.pdf",
                size: "4.2 MB",
                uploadedAt: "Sep 22, 2026",
                status: "ready",
            },
            {
                name: "Clean_Architecture_Handbook.pdf",
                size: "5.6 MB",
                uploadedAt: "Sep 26, 2026",
                status: "ready",
            },
        ],
    },
    {
        id: "ai402",
        code: "AI402",
        title: "Artificial Intelligence & Natural Language Processing",
        semester: "Fall 2026",
        instructor: "Dr. Le Hoang C",
        docsCount: 12,
        progress: 90,
        completedLessons: 9,
        totalLessons: 10,
        syllabus: [
            {
                name: "Graph_Knowledge_Overview.pdf",
                size: "3.1 MB",
                uploadedAt: "Sep 18, 2026",
                status: "ready",
            },
            {
                name: "Deep_Learning_NLP_Guide.pdf",
                size: "2.2 MB",
                uploadedAt: "Sep 27, 2026",
                status: "ready",
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
        if (activeFilter === "completed") return matchesQuery && course.progress >= 80;
        if (activeFilter === "in_progress") return matchesQuery && course.progress < 80;
        return matchesQuery;
    });

    return (
        <div className="courses-tab-bounds">
            {/* 1. Header Banner */}
            <div className="courses-header-banner">
                <div className="banner-left-meta">
                    <h2>My Enrolled Courses</h2>
                    <span>
                        Access lecture materials, track semester progress, and study with your AI
                        Tutor
                    </span>
                </div>
                <button type="button" className="btn-add-course">
                    <Plus size={14} />
                    <span>Join Course</span>
                </button>
            </div>

            {/* 2. Filter & Search Bar */}
            <div className="courses-filter-bar">
                <div className="search-course-box">
                    <Search size={14} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search courses or topics..."
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
                        className={`filter-pill ${activeFilter === "in_progress" ? "active" : ""}`}
                        onClick={() => setActiveFilter("in_progress")}
                    >
                        In Progress
                    </button>
                    <button
                        type="button"
                        className={`filter-pill ${activeFilter === "completed" ? "active" : ""}`}
                        onClick={() => setActiveFilter("completed")}
                    >
                        Almost Done
                    </button>
                </div>
            </div>

            {/* 3. Split Grid Layout */}
            <div className="courses-split-grid">
                {/* Cột trái: Danh sách khóa học */}
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
                                    <span className="course-semester-tag">{c.semester}</span>
                                </div>

                                <strong className="course-title-text">{c.title}</strong>
                                <span className="course-inst-text">{c.instructor}</span>

                                <div className="card-bottom-row">
                                    <span className="file-count-meta">
                                        <FileText size={12} /> {c.docsCount} materials
                                    </span>
                                    <div className="progress-info-group">
                                        <span className="progress-text">{c.progress}%</span>
                                        <div className="progress-mini-bar">
                                            <div
                                                className="progress-mini-fill"
                                                style={{ width: `${c.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Cột phải: Chi tiết khóa học & Tài liệu học tập */}
                <div className="course-detail-view">
                    <div className="detail-header-panel">
                        <div className="detail-lead-meta">
                            <div className="code-lead-tag">{selectedCourse.code}</div>
                            <div>
                                <h3>{selectedCourse.title}</h3>
                                <p>
                                    Instructor: {selectedCourse.instructor} •{" "}
                                    {selectedCourse.semester}
                                </p>
                            </div>
                        </div>

                        {/* Nút tác vụ học tập */}
                        <div className="detail-actions-cluster">
                            <button
                                type="button"
                                className="btn-action-tool tutor"
                                onClick={() => onLaunchTool && onLaunchTool("tutor")}
                                title="Chat with AI Tutor on this course"
                            >
                                <Sparkles size={14} />
                                <span>Ask Tutor</span>
                            </button>
                            <button
                                type="button"
                                className="btn-action-tool exam"
                                onClick={() => onLaunchTool && onLaunchTool("exam_prep")}
                                title="Practice with quizzes"
                            >
                                <BookOpen size={14} />
                                <span>Practice Exam</span>
                            </button>
                        </div>
                    </div>

                    {/* Thẻ thống kê học tập thân thiện */}
                    <div className="course-summary-cards">
                        <div className="summary-card">
                            <div className="summary-icon blue">
                                <FileText size={18} />
                            </div>
                            <div className="summary-data">
                                <span>Course Materials</span>
                                <strong>{selectedCourse.syllabus.length} Files Ready</strong>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-icon green">
                                <CheckCircle size={18} />
                            </div>
                            <div className="summary-data">
                                <span>Completed Modules</span>
                                <strong>
                                    {selectedCourse.completedLessons} /{" "}
                                    {selectedCourse.totalLessons} Lessons
                                </strong>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-icon amber">
                                <Clock size={18} />
                            </div>
                            <div className="summary-data">
                                <span>Semester Status</span>
                                <strong>On Track</strong>
                            </div>
                        </div>
                    </div>

                    {/* Bảng danh sách bài giảng & bài tập */}
                    <div className="courseware-files-section">
                        <div className="files-section-header">
                            <strong>
                                Study Materials & Slides ({selectedCourse.syllabus.length})
                            </strong>
                            <button type="button" className="btn-upload-file">
                                <UploadCloud size={13} />
                                <span>Upload Material</span>
                            </button>
                        </div>

                        <div className="syllabus-file-table">
                            <div className="table-header-row">
                                <span className="col-name">DOCUMENT TITLE</span>
                                <span className="col-size">SIZE</span>
                                <span className="col-date">DATE ADDED</span>
                                <span className="col-actions">ACTIONS</span>
                            </div>

                            {selectedCourse.syllabus.map((file, idx) => (
                                <div key={idx} className="table-data-row">
                                    <div className="col-name file-primary-cell">
                                        <div className="file-badge-icon">
                                            <FileText size={14} />
                                        </div>
                                        <span>{file.name}</span>
                                    </div>
                                    <span className="col-size">{file.size}</span>
                                    <span className="col-date">{file.uploadedAt}</span>
                                    <div className="col-actions file-action-buttons">
                                        <button
                                            type="button"
                                            className="btn-table-action"
                                            title="Download"
                                        >
                                            <Download size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-table-action"
                                            title="Options"
                                        >
                                            <MoreHorizontal size={13} />
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
