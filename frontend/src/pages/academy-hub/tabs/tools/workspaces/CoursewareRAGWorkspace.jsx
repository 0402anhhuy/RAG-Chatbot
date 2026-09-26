import { useState } from "react";
import {
    ArrowLeft,
    BookOpen,
    Database,
    ExternalLink,
    Network,
    Search,
    Sparkles,
} from "lucide-react";
import "./EduWorkspaces.css";

export const CoursewareRAGWorkspace = ({ onBackToHub }) => {
    const [query, setQuery] = useState("Explain Outbox Pattern in distributed transactions");
    const [results, setResults] = useState([
        {
            title: "Chapter_05_Microservices_EventDriven.pdf",
            score: "96.4% Cosine Match",
            page: "Page 42, Paragraph 3",
            snippet:
                "The Transactional Outbox Pattern solves the dual-write anti-pattern by persisting domain entities and outbound events within a single local database transaction before message bus dissemination.",
        },
        {
            title: "Clean_Architecture_Handbook.pdf",
            score: "88.1% Cosine Match",
            page: "Page 112, Chapter 8",
            snippet:
                "Decoupling transport layers from internal state persistence ensures eventual consistency without requiring distributed two-phase commit (2PC) locks.",
        },
    ]);

    return (
        <div className="edu-workspace-root">
            <header className="workspace-header-bar">
                <button type="button" className="btn-back-hub" onClick={onBackToHub}>
                    <ArrowLeft size={14} /> Back to Edu Tools
                </button>
                <div className="workspace-meta-tag">
                    <span className="badge-socratic purple">VECTOR RETRIEVAL</span>
                    <strong>Courseware RAG & Knowledge Graph Explorer</strong>
                </div>
            </header>

            <div className="workspace-rag-container">
                <div className="rag-search-box">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search concepts across all vectorized syllabi..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="button" className="btn-vector-query">
                        <Sparkles size={14} /> Query RAG Index
                    </button>
                </div>

                <div className="rag-results-grid">
                    {results.map((res, i) => (
                        <div key={i} className="rag-citation-card">
                            <div className="citation-top">
                                <div className="citation-source">
                                    <BookOpen size={14} color="#7c3aed" />
                                    <strong>{res.title}</strong>
                                    <span className="citation-page">{res.page}</span>
                                </div>
                                <span className="citation-score">{res.score}</span>
                            </div>
                            <p className="citation-snippet">"{res.snippet}"</p>
                            <div className="citation-actions">
                                <button type="button" className="btn-cite-action">
                                    <Network size={12} /> View in Neo4j Graph
                                </button>
                                <button type="button" className="btn-cite-action">
                                    <ExternalLink size={12} /> Open PDF Page
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
