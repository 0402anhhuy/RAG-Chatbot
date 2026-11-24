import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckSquare, Clock, Loader2, Play, Upload } from "lucide-react";
import { academyToolApi } from "../../../../../api";
import CustomSelector from "../../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../../context/ToastContext";
import "./EduWorkspaces.css";
import { getSessionUser } from "../../../../../components/common/utils/session";


/**
 * Chấm bài theo rubric. BE chưa có rubric engine nên lượt chạy được xếp hàng
 * (status = queued) và lưu lại bài nộp cùng rubric nguồn — UI nói đúng trạng
 * thái thay vì hiện điểm giả.
 */
export const AssignmentGraderWorkspace = ({ onBackToHub }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [sources, setSources] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState("");
    const [submissionName, setSubmissionName] = useState("");
    const [loadingContext, setLoadingContext] = useState(true);
    const [running, setRunning] = useState(false);
    const [lastRun, setLastRun] = useState(null);

    const loadContext = useCallback(
        async (signal) => {
            if (!sessionUser?.id) {
                setLoadingContext(false);
                return;
            }
            try {
                setLoadingContext(true);
                const [context, latest] = await Promise.all([
                    academyToolApi.context(sessionUser.id, "grader"),
                    academyToolApi.latest(sessionUser.id, "grader").catch(() => null),
                ]);
                if (signal?.cancelled) return;
                setSources(context?.sources || []);
                setSelectedDocId((prev) => prev || context?.sources?.[0]?.id || "");
                setLastRun(latest || null);
            } catch (err) {
                if (signal?.cancelled) return;
                showToast(err.message || "Unable to load your rubric sources.", "error");
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

    const queueGrading = async () => {
        if (!sessionUser?.id) {
            showToast("Please sign in again to queue a grading run.", "error");
            return;
        }
        try {
            setRunning(true);
            const response = await academyToolApi.run(sessionUser.id, "grader", {
                documentIds: selectedDocId ? [selectedDocId] : [],
                prompt: submissionName.trim() || undefined,
            });
            setLastRun(response);
            showToast("Submission queued for grading.", "info");
        } catch (err) {
            showToast(err.message || "Could not queue the submission.", "error");
        } finally {
            setRunning(false);
        }
    };

    const selectedSource = sources.find((source) => source.id === selectedDocId);

    return (
        <div className="edu-workspace-root">
            <header className="workspace-header-bar">
                <button type="button" className="btn-back-hub" onClick={onBackToHub}>
                    <ArrowLeft size={14} /> Back to Edu Tools
                </button>
                <div className="workspace-meta-tag">
                    <span className="badge-socratic blue">AUTO RUBRIC</span>
                    <strong>Assignment Grader</strong>
                </div>
            </header>

            <div className="workspace-double-pane">
                {/* Bài nộp + rubric nguồn */}
                <div className="workspace-canvas-panel">
                    <div className="submission-toolbar">
                        <strong>Submission to grade</strong>
                        <button
                            type="button"
                            className="btn-trigger-grade"
                            onClick={queueGrading}
                            disabled={running || sources.length === 0 || loadingContext}
                        >
                            {running ? (
                                <Loader2 size={13} className="ws-spinner" />
                            ) : (
                                <Play size={13} fill="#ffffff" />
                            )}
                            {running ? "Queueing..." : "Run Automated Rubric"}
                        </button>
                    </div>

                    <div className="ws-grade-form">
                        <div className="config-form-unit">
                            <label>Submission (file name or student reference)</label>
                            <input
                                type="text"
                                value={submissionName}
                                onChange={(event) => setSubmissionName(event.target.value)}
                                placeholder="e.g. Lab03_GraphRouting.java"
                            />
                        </div>

                        <div className="config-form-unit">
                            <label>Rubric source</label>
                            {loadingContext ? (
                                <span className="ws-inline-note">
                                    <Loader2 size={12} className="ws-spinner" /> Loading sources...
                                </span>
                            ) : sources.length === 0 ? (
                                <span className="ws-inline-note">
                                    Upload the rubric or assignment brief first.
                                </span>
                            ) : (
                                <CustomSelector
                                    options={sources.map((source) => ({
                                        value: source.id,
                                        label: `${source.name}${source.ready ? "" : " (indexing)"}`,
                                    }))}
                                    value={selectedDocId}
                                    onChange={(value) => setSelectedDocId(value)}
                                    placeholder="Choose rubric..."
                                />
                            )}
                        </div>

                        <p className="ws-inline-note">
                            <Upload size={12} /> File upload for submissions is not connected yet —
                            the run stores the reference and the rubric source you pick.
                        </p>
                    </div>
                </div>

                {/* Trạng thái chấm */}
                <div className="workspace-rubric-card">
                    <div className="rubric-summary-score">
                        <div className="score-ring ws-score-ring-pending">
                            {lastRun?.status === "queued" ? (
                                <Clock size={20} />
                            ) : (
                                <CheckSquare size={20} />
                            )}
                        </div>
                        <div>
                            <h4>
                                {lastRun
                                    ? lastRun.status === "queued"
                                        ? "Queued for grading"
                                        : lastRun.status
                                    : "No submission yet"}
                            </h4>
                            <p>
                                {lastRun?.summary ||
                                    "Run the rubric to see how the submission is evaluated."}
                            </p>
                        </div>
                    </div>

                    {selectedSource && (
                        <div className="rubric-checklist">
                            <div className="check-item">
                                <CheckSquare size={16} />
                                <div>
                                    <strong>{selectedSource.name}</strong>
                                    <small>
                                        {selectedSource.chunkCount} chunks ·{" "}
                                        {selectedSource.ready ? "indexed" : "indexing"}
                                    </small>
                                </div>
                            </div>
                        </div>
                    )}

                    {lastRun?.createdAt && (
                        <p className="ws-inline-note">Last run: {lastRun.createdAt}</p>
                    )}
                </div>
            </div>
        </div>
    );
};
