import { useState } from "react";
import {
    AlertCircle,
    ArrowRight,
    Award,
    BookOpen,
    CheckCircle2,
    Clock,
    Filter,
    HelpCircle,
    Play,
    Plus,
    RotateCcw,
    Search,
    Sparkles,
    Timer,
    XCircle,
} from "lucide-react";
import "./Quizzes.css";

const QUIZZES_DATA = [
    {
        id: "quiz-01",
        courseCode: "CS204",
        courseTitle: "Algorithms & Complexity",
        title: "Dynamic Programming: Knapsack & Longest Subsequence",
        totalQuestions: 15,
        timeMinutes: 25,
        difficulty: "Hard",
        status: "Completed",
        score: "93%",
        lastAttempt: "2 days ago",
        sampleQuestion: {
            text: "In the 0/1 Knapsack problem, which dynamic programming transition correctly represents considering the i-th item with weight w?",
            options: [
                "dp[i][w] = dp[i-1][w]",
                "dp[i][w] = max(dp[i-1][w], dp[i-1][w - weight[i]] + value[i])",
                "dp[i][w] = dp[i][w - weight[i]] + value[i]",
                "dp[i][w] = min(dp[i-1][w], dp[i][w - 1])",
            ],
            correct: 1,
            ragSource: "Lecture_04_Dynamic_Programming.pdf (Page 18)",
        },
    },
    {
        id: "quiz-02",
        courseCode: "SE301",
        courseTitle: "Software Architecture",
        title: "Microservices & Event-Driven Patterns Evaluation",
        totalQuestions: 20,
        timeMinutes: 30,
        difficulty: "Medium",
        status: "In Progress",
        score: "Incomplete",
        lastAttempt: "Today",
        sampleQuestion: {
            text: "Which architectural challenge is primarily solved by adopting the Transactional Outbox Pattern in microservices?",
            options: [
                "Optimizing query response times on NoSQL databases",
                "Guaranteeing dual-write atomicity between the database and message broker",
                "Replacing the API Gateway layer completely",
                "Enabling automatic pod auto-scaling on Kubernetes",
            ],
            correct: 1,
            ragSource: "Chapter_05_Microservices_EventDriven.pdf (Page 42)",
        },
    },
    {
        id: "quiz-03",
        courseCode: "AI402",
        courseTitle: "LLMs & Agentic RAG",
        title: "GraphRAG & Vector Similarity Search Fundamentals",
        totalQuestions: 10,
        timeMinutes: 15,
        difficulty: "Medium",
        status: "New",
        score: "Not taken",
        lastAttempt: "Never",
        sampleQuestion: {
            text: "When combining Neo4j with Vector Stores (Hybrid GraphRAG), what is the key advantage of Graph Traversal over standard dense retrieval?",
            options: [
                "Eliminates the requirement for text embeddings",
                "Preserves hierarchical and multi-hop reasoning relationships across entities",
                "Reduces memory consumption down to 0MB",
                "Bypasses tokenization steps completely",
            ],
            correct: 1,
            ragSource: "GraphRAG_KnowledgeGraph_Traversal.pdf (Page 06)",
        },
    },
    {
        id: "quiz-04",
        courseCode: "CS204",
        courseTitle: "Algorithms & Complexity",
        title: "Dijkstra & Minimum Spanning Tree (MST)",
        totalQuestions: 12,
        timeMinutes: 20,
        difficulty: "Medium",
        status: "Completed",
        score: "85%",
        lastAttempt: "1 week ago",
        sampleQuestion: {
            text: "Does standard Dijkstra's algorithm guarantee optimal shortest paths on graphs containing negative edge weights?",
            options: [
                "Yes, it always finds the shortest path correctly",
                "No, it may yield incorrect paths or trap into infinite negative cycles",
                "Only if the graph is a binary search tree",
                "Only if the total number of vertices is fewer than 100",
            ],
            correct: 1,
            ragSource: "Lab_03_Graph_Dijkstra_Spec.pdf (Page 12)",
        },
    },
];

