import { useState } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    FileText,
    Play,
    RotateCcw,
    Settings2,
    Sparkles,
    XCircle,
} from "lucide-react";
import "./EduWorkspaces.css";

export const ExamPrepWorkspace = ({ onBackToHub }) => {
    const [numQuestions, setNumQuestions] = useState(10);
    const [difficulty, setDifficulty] = useState("Medium");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPool, setGeneratedPool] = useState(true);

    return (
        <div className="edu-workspace-root">
            <header className="workspace-header-bar">
                <button type="button" className="btn-back-hub" onClick={onBackToHub}>
                    <ArrowLeft size={14} /> Back to Edu Tools
                </button>
                <div className="workspace-meta-tag">
                    <span className="badge-socratic amber">ADAPTIVE DRILL</span>
                    <strong>Exam & Quiz Synthesis Engine</strong>
                </div>
            </header>

            <div className="workspace-double-pane">
                {/* Configuration Panel */}
                <div className="workspace-config-sidebar">
                    <h3>Quiz Generation Settings</h3>
                    <div className="config-form-unit">
                        <label>Target Course Material</label>
                        <select defaultValue="cs204">
                            <option value="cs204">CS204: Algorithms & Complexity</option>
                            <option value="se301">SE301: Software Architecture</option>
                            <option value="ai402">AI402: LLMs & Agentic RAG</option>
                        </select>
                    </div>

                    <div className="config-form-unit">
                        <label>Target Concepts / Chapter</label>
                        <input type="text" defaultValue="Dynamic Programming & Memoization" />
                    </div>

                    <div className="config-form-unit">
                        <label>Difficulty Level</label>
                        <div className="difficulty-pills">
                            {["Easy", "Medium", "Hard"].map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    className={`pill-btn ${difficulty === d ? "active" : ""}`}
                                    onClick={() => setDifficulty(d)}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="config-form-unit">
                        <label>
                            Number of Questions: <strong>{numQuestions}</strong>
                        </label>
                        <input
                            type="range"
                            min="5"
                            max="25"
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Number(e.target.value))}
                        />
                    </div>

                    <button
                        type="button"
                        className="btn-primary-generate"
                        onClick={() => {
                            setIsGenerating(true);
                            setTimeout(() => setIsGenerating(false), 1200);
                        }}
                    >
                        <Sparkles size={14} />{" "}
                        {isGenerating ? "Synthesizing RAG Questions..." : "Generate Practice Drill"}
                    </button>
                </div>

                {/* Generated Quiz Preview */}
                <div className="workspace-preview-canvas">
                    <div className="quiz-preview-header">
                        <h4>Generated Practice Assessment (10 Questions)</h4>
                        <span className="source-indexed-tag">
                            Synthesized from 3 vectorized PDFs
                        </span>
                    </div>

                    <div className="generated-question-item">
                        <span className="q-badge">Question 1 · Single Choice</span>
                        <p className="q-text">
                            What is the primary difference between Memoization (Top-down) and
                            Tabulation (Bottom-up) approaches in Dynamic Programming?
                        </p>
                        <div className="q-choices-list">
                            <label className="choice-row">
                                <input type="radio" name="sample_q" />
                                <span>
                                    A. Memoization uses iterative tables, while Tabulation relies
                                    exclusively on recursion.
                                </span>
                            </label>
                            <label className="choice-row correct-preview">
                                <input type="radio" name="sample_q" defaultChecked />
                                <span>
                                    B. Memoization computes states on demand using recursion and
                                    caching, while Tabulation solves subproblems sequentially.
                                </span>
                            </label>
                            <label className="choice-row">
                                <input type="radio" name="sample_q" />
                                <span>C. Tabulation always uses $O(1)$ auxiliary space.</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
