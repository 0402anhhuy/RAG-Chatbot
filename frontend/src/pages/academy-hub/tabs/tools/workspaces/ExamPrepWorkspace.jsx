import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { academyToolApi } from "../../../../../api";
import CustomSelector from "../../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../../context/ToastContext";
import "./EduWorkspaces.css";

const getSessionUser = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem("rag_session") || "{}");
        return parsed?.user || parsed || {};
    } catch {
        return {};
    }
};

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

/**
 * Sinh đề luyện thi từ câu hỏi có thật trong tài liệu. Đề được lưu vào bảng
 * quizzes nên làm được ngay ở tab Quizzes — không phải bản xem trước giả.
 */
export const ExamPrepWorkspace = ({ onBackToHub }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [sources, setSources] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState("");
    const [topic, setTopic] = useState("");
    const [difficulty, setDifficulty] = useState("Medium");
    const [questionCount, setQuestionCount] = useState(10);
    const [loadingContext, setLoadingContext] = useState(true);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);

    const loadContext = useCallback(
        async (signal) => {
            if (!sessionUser?.id) {
                setLoadingContext(false);
                return;
            }
            try {
                setLoadingContext(true);
                const context = await academyToolApi.context(sessionUser.id, "exam_prep");
                if (signal?.cancelled) return;
                setSources(context?.sources || []);
                setSelectedDocId((prev) => prev || context?.sources?.[0]?.id || "");
            } catch (err) {
                if (signal?.cancelled) return;
                showToast(err.message || "Unable to load your course material.", "error");
            } finally {
                if (!signal?.cancelled) setLoadingContext(false);
            }
        },
        [sessionUser?.id, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadContext(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadContext]);

    const generate = async () => {
        if (!sessionUser?.id) {
            showToast("Please sign in again to generate a drill.", "error");
            return;
        }
        try {
            setRunning(true);
            setResult(null);
            const response = await academyToolApi.run(sessionUser.id, "exam_prep", {
                documentIds: selectedDocId ? [selectedDocId] : [],
                topic: topic.trim() || undefined,
                difficulty: difficulty.toLowerCase(),
                questionCount,
            });
            setResult(response);
            if (response?.quizId) {
                showToast(`Drill ready: ${response.quizTitle}`, "success");
            } else {
                showToast(response?.summary || "No questions found in the source.", "warning");
            }
        } catch (err) {
            showToast(err.message || "Could not generate the drill.", "error");
        } finally {
            setRunning(false);
        }
    };

    const selectedSource = sources.find((source) => source.id === selectedDocId);
    const canGenerate = !running && sources.length > 0 && !loadingContext;

    return (
        <div className="edu-workspace-root">
            <header className="workspace-header-bar">
                <button type="button" className="btn-back-hub" onClick={onBackToHub}>
                    <ArrowLeft size={14} /> Back to Edu Tools
                </button>
                <div className="workspace-meta-tag">
                    <span className="badge-socratic amber">ADAPTIVE DRILL</span>
                    <strong>Exam &amp; Quiz Prep</strong>
                </div>
            </header>

            <div className="workspace-double-pane">
                {/* Cấu hình */}
                <div className="workspace-config-sidebar">
                    <h3>Quiz Generation Settings</h3>

                    <div className="config-form-unit">
                        <label>Target Course Material</label>
                        {loadingContext ? (
                            <span className="ws-inline-note">
                                <Loader2 size={12} className="ws-spinner" /> Loading sources...
                            </span>
                        ) : sources.length === 0 ? (
                            <span className="ws-inline-note">
                                No documents yet — upload material in Documents first.
                            </span>
                        ) : (
                            <CustomSelector
                                options={sources.map((source) => ({
                                    value: source.id,
                                    label: `${source.name}${source.ready ? "" : " (indexing)"}`,
                                }))}
                                value={selectedDocId}
                                onChange={(value) => setSelectedDocId(value)}
                                placeholder="Choose material..."
                            />
                        )}
                    </div>

                    <div className="config-form-unit">
                        <label>Target Concepts / Chapter</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(event) => setTopic(event.target.value)}
                            placeholder="e.g. Dynamic Programming"
                        />
                    </div>

                    <div className="config-form-unit">
                        <label>Difficulty Level</label>
                        <div className="difficulty-pills">
                            {DIFFICULTIES.map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    className={`pill-btn ${difficulty === level ? "active" : ""}`}
                                    onClick={() => setDifficulty(level)}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="config-form-unit">
                        <label>
                            Number of Questions: <strong>{questionCount}</strong>
                        </label>
                        <input
                            type="range"
                            min="5"
                            max="25"
                            value={questionCount}
                            onChange={(event) => setQuestionCount(Number(event.target.value))}
                        />
                    </div>

                    <button
                        type="button"
                        className="btn-primary-generate"
                        onClick={generate}
                        disabled={!canGenerate}
                    >
                        {running ? (
                            <Loader2 size={14} className="ws-spinner" />
                        ) : (
                            <Sparkles size={14} />
                        )}
                        {running ? "Reading your material..." : "Generate Practice Drill"}
                    </button>

                    {selectedSource && (
                        <p className="ws-inline-note">
                            Source: {selectedSource.name} · {selectedSource.chunkCount} chunks
                        </p>
                    )}
                </div>

                {/* Kết quả */}
                <div className="workspace-preview-canvas">
                    <div className="quiz-preview-header">
                        <h4>{result?.quizTitle || "Generated practice assessment"}</h4>
                        {result?.quizTitle && (
                            <span className="source-indexed-tag">{result.status}</span>
                        )}
                    </div>

                    {!result ? (
                        <div className="ws-empty-state">
                            <span>
                                Choose a document and generate a drill. Questions are taken from the
                                practice questions already in your material, so nothing is invented.
                            </span>
                        </div>
                    ) : (
                        <div className="ws-result-block">
                            <p>{result.summary}</p>
                            {result.quizTitle && (
                                <p className="ws-inline-note">
                                    Saved to Quizzes as “{result.quizTitle}” with{" "}
                                    {result.suggestedQuestionCount} question(s).
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
