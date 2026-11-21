import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bot, FileText, Loader2, Send } from "lucide-react";
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

/**
 * Gia sư hỏi đáp trên tài liệu THẬT của người học: BE tìm các đoạn trong nguồn đã
 * chọn rồi trả về từng bước kèm câu hỏi gợi mở. Không có nội dung soạn sẵn.
 */
export const SocraticTutorWorkspace = ({ onBackToHub }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [sources, setSources] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState("");
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loadingContext, setLoadingContext] = useState(true);
    const [running, setRunning] = useState(false);

    // ---------------------------------------------------------------- context
    const loadContext = useCallback(
        async (signal) => {
            if (!sessionUser?.id) {
                setLoadingContext(false);
                return;
            }
            try {
                setLoadingContext(true);
                const context = await academyToolApi.context(sessionUser.id, "tutor");
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

    // -------------------------------------------------------------------- run
    const askTutor = async () => {
        const question = input.trim();
        if (!question || running) return;
        if (!sessionUser?.id) {
            showToast("Please sign in again to use the tutor.", "error");
            return;
        }

        setMessages((prev) => [...prev, { role: "user", text: question }]);
        setInput("");
        try {
            setRunning(true);
            const result = await academyToolApi.run(sessionUser.id, "tutor", {
                documentIds: selectedDocId ? [selectedDocId] : [],
                prompt: question,
            });

            const citations = result?.citations || [];
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: result?.summary || "No passages found.",
                    steps: citations.map((citation) => ({
                        text: citation.snippet,
                        source: citation.name,
                        terms: citation.matchedTerms,
                    })),
                },
            ]);
        } catch (err) {
            showToast(err.message || "The tutor could not answer that question.", "error");
        } finally {
            setRunning(false);
        }
    };

    const selectedSource = sources.find((source) => source.id === selectedDocId);
    const sourceOptions = sources.map((source) => ({
        value: source.id,
        label: `${source.name}${source.ready ? "" : " (indexing)"}`,
    }));

    return (
        <div className="edu-workspace-root">
            <header className="workspace-header-bar">
                <button type="button" className="btn-back-hub" onClick={onBackToHub}>
                    <ArrowLeft size={14} /> Back to Edu Tools
                </button>
                <div className="workspace-meta-tag">
                    <span className="badge-socratic">SOCRATIC AI</span>
                    <strong>Socratic Code Tutor</strong>
                    {selectedSource && (
                        <span className="module-crumb">
                            {selectedSource.courseCode || "GEN"} · {selectedSource.chunkCount}{" "}
                            chunks
                        </span>
                    )}
                </div>
            </header>

            <div className="workspace-double-pane">
                {/* Tài liệu đang dùng làm căn cứ */}
                <div className="workspace-canvas-panel">
                    <div className="panel-tab-title">
                        <FileText size={14} color="#059669" />
                        <span>{loadingContext ? "Loading sources..." : "Source material"}</span>
                    </div>

                    {loadingContext ? (
                        <div className="ws-empty-state">
                            <Loader2 size={16} className="ws-spinner" />
                            <span>Loading your documents...</span>
                        </div>
                    ) : sources.length === 0 ? (
                        <div className="ws-empty-state">
                            <span>
                                No course material yet. Upload a PDF or text file in Documents, then
                                come back.
                            </span>
                        </div>
                    ) : (
                        <div className="ws-source-list">
                            <div className="ws-source-selector">
                                <CustomSelector
                                    options={sourceOptions}
                                    value={selectedDocId}
                                    onChange={(value) => setSelectedDocId(value)}
                                    placeholder="Choose a source..."
                                />
                            </div>

                            <dl className="ws-source-facts">
                                <div>
                                    <dt>File</dt>
                                    <dd>{selectedSource?.name || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Course</dt>
                                    <dd>{selectedSource?.courseCode || "GEN"}</dd>
                                </div>
                                <div>
                                    <dt>Chunks</dt>
                                    <dd>{selectedSource?.chunkCount ?? 0}</dd>
                                </div>
                                <div>
                                    <dt>Status</dt>
                                    <dd>{selectedSource?.ready ? "Indexed" : "Indexing"}</dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </div>

                {/* Hội thoại với gia sư */}
                <div className="workspace-side-agent">
                    <div className="agent-title-bar">
                        <div className="agent-title-lead">
                            <Bot size={15} color="#059669" />
                            <strong>Socratic Mentoring Assistant</strong>
                        </div>
                        <span className="tutor-mode-tag">Guided Mode</span>
                    </div>

                    <div className="agent-conversation-flow">
                        {messages.length === 0 && (
                            <div className="ws-chat-hint">
                                Ask a question about the selected document. The tutor quotes the
                                passages it finds and turns them into guiding steps.
                            </div>
                        )}
                        {messages.map((message, index) => (
                            <div key={index} className={`chat-bubble-row ${message.role}`}>
                                <div className="chat-bubble-content">
                                    {message.text}
                                    {message.steps?.length > 0 && (
                                        <ol className="ws-step-list">
                                            {message.steps.map((step, stepIndex) => (
                                                <li key={stepIndex}>
                                                    <p>{step.text}</p>
                                                    <span>{step.source}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                            </div>
                        ))}
                        {running && (
                            <div className="chat-bubble-row assistant">
                                <div className="chat-bubble-content ws-typing">
                                    <Loader2 size={13} className="ws-spinner" /> Reading your
                                    sources...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="agent-composer-box">
                        <div className="input-with-send">
                            <input
                                type="text"
                                placeholder="Ask about the selected document..."
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") askTutor();
                                }}
                                disabled={running || sources.length === 0}
                            />
                            <button
                                type="button"
                                className="btn-send-agent"
                                onClick={askTutor}
                                disabled={running || !input.trim() || sources.length === 0}
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
