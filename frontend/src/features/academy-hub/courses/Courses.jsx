import { useMemo, useRef, useState } from "react";
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
    Loader2,
    X,
} from "lucide-react";
import { courseApi, documentApi } from "@/api";
import DocumentTypeIcon from "@/components/document-icon/DocumentTypeIcon.jsx";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import "@/features/academy-hub/courses/Courses.css";
import { getSessionUser } from "@/lib/session";

const FILTERS = [
    { value: "all", label: "All" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Almost Done" },
];

const SEMESTER_OPTIONS = (() => {
    // Sinh danh sách học kỳ từ năm hiện tại
    const year = new Date().getFullYear();
    const options = [];
    for (let offset = 1; offset >= -1; offset -= 1) {
        ["Spring", "Summer", "Fall"].forEach((term) => {
            options.push({ value: `${term} ${year + offset}`, label: `${term} ${year + offset}` });
        });
    }
    return options.reverse();
})();

const Courses = ({ onLaunchTool }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");

    // Trạng thái Form Join Course
    const [isJoinOpen, setIsJoinOpen] = useState(false);
    const [joinForm, setJoinForm] = useState({
        code: "",
        title: "",
        semester: SEMESTER_OPTIONS[0]?.value || "",
        instructor: "",
        totalLessons: "",
    });
    const [joining, setJoining] = useState(false);

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // ------------------------------------------------------------------ load
    const {
        data: courses,
        setData: setCourses,
        loading,
    } = useAsyncData(
        () =>
            courseApi.list({
                ownerId: sessionUser.id,
                status: activeFilter === "all" ? undefined : activeFilter,
                search: searchQuery.trim() || undefined,
            }),
        [sessionUser?.id, activeFilter, searchQuery],
        {
            initialData: [],
            enabled: Boolean(sessionUser?.id),
            debounceMs: 300,
            onError: (err) => showToast(err.message || "Unable to load your courses.", "error"),
        },
    );

    const selectedCourse = useMemo(
        () => courses.find((course) => course.id === selectedCourseId) || courses[0] || null,
        [courses, selectedCourseId],
    );

    // -------------------------------------------------------------- actions
    const handleJoinCourse = async () => {
        if (!sessionUser?.id) {
            showToast("Sign in first to join a course.", "info");
            return;
        }
        if (!joinForm.code.trim() || !joinForm.title.trim()) {
            showToast("Course code and title are required.", "info");
            return;
        }
        try {
            setJoining(true);
            const created = await courseApi.join(sessionUser.id, {
                code: joinForm.code.trim(),
                title: joinForm.title.trim(),
                semester: joinForm.semester || null,
                instructor: joinForm.instructor.trim() || null,
                totalLessons: joinForm.totalLessons === "" ? null : Number(joinForm.totalLessons),
            });
            setCourses((prev) => [...prev, created]);
            setSelectedCourseId(created.id);
            setIsJoinOpen(false);
            setJoinForm({
                code: "",
                title: "",
                semester: SEMESTER_OPTIONS[0]?.value || "",
                instructor: "",
                totalLessons: "",
            });
            showToast("Course joined.", "success");
        } catch (err) {
            showToast(err.message || "Unable to join the course.", "error");
        } finally {
            setJoining(false);
        }
    };

    const handleUploadMaterial = async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        input.value = "";
        if (!file || !selectedCourse) return;

        try {
            setUploading(true);
            await courseApi.uploadMaterial(file, selectedCourse.workspaceId, selectedCourse.code);
            const refreshed = await courseApi.getById(selectedCourse.id);
            setCourses((prev) =>
                prev.map((course) => (course.id === refreshed.id ? refreshed : course)),
            );
            showToast(`Uploaded ${file.name}.`, "success");
        } catch (err) {
            showToast(err.message || "Unable to upload the material.", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (material) => {
        if (!material.downloadable) {
            showToast("This file has no stored copy to download.", "info");
            return;
        }
        try {
            const blob = await documentApi.getDownload(material.id);
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = material.name || material.filename || "course-material";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (error) {
            showToast(error.message || "Unable to download the material.", "error");
        }
    };

    const handlePreview = async (material) => {
        const previewWindow = window.open("about:blank", "_blank");
        if (!previewWindow) {
            showToast("Allow pop-ups to preview this material.", "info");
            return;
        }
        previewWindow.opener = null;
        try {
            const blob = await documentApi.getPreview(material.id);
            const objectUrl = URL.createObjectURL(blob);
            previewWindow.location.assign(objectUrl);
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        } catch (error) {
            previewWindow.close();
            showToast(error.message || "Unable to preview this material.", "error");
        }
    };

    const handleUpdateProgress = async () => {
        if (!selectedCourse) return;
        const nextCompleted = Math.min(
            (selectedCourse.completedLessons || 0) + 1,
            selectedCourse.totalLessons || 0,
        );
        if (nextCompleted === selectedCourse.completedLessons || !selectedCourse.totalLessons) {
            showToast("This course has no lessons left to complete.", "info");
            return;
        }
        try {
            const saved = await courseApi.update(selectedCourse.id, {
                completedLessons: nextCompleted,
            });
            setCourses((prev) => prev.map((course) => (course.id === saved.id ? saved : course)));
            showToast(`Progress updated to ${saved.progress}%.`, "success");
        } catch (err) {
            showToast(err.message || "Unable to update progress.", "error");
        }
    };

    const handleLeaveCourse = async () => {
        if (!selectedCourse) return;
        try {
            await courseApi.leave(selectedCourse.id);
            setCourses((prev) => prev.filter((course) => course.id !== selectedCourse.id));
            setSelectedCourseId(null);
            showToast("Course removed from your list.", "success");
        } catch (err) {
            showToast(err.message || "Unable to leave the course.", "error");
        }
    };

    const totalCount = activeFilter === "all" && !searchQuery.trim() ? courses.length : null;

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
                <button
                    type="button"
                    className="btn-add-course"
                    onClick={() => setIsJoinOpen((prev) => !prev)}
                >
                    <Plus size={14} />
                    <span>Join Course</span>
                </button>
            </div>

            {/* Form Join Course - Card độc lập, bố cục rõ ràng */}
            {isJoinOpen && (
                <div className="courses-join-panel">
                    <div className="join-panel-header">
                        <strong>Enroll in a New Course</strong>
                        <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => setIsJoinOpen(false)}
                            title="Close"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    <div className="join-form-grid">
                        <div className="join-field-group">
                            <label>Course Code *</label>
                            <input
                                type="text"
                                className="join-input-control"
                                placeholder="e.g. CS204"
                                value={joinForm.code}
                                onChange={(e) =>
                                    setJoinForm((f) => ({ ...f, code: e.target.value }))
                                }
                            />
                        </div>

                        <div className="join-field-group">
                            <label>Course Title *</label>
                            <input
                                type="text"
                                className="join-input-control"
                                placeholder="e.g. Data Structures & Algorithms"
                                value={joinForm.title}
                                onChange={(e) =>
                                    setJoinForm((f) => ({ ...f, title: e.target.value }))
                                }
                            />
                        </div>

                        <div className="join-field-group">
                            <label>Instructor</label>
                            <input
                                type="text"
                                className="join-input-control"
                                placeholder="e.g. Dr. Nguyen"
                                value={joinForm.instructor}
                                onChange={(e) =>
                                    setJoinForm((f) => ({ ...f, instructor: e.target.value }))
                                }
                            />
                        </div>

                        <div className="join-field-group">
                            <label>Lessons</label>
                            <input
                                type="number"
                                min="0"
                                className="join-input-control"
                                placeholder="Total"
                                value={joinForm.totalLessons}
                                onChange={(e) =>
                                    setJoinForm((f) => ({ ...f, totalLessons: e.target.value }))
                                }
                            />
                        </div>

                        <div className="join-field-group">
                            <label>Semester</label>
                            <CustomSelector
                                options={SEMESTER_OPTIONS}
                                value={joinForm.semester}
                                onChange={(value) =>
                                    setJoinForm((f) => ({ ...f, semester: value }))
                                }
                                placeholder="Semester"
                            />
                        </div>
                    </div>

                    <div className="join-panel-actions">
                        <button
                            type="button"
                            className="btn-join-cancel"
                            onClick={() => setIsJoinOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-join-save"
                            onClick={handleJoinCourse}
                            disabled={joining}
                        >
                            {joining ? (
                                <Loader2 size={13} className="ws-spinner" />
                            ) : (
                                <Plus size={13} />
                            )}
                            <span>Save Course</span>
                        </button>
                    </div>
                </div>
            )}

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
                    {loading && <Loader2 size={13} className="ws-spinner" />}
                </div>
                <div className="filter-pill-cluster">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            className={`filter-pill ${activeFilter === filter.value ? "active" : ""}`}
                            onClick={() => setActiveFilter(filter.value)}
                        >
                            {filter.label}
                            {filter.value === "all" && totalCount !== null
                                ? ` (${totalCount})`
                                : ""}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trạng thái chưa có khóa học */}
            {!loading && courses.length === 0 && (
                <div className="courses-empty-card">
                    <p>No courses yet. Use “Join Course” to add your first one.</p>
                </div>
            )}

            {/* 3. Split Grid Layout */}
            {courses.length > 0 && (
                <div className="courses-split-grid">
                    {/* Cột trái: Danh sách khóa học */}
                    <div className="courses-card-list">
                        {courses.map((c) => {
                            const isSelected = selectedCourse?.id === c.id;
                            return (
                                <div
                                    key={c.id}
                                    className={`course-item-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => setSelectedCourseId(c.id)}
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
                    {selectedCourse && (
                        <div className="course-detail-view">
                            <div className="detail-header-panel">
                                <div className="detail-lead-meta">
                                    <div className="code-lead-tag">{selectedCourse.code}</div>
                                    <div>
                                        <h3>{selectedCourse.title}</h3>
                                        <p>
                                            Instructor: {selectedCourse.instructor || "—"} •{" "}
                                            {selectedCourse.semester || "—"}
                                        </p>
                                    </div>
                                </div>

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

                            {/* Thẻ thống kê học tập */}
                            <div className="course-summary-cards">
                                <div className="summary-card">
                                    <div className="summary-icon blue">
                                        <FileText size={18} />
                                    </div>
                                    <div className="summary-data">
                                        <span>Course Materials</span>
                                        <strong>{selectedCourse.docsCount} Files Ready</strong>
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
                                        <strong>
                                            {selectedCourse.status === "completed"
                                                ? "Almost Done"
                                                : selectedCourse.progress > 0
                                                  ? "On Track"
                                                  : "Not Started"}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                            {/* Danh sách bài giảng & bài tập */}
                            <div className="courseware-files-section">
                                <div className="files-section-header">
                                    <strong>
                                        Study Materials & Slides (
                                        {selectedCourse.materials?.length || 0})
                                    </strong>
                                    <button
                                        type="button"
                                        className="btn-upload-file"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                    >
                                        {uploading ? (
                                            <Loader2 size={13} className="ws-spinner" />
                                        ) : (
                                            <UploadCloud size={13} />
                                        )}
                                        <span>Upload Material</span>
                                    </button>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    hidden
                                    accept=".pdf,.txt,.md,.markdown,.rst,.log,.json,.csv"
                                    onChange={handleUploadMaterial}
                                />

                                {!selectedCourse.materials ||
                                selectedCourse.materials.length === 0 ? (
                                    <p className="no-materials-text">
                                        No materials uploaded for this course yet.
                                    </p>
                                ) : (
                                    <div className="syllabus-file-table">
                                        <div className="table-header-row">
                                            <span className="col-name">DOCUMENT TITLE</span>
                                            <span className="col-size">SIZE</span>
                                            <span className="col-date">DATE ADDED</span>
                                            <span className="col-actions">ACTIONS</span>
                                        </div>

                                        {selectedCourse.materials.map((file) => (
                                            <div key={file.id} className="table-data-row">
                                                <div className="col-name file-primary-cell">
                                                    <div className="file-badge-icon">
                                                        <DocumentTypeIcon
                                                            ext={(file.fileType || file.name || "")
                                                                .toLowerCase()
                                                                .split(".")
                                                                .pop()}
                                                            size={20}
                                                        />
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
                                                        onClick={() => handleDownload(file)}
                                                    >
                                                        <Download size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-table-action"
                                                        title="Preview"
                                                        disabled={!file.downloadable}
                                                        onClick={() => handlePreview(file)}
                                                    >
                                                        <MoreHorizontal size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cập nhật tiến độ & Rời khóa */}
                            <div className="detail-footer-actions">
                                <button
                                    type="button"
                                    className="btn-action-tool tutor"
                                    onClick={handleUpdateProgress}
                                >
                                    <CheckCircle size={14} />
                                    <span>Mark 1 lesson done</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-action-tool exam"
                                    onClick={handleLeaveCourse}
                                >
                                    <X size={14} />
                                    <span>Leave course</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Courses;