const Quizzes = ({ onLaunchTool }) => {
    const [selectedQuiz, setSelectedQuiz] = useState(QUIZZES_DATA[0]);
    const [searchFilter, setSearchFilter] = useState("");
    const [activeTabFilter, setActiveTabFilter] = useState("all");
    const [selectedOption, setSelectedOption] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);

    const filteredQuizzes = QUIZZES_DATA.filter((q) => {
        const matchesQuery =
            q.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
            q.courseCode.toLowerCase().includes(searchFilter.toLowerCase());
        if (activeTabFilter === "completed") return matchesQuery && q.status === "Completed";
        if (activeTabFilter === "new") return matchesQuery && q.status === "New";
        return matchesQuery;
    });

    const handleSelectQuiz = (quiz) => {
        setSelectedQuiz(quiz);
        setSelectedOption(null);
        setShowExplanation(false);
    };

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
                    onClick={() => onLaunchTool && onLaunchTool("exam_prep")}
                >
                    <Sparkles size={14} />
                    <span>Create AI Assessment</span>
                </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="quizzes-stats-row">
                <div className="stat-pill-box">
                    <span className="stat-label">Completed Assessments</span>
                    <strong className="stat-val">48 Quizzes</strong>
                </div>
                <div className="stat-pill-box">
                    <span className="stat-label">Average Mastery Score</span>
                    <strong className="stat-val green">89.4%</strong>
                </div>
                <div className="stat-pill-box">
                    <span className="stat-label">Reviewed RAG Questions</span>
                    <strong className="stat-val">340 items</strong>
                </div>
                <div className="stat-pill-box">
                    <span className="stat-label">Algorithmic Precision</span>
                    <strong className="stat-val blue">92%</strong>
                </div>
            </div>

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
                </div>
                <div className="filters-cluster">
                    <button
                        type="button"
                        className={`filter-btn ${activeTabFilter === "all" ? "active" : ""}`}
                        onClick={() => setActiveTabFilter("all")}
                    >
                        All ({QUIZZES_DATA.length})
                    </button>
                    <button
                        type="button"
                        className={`filter-btn ${activeTabFilter === "completed" ? "active" : ""}`}
                        onClick={() => setActiveTabFilter("completed")}
                    >
                        Completed
                    </button>
                    <button
                        type="button"
                        className={`filter-btn ${activeTabFilter === "new" ? "active" : ""}`}
                        onClick={() => setActiveTabFilter("new")}
                    >
                        Unattempted
                    </button>
                </div>
            </div>

            {/* Master - Detail Split Layout */}
            <div className="quizzes-layout-grid">
                {/* Left Column: Assessment List */}
                <div className="quizzes-cards-column">
                    {filteredQuizzes.map((quiz) => {
                        const isSelected = selectedQuiz.id === quiz.id;
                        return (
                            <div
                                key={quiz.id}
                                className={`quiz-entry-card ${isSelected ? "selected" : ""}`}
                                onClick={() => handleSelectQuiz(quiz)}
                            >
                                <div className="quiz-card-head">
                                    <span className="course-tag">{quiz.courseCode}</span>
                                    <span
                                        className={`difficulty-badge ${quiz.difficulty.toLowerCase()}`}
                                    >
                                        {quiz.difficulty}
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
                                    {quiz.status === "Completed" ? (
                                        <span className="quiz-score-tag">Score: {quiz.score}</span>
                                    ) : (
                                        <span className="quiz-status-tag">{quiz.status}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right Column: Interactive Drill Sample Preview */}
                <div className="quiz-preview-panel">
                    <div className="preview-top-banner">
                        <div className="preview-heading">
                            <span className="preview-course-sub">
                                {selectedQuiz.courseCode} · {selectedQuiz.courseTitle}
                            </span>
                            <h3>{selectedQuiz.title}</h3>
                        </div>
                        <button
                            type="button"
                            className="btn-start-drill"
                            onClick={() => onLaunchTool && onLaunchTool("exam_prep")}
                        >
                            <Play size={13} fill="#ffffff" />
                            <span>Start Full Assessment</span>
                        </button>
                    </div>

                    {/* Question Surface */}
                    <div className="sample-question-surface">
                        <div className="question-index-tag">
                            <span>SAMPLE QUESTION PREVIEW (1 / {selectedQuiz.totalQuestions})</span>
                            <span className="source-rag-ref">
                                <BookOpen size={12} /> Source:{" "}
                                {selectedQuiz.sampleQuestion.ragSource}
                            </span>
                        </div>

                        <p className="question-body-text">{selectedQuiz.sampleQuestion.text}</p>

                        <div className="options-selection-group">
                            {selectedQuiz.sampleQuestion.options.map((option, idx) => {
                                const isPicked = selectedOption === idx;
                                const isCorrect = idx === selectedQuiz.sampleQuestion.correct;
                                let optionClass = "";
                                if (showExplanation) {
                                    if (isCorrect) optionClass = "correct-choice";
                                    else if (isPicked && !isCorrect) optionClass = "wrong-choice";
                                } else if (isPicked) {
                                    optionClass = "selected-choice";
                                }

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        className={`option-answer-btn ${optionClass}`}
                                        onClick={() => {
                                            if (!showExplanation) setSelectedOption(idx);
                                        }}
                                    >
                                        <span className="option-letter">
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="option-text">{option}</span>
                                        {showExplanation && isCorrect && (
                                            <CheckCircle2 size={16} className="state-icon green" />
                                        )}
                                        {showExplanation && isPicked && !isCorrect && (
                                            <XCircle size={16} className="state-icon red" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Question Action Bar */}
                        <div className="question-action-bar">
                            {!showExplanation ? (
                                <button
                                    type="button"
                                    disabled={selectedOption === null}
                                    className="btn-check-answer"
                                    onClick={() => setShowExplanation(true)}
                                >
                                    Verify Answer & View AI Rationale
                                </button>
                            ) : (
                                <div className="explanation-reveal-box">
                                    <div className="explanation-title">
                                        <Sparkles size={14} color="#059669" />
                                        <strong>Curriculum Analysis & RAG Context:</strong>
                                    </div>
                                    <p>
                                        The correct answer is{" "}
                                        <strong>
                                            {String.fromCharCode(
                                                65 + selectedQuiz.sampleQuestion.correct,
                                            )}
                                        </strong>
                                        . The dynamic programming transition optimizes state
                                        transitions by selecting the maximum value between excluding
                                        the <em>i-th</em> item (retaining state <em>i-1</em>) and
                                        including it (adding its value and deducting its weight
                                        capacity).
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
                </div>
            </div>
        </div>
    );
};

export default Quizzes;
