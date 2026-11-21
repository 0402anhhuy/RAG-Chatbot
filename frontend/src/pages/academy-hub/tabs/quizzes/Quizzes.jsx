import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    BookOpen,
    CheckCircle2,
    HelpCircle,
    Play,
    Plus,
    RotateCcw,
    Search,
    Sparkles,
    Timer,
    XCircle,
    Loader2,
    Trash2,
} from "lucide-react";
import { quizApi } from "../../../../api";
import CustomSelector from "../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../context/ToastContext";
import "./Quizzes.css";

const FILTERS = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "new", label: "Unattempted" },
];

const DIFFICULTY_OPTIONS = [
    { value: "EASY", label: "Easy" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HARD", label: "Hard" },
];

// Bộ câu hỏi mẫu dùng để TẠO đề mới — người dùng sửa lại nội dung trong form.
const BLANK_QUESTION = {
    prompt: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    ragSource: "",
};

const getSessionUser = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem("rag_session") || "{}");
        return parsed?.user || parsed || {};
    } catch {
        return {};
    }
};

const Quizzes = ({ onLaunchTool }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [quizzes, setQuizzes] = useState([]);
    const [stats, setStats] = useState(null);
    const [selectedQuizId, setSelectedQuizId] = useState(null);
    const [searchFilter, setSearchFilter] = useState("");
    const [activeTabFilter, setActiveTabFilter] = useState("all");
    const [loading, setLoading] = useState(false);

    const [selectedOption, setSelectedOption] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [busyAction, setBusyAction] = useState(null);

    // Form tạo đề
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        title: "",
        courseCode: "",
        difficulty: "MEDIUM",
        timeMinutes: 15,
    });
    const [createQuestions, setCreateQuestions] = useState([{ ...BLANK_QUESTION }]);
    const [creating, setCreating] = useState(false);

    const messagesEndRef = useRef(null);

    const selectedQuiz = useMemo(
        () => quizzes.find((quiz) => quiz.id === selectedQuizId) || quizzes[0] || null,
        [quizzes, selectedQuizId],
    );

    // ------------------------------------------------------------------ load
    const loadQuizzes = useCallback(
        async (signal) => {
            if (!sessionUser?.id) {
                setQuizzes([]);
                setStats(null);
                return;
            }
            try {
                setLoading(true);
                const status =
                    activeTabFilter === "all" ? undefined : activeTabFilter.toUpperCase();
                const [list, summary] = await Promise.all([
                    quizApi.list({
                        ownerId: sessionUser.id,
                        userId: sessionUser.id,
                        status,
                        search: searchFilter.trim() || undefined,
                    }),
                    quizApi.stats({ ownerId: sessionUser.id, userId: sessionUser.id }),
                ]);
                if (signal?.cancelled) return;
                setQuizzes(list || []);
                setStats(summary);
            } catch (err) {
                if (signal?.cancelled) return;
                setQuizzes([]);
                setStats(null);
                showToast(err.message || "Unable to load quizzes.", "error");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [sessionUser?.id, activeTabFilter, searchFilter, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        // Debounce để không gọi API mỗi ký tự gõ vào ô tìm kiếm.
        const timer = setTimeout(() => loadQuizzes(signal), 300);
        return () => {
            signal.cancelled = true;
            clearTimeout(timer);
        };
    }, [loadQuizzes]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedQuizId]);

    const selectQuiz = (quiz) => {
        setSelectedQuizId(quiz.id);
        setSelectedOption(null);
        setShowExplanation(false);
    };

    // --------------------------------------------------------------- actions
    const handleVerifyAnswer = () => {
        if (selectedOption === null) return;
        setShowExplanation(true);
        const correct = selectedQuiz?.sampleQuestion?.correct;
        if (selectedOption === correct) {
            showToast("Correct answer.", "success");
        } else {
            showToast("Not quite — review the rationale below.", "info");
        }
    };

    const handleStartAssessment = async () => {
        if (!selectedQuiz || !sessionUser?.id) return;
        try {
            setBusyAction("start");
            const updated = await quizApi.startAttempt(selectedQuiz.id, sessionUser.id);
            setQuizzes((prev) => prev.map((quiz) => (quiz.id === updated.id ? updated : quiz)));
            showToast("Assessment started.", "success");
        } catch (err) {
            showToast(err.message || "Unable to start the assessment.", "error");
        } finally {
            setBusyAction(null);
        }
    };

    // Chấm câu hỏi mẫu và nộp luôn nếu đề chỉ có 1 câu; đề nhiều câu thì ghi nhận
    // lượt làm mở để trạng thái chuyển "In Progress" một cách thật.
    const handleSubmitSample = async () => {
        if (!selectedQuiz || !sessionUser?.id) return;
        try {
            setBusyAction("submit");
            const total = selectedQuiz.totalQuestions || 1;
            if (total === 1) {
                const updated = await quizApi.submitAttempt(selectedQuiz.id, sessionUser.id, {
                    correctCount: selectedOption === selectedQuiz.sampleQuestion?.correct ? 1 : 0,
                    questionCount: 1,
                });
                setQuizzes((prev) => prev.map((quiz) => (quiz.id === updated.id ? updated : quiz)));
                showToast("Assessment submitted.", "success");
            } else {
                const updated = await quizApi.startAttempt(selectedQuiz.id, sessionUser.id);
                setQuizzes((prev) => prev.map((quiz) => (quiz.id === updated.id ? updated : quiz)));
                showToast(
                    `Answer recorded. ${total} questions left in the full assessment.`,
                    "info",
                );
            }
        } catch (err) {
            showToast(err.message || "Unable to record the answer.", "error");
        } finally {
            setBusyAction(null);
        }
    };

    const handleDeleteQuiz = async () => {
        if (!selectedQuiz) return;
        try {
            setBusyAction("delete");
            await quizApi.remove(selectedQuiz.id);
            setQuizzes((prev) => prev.filter((quiz) => quiz.id !== selectedQuiz.id));
            setSelectedQuizId(null);
            showToast("Quiz deleted.", "success");
        } catch (err) {
            showToast(err.message || "Unable to delete the quiz.", "error");
        } finally {
            setBusyAction(null);
        }
    };

    const updateQuestion = (index, changes) => {
        setCreateQuestions((prev) =>
            prev.map((question, qIndex) =>
                qIndex === index ? { ...question, ...changes } : question,
            ),
        );
    };

    const updateOption = (questionIndex, optionIndex, value) => {
        setCreateQuestions((prev) =>
            prev.map((question, qIndex) =>
                qIndex === questionIndex
                    ? {
                          ...question,
                          options: question.options.map((option, oIndex) =>
                              oIndex === optionIndex ? value : option,
                          ),
                      }
                    : question,
            ),
        );
    };

    const handleCreateQuiz = async () => {
        if (!sessionUser?.id) {
            showToast("Sign in first to create a quiz.", "info");
            return;
        }
        if (!createForm.title.trim()) {
            showToast("Quiz title is required.", "info");
            return;
        }
        const questions = createQuestions
            .map((question) => ({
                prompt: question.prompt.trim(),
                options: question.options.map((option) => option.trim()).filter(Boolean),
                correctIndex: question.correctIndex,
                explanation: question.explanation.trim() || null,
                ragSource: question.ragSource.trim() || null,
            }))
            .filter((question) => question.prompt && question.options.length >= 2);

        if (!questions.length) {
            showToast("Add at least one question with 2+ options.", "info");
            return;
        }

        try {
            setCreating(true);
            const created = await quizApi.create(sessionUser.id, {
                title: createForm.title.trim(),
                courseCode: createForm.courseCode.trim() || null,
                difficulty: createForm.difficulty,
                timeMinutes: Number(createForm.timeMinutes) || 0,
                questions,
            });
            setQuizzes((prev) => [created, ...prev]);
            setSelectedQuizId(created.id);
            setIsCreateOpen(false);
            setCreateForm({ title: "", courseCode: "", difficulty: "MEDIUM", timeMinutes: 15 });
            setCreateQuestions([{ ...BLANK_QUESTION }]);
            showToast("Quiz created.", "success");
        } catch (err) {
            showToast(err.message || "Unable to create the quiz.", "error");
        } finally {
            setCreating(false);
        }
    };

    // ---------------------------------------------------------------- render
    const totalCount =
        activeTabFilter === "all" && !searchFilter.trim() ? stats?.totalQuizzes : null;

    return (
        <div className="quizzes-tab-bounds">
            {/* Header Banner */}
            <div className="quizzes-header-banner">
                <div className="quizzes-lead-title">
                    <h2>Assessments & Knowledge Drills</h2>
                    <span>
                        Adaptive mock assessments and practice question banks dynamically
                        synthesized via AI RAG
                    </span>
                </div>
                <button
                    type="button"
                    className="btn-create-quiz"
                    onClick={() => setIsCreateOpen((prev) => !prev)}
                >
                    <Sparkles size={14} />
                    <span>Create AI Assessment</span>
                </button>
            </div>

            {/* Quick Metrics Bar — số liệu thật từ /quizzes/stats */}
            <div className="quizzes-stats-row">
                <div className="stat-pill-box">
                    <span className="stat-label">Completed Assessments</span>
                    <strong className="stat-val">
                        {stats ? `${stats.completedAssessments} Quizzes` : "—"}
                    </strong>
                </div>
                <div className="stat-pill-box">
                    <span className="stat-label">Average Mastery Score</span>
                    <strong className="stat-val green">
                        {stats?.averageScore !== null && stats?.averageScore !== undefined
                            ? `${stats.averageScore}%`
                            : "—"}
                    </strong>
                </div>
                <div className="stat-pill-box">
                    <span className="stat-label">Reviewed RAG Questions</span>
                    <strong className="stat-val">
                        {stats ? `${stats.reviewedQuestions} items` : "—"}
                    </strong>
                </div>
                <div className="stat-pill-box">
                    <span className="stat-label">Algorithmic Precision</span>
                    <strong className="stat-val blue">
                        {stats?.algorithmicPrecision !== null &&
                        stats?.algorithmicPrecision !== undefined
                            ? `${stats.algorithmicPrecision}%`
                            : "—"}
                    </strong>
                </div>
            </div>

            {/* Form tạo đề (dùng lại class sẵn có) */}
            {isCreateOpen && (
                <div className="quizzes-controls-row">
                    <div className="search-quiz-input">
                        <Sparkles size={14} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Quiz title"
                            value={createForm.title}
                            onChange={(e) =>
                                setCreateForm((f) => ({ ...f, title: e.target.value }))
                            }
                        />
                    </div>
                    <div className="search-quiz-input">
                        <BookOpen size={14} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Course code (e.g. CS204)"
                            value={createForm.courseCode}
                            onChange={(e) =>
                                setCreateForm((f) => ({ ...f, courseCode: e.target.value }))
                            }
                        />
                    </div>
                    <div className="filters-cluster">
                        <CustomSelector
                            options={DIFFICULTY_OPTIONS}
                            value={createForm.difficulty}
                            onChange={(value) =>
                                setCreateForm((f) => ({ ...f, difficulty: value }))
                            }
                            placeholder="Difficulty"
                            className="quiz-difficulty-selector"
                        />
                        <button
                            type="button"
                            className="filter-btn"
                            onClick={() =>
                                setCreateQuestions((prev) => [...prev, { ...BLANK_QUESTION }])
                            }
                        >
                            <Plus size={13} /> Add question
                        </button>
                        <button
                            type="button"
                            className="btn-create-quiz"
                            onClick={handleCreateQuiz}
                            disabled={creating}
                        >
                            {creating ? <Loader2 size={14} /> : <Plus size={14} />}
                            <span>Save quiz</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Danh sách câu hỏi để nhập khi tạo đề */}
            {isCreateOpen &&
                createQuestions.map((question, qIndex) => (
                    <div className="sample-question-surface" key={`new-q-${qIndex}`}>
                        <div className="question-index-tag">
                            <span>NEW QUESTION {qIndex + 1}</span>
                        </div>
                        <input
                            type="text"
                            className="input-settings-pill"
                            placeholder="Question text"
                            value={question.prompt}
                            onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                        />
                        <div className="options-selection-group">
                            {question.options.map((option, oIndex) => (
                                <button
                                    key={`opt-${qIndex}-${oIndex}`}
                                    type="button"
                                    className={`option-answer-btn ${
                                        question.correctIndex === oIndex ? "correct-choice" : ""
                                    }`}
                                    onClick={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                                    title="Click to mark as the correct answer"
                                >
                                    <span className="option-letter">
                                        {String.fromCharCode(65 + oIndex)}
                                    </span>
                                    <span className="option-text">
                                        <input
                                            type="text"
                                            placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                            value={option}
                                            onChange={(e) =>
                                                updateOption(qIndex, oIndex, e.target.value)
                                            }
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="question-action-bar">
                            <input
                                type="text"
                                className="input-settings-pill"
                                placeholder="Source (e.g. Lecture_04.pdf, page 18)"
                                value={question.ragSource}
                                onChange={(e) =>
                                    updateQuestion(qIndex, { ragSource: e.target.value })
                                }
                            />
                        </div>
                    </div>
                ))}

            {/* Search & Filter Nav */}
            <div className="quizzes-controls-row">
                <div className="search-quiz-input">
                    <Search size={14} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search assessment by title, course code..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                    />
                    {loading && <Loader2 size={13} />}
                </div>
                <div className="filters-cluster">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            className={`filter-btn ${activeTabFilter === filter.value ? "active" : ""}`}
                            onClick={() => setActiveTabFilter(filter.value)}
                        >
                            {filter.label}
                            {filter.value === "all" && totalCount !== null
                                ? ` (${totalCount})`
                                : ""}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chưa có đề nào */}
            {!loading && quizzes.length === 0 && (
                <div className="quizzes-cards-column">
                    <p>No assessments yet. Use “Create AI Assessment” to add your first one.</p>
                </div>
            )}

            {/* Master - Detail Split Layout */}
            {quizzes.length > 0 && (
                <div className="quizzes-layout-grid">
                    {/* Left Column: Assessment List */}
                    <div className="quizzes-cards-column">
                        {quizzes.map((quiz) => {
                            const isSelected = selectedQuiz?.id === quiz.id;
                            const status =
                                quiz.status === "COMPLETED"
                                    ? "Completed"
                                    : quiz.status === "IN_PROGRESS"
                                      ? "In Progress"
                                      : "New";
                            return (
                                <div
                                    key={quiz.id}
                                    className={`quiz-entry-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => selectQuiz(quiz)}
                                >
                                    <div className="quiz-card-head">
                                        <span className="course-tag">{quiz.courseCode || "—"}</span>
                                        <span className={`difficulty-badge ${quiz.difficulty}`}>
                                            {quiz.difficulty.charAt(0).toUpperCase() +
                                                quiz.difficulty.slice(1)}
                                        </span>
                                    </div>

                                    <strong className="quiz-name">{quiz.title}</strong>

                                    <div className="quiz-meta-info">
                                        <span>
                                            <HelpCircle size={12} /> {quiz.totalQuestions} questions
                                        </span>
                                        <span>
                                            <Timer size={12} /> {quiz.timeMinutes} mins
                                        </span>
                                    </div>

                                    <div className="quiz-card-foot">
                                        <span className="last-attempt">
                                            Last attempt: {quiz.lastAttempt}
                                        </span>
                                        {quiz.status === "COMPLETED" ? (
                                            <span className="quiz-score-tag">
                                                Score: {quiz.score}
                                            </span>
                                        ) : (
                                            <span className="quiz-status-tag">{status}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Column: Interactive Drill Sample Preview */}
                    {selectedQuiz && (
                        <div className="quiz-preview-panel">
                            <div className="preview-top-banner">
                                <div className="preview-heading">
                                    <span className="preview-course-sub">
                                        {selectedQuiz.courseCode || "—"} ·{" "}
                                        {selectedQuiz.courseTitle || "—"}
                                    </span>
                                    <h3>{selectedQuiz.title}</h3>
                                </div>
                                <div className="filters-cluster">
                                    <button
                                        type="button"
                                        className="filter-btn"
                                        onClick={handleDeleteQuiz}
                                        disabled={busyAction === "delete"}
                                        title="Delete quiz"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-start-drill"
                                        onClick={() => {
                                            // Mở workspace luyện thi để làm full assessment;
                                            // đồng thời ghi nhận lượt làm để trạng thái chuyển
                                            // sang "In Progress" thật trong DB.
                                            onLaunchTool?.("exam_prep");
                                            handleStartAssessment();
                                        }}
                                        disabled={busyAction === "start"}
                                    >
                                        {busyAction === "start" ? (
                                            <Loader2 size={13} />
                                        ) : (
                                            <Play size={13} fill="#ffffff" />
                                        )}
                                        <span>Start Full Assessment</span>
                                    </button>
                                </div>
                            </div>

                            {selectedQuiz.sampleQuestion ? (
                                <div className="sample-question-surface">
                                    <div className="question-index-tag">
                                        <span>
                                            SAMPLE QUESTION PREVIEW (1 /{" "}
                                            {selectedQuiz.totalQuestions})
                                        </span>
                                        <span className="source-rag-ref">
                                            <BookOpen size={12} /> Source:{" "}
                                            {selectedQuiz.sampleQuestion.ragSource || "—"}
                                        </span>
                                    </div>

                                    <p className="question-body-text">
                                        {selectedQuiz.sampleQuestion.text}
                                    </p>

                                    <div className="options-selection-group">
                                        {selectedQuiz.sampleQuestion.options.map((option, idx) => {
                                            const isPicked = selectedOption === idx;
                                            const isCorrect =
                                                idx === selectedQuiz.sampleQuestion.correct;
                                            let optionClass = "";
                                            if (showExplanation) {
                                                if (isCorrect) optionClass = "correct-choice";
                                                else if (isPicked) optionClass = "wrong-choice";
                                            } else if (isPicked) {
                                                optionClass = "selected-choice";
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className={`option-answer-btn ${optionClass}`}
                                                    onClick={() => {
                                                        if (!showExplanation)
                                                            setSelectedOption(idx);
                                                    }}
                                                >
                                                    <span className="option-letter">
                                                        {String.fromCharCode(65 + idx)}
                                                    </span>
                                                    <span className="option-text">{option}</span>
                                                    {showExplanation && isCorrect && (
                                                        <CheckCircle2
                                                            size={16}
                                                            className="state-icon green"
                                                        />
                                                    )}
                                                    {showExplanation && isPicked && !isCorrect && (
                                                        <XCircle
                                                            size={16}
                                                            className="state-icon red"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="question-action-bar">
                                        {!showExplanation ? (
                                            <button
                                                type="button"
                                                disabled={
                                                    selectedOption === null ||
                                                    busyAction === "submit"
                                                }
                                                className="btn-check-answer"
                                                onClick={async () => {
                                                    handleVerifyAnswer();
                                                    await handleSubmitSample();
                                                }}
                                            >
                                                Verify Answer & View AI Rationale
                                            </button>
                                        ) : (
                                            <div className="explanation-reveal-box">
                                                <div className="explanation-title">
                                                    <Sparkles size={14} color="#059669" />
                                                    <strong>
                                                        Curriculum Analysis & RAG Context:
                                                    </strong>
                                                </div>
                                                <p>
                                                    The correct answer is{" "}
                                                    <strong>
                                                        {String.fromCharCode(
                                                            65 +
                                                                (selectedQuiz.sampleQuestion
                                                                    ?.correct ?? 0),
                                                        )}
                                                    </strong>
                                                    .{" "}
                                                    {selectedQuiz.sampleQuestion?.explanation ||
                                                        (selectedQuiz.sampleQuestion?.ragSource
                                                            ? `See ${selectedQuiz.sampleQuestion.ragSource}.`
                                                            : "No explanation was provided for this question.")}
                                                </p>
                                                <button
                                                    type="button"
                                                    className="btn-retry-sample"
                                                    onClick={() => {
                                                        setShowExplanation(false);
                                                        setSelectedOption(null);
                                                    }}
                                                >
                                                    <RotateCcw size={12} /> Retry Question
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="sample-question-surface">
                                    <p className="question-body-text">
                                        This assessment has no questions yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default Quizzes;
