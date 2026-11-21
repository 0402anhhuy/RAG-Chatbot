import { useState } from "react";
import { ArrowLeft, BookOpen, Loader2, Search, Sparkles } from "lucide-react";
import { academyToolApi } from "../../../../../api";
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
 * Tra cứu trên chính tài liệu người học đã upload. BE tìm từ khoá trong nội dung
 * file và trả đoạn khớp + điểm khớp — không có đoạn văn bản nào được soạn sẵn.
 */
export const CoursewareRAGWorkspace = ({ onBackToHub }) => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [query, setQuery] = useState("");
    const [result, setResult] = useState(null);
    const [running, setRunning] = useState(false);

    const search = async () => {
        const question = query.trim();
        if (!question || running) return;
        if (!sessionUser?.id) {
            showToast("Please sign in again to query your courseware.", "error");
            return;
        }
        try {
            setRunning(true);
            const response = await academyToolApi.run(sessionUser.id, "courseware", {
                prompt: question,
            });
            setResult(response);
            if (!response?.citations?.length) {
                showToast("No passage in your material matches that query.", "warning");
            }
        } catch (err) {
            showToast(err.message || "Could not query your courseware.", "error");
        } finally {
            setRunning(false);
        }
    };

    const citations = result?.citations || [];

    return (
        <div className="edu-workspace-root">
            <header className="workspace-header-bar">
                <button type="button" className="btn-back-hub" onClick={onBackToHub}>
                    <ArrowLeft size={14} /> Back to Edu Tools
                </button>
                <div className="workspace-meta-tag">
                    <span className="badge-socratic purple">VECTOR RETRIEVAL</span>
                    <strong>Courseware RAG Index</strong>
                </div>
            </header>

            <div className="workspace-rag-container">
                <form
                    className="rag-search-box"
                    onSubmit={(event) => {
                        event.preventDefault();
                        search();
                    }}
                >
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search concepts across your uploaded syllabi..."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    <button
                        type="submit"
                        className="btn-vector-query"
                        disabled={running || !query.trim()}
                    >
                        {running ? (
                            <Loader2 size={14} className="ws-spinner" />
                        ) : (
                            <Sparkles size={14} />
                        )}
                        {running ? "Searching..." : "Query RAG Index"}
                    </button>
                </form>

                {result && <p className="ws-rag-summary">{result.summary}</p>}

                <div className="rag-results-grid">
                    {citations.length === 0 ? (
                        <div className="ws-empty-state">
                            <span>
                                {result
                                    ? "No matching passage. Try different words or upload the course material."
                                    : "Search your uploaded documents. Passages and match scores come from the files themselves."}
                            </span>
                        </div>
                    ) : (
                        citations.map((citation) => (
                            <div key={citation.documentId} className="rag-citation-card">
                                <div className="citation-top">
                                    <div className="citation-source">
                                        <BookOpen size={14} color="#7c3aed" />
                                        <strong>{citation.name}</strong>
                                        <span className="citation-page">
                                            {citation.courseCode || "GEN"}
                                        </span>
                                    </div>
                                    <span className="citation-score">
                                        {citation.scorePercent}% term match
                                    </span>
                                </div>
                                <p className="citation-snippet">“{citation.snippet}”</p>
                                {citation.matchedTerms?.length > 0 && (
                                    <div className="citation-actions">
                                        {citation.matchedTerms.map((term) => (
                                            <span key={term} className="ws-term-chip">
                                                {term}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
