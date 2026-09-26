import { useState } from "react";
import {
    Bell,
    BookOpen,
    Bot,
    Check,
    Database,
    GraduationCap,
    Key,
    Moon,
    Save,
    ShieldCheck,
    Sliders,
    Sparkles,
    Sun,
    User,
} from "lucide-react";
import "./Setting.css";

const SETTINGS_SECTIONS = [
    { id: "academic_profile", label: "Academic Profile", icon: User },
    { id: "ai_tutor", label: "AI Tutor Pedagogy", icon: Bot },
    { id: "rag_engine", label: "Courseware RAG Engine", icon: Database },
    { id: "notifications", label: "Exam & Study Alerts", icon: Bell },
    { id: "security", label: "API Keys & Integrations", icon: Key },
];

const Setting = () => {
    const [activeSection, setActiveSection] = useState("academic_profile");
    const [isSaved, setIsSaved] = useState(false);

    // Form states
    const [profile, setProfile] = useState({
        fullName: "Huy Tran Anh",
        email: "anhhuyrubic@gmail.com",
        university: "HCMC University of Technology and Engineering (HCMUTE)",
        studentId: "23110042",
        major: "Information Technology (CS/AI)",
        expectedGraduation: "2027",
    });

    const [tutorSettings, setTutorSettings] = useState({
        mode: "socratic", // 'socratic' | 'direct'
        strictness: "balanced", // 'lenient' | 'balanced' | 'rigorous'
        codeExplanationDetail: "line-by-line",
        autoGenerateFlashcards: true,
    });

    const [ragSettings, setRagSettings] = useState({
        vectorTopK: 5,
        similarityThreshold: 0.82,
        hybridGraphEnabled: true,
        defaultEmbeddingModel: "text-embedding-3-small",
    });

    const handleSave = () => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
    };

    return (
        <div className="edu-settings-bounds">
            {/* Header Banner */}
            <div className="edu-settings-header">
                <div>
                    <h2>Academy Preferences & Studio Settings</h2>
                    <span>
                        Configure your academic profile, Socratic tutor strictness, and courseware
                        RAG retrieval parameters
                    </span>
                </div>
                <button
                    type="button"
                    className={`btn-save-settings ${isSaved ? "saved" : ""}`}
                    onClick={handleSave}
                >
                    {isSaved ? (
                        <>
                            <Check size={14} /> Saved Changes
                        </>
                    ) : (
                        <>
                            <Save size={14} /> Save Preferences
                        </>
                    )}
                </button>
            </div>

            {/* Split Settings Layout */}
            <div className="edu-settings-grid">
                {/* Left Column: Sub-navigation */}
                <aside className="settings-nav-column">
                    {SETTINGS_SECTIONS.map((sec) => {
                        const Icon = sec.icon;
                        const isActive = activeSection === sec.id;
                        return (
                            <button
                                key={sec.id}
                                type="button"
                                className={`settings-nav-item ${isActive ? "active" : ""}`}
                                onClick={() => setActiveSection(sec.id)}
                            >
                                <Icon size={16} />
                                <span>{sec.label}</span>
                            </button>
                        );
                    })}
                </aside>

                {/* Right Column: Settings Content Panels */}
                <main className="settings-content-panel">
                    {/* SECTION 1: ACADEMIC PROFILE */}
                    {activeSection === "academic_profile" && (
                        <div className="settings-form-group">
                            <div className="section-narrative-header">
                                <h3>Student & University Information</h3>
                                <p>
                                    Manage your linked university curriculum credentials and
                                    semester standing.
                                </p>
                            </div>

                            <div className="form-fields-grid">
                                <div className="input-field-unit">
                                    <label>Full Legal Name</label>
                                    <input
                                        type="text"
                                        value={profile.fullName}
                                        onChange={(e) =>
                                            setProfile({ ...profile, fullName: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="input-field-unit">
                                    <label>Academic Email</label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) =>
                                            setProfile({ ...profile, email: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="input-field-unit full-width">
                                    <label>University / Institution</label>
                                    <input
                                        type="text"
                                        value={profile.university}
                                        onChange={(e) =>
                                            setProfile({ ...profile, university: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="input-field-unit">
                                    <label>Student ID (MSSV)</label>
                                    <input
                                        type="text"
                                        value={profile.studentId}
                                        onChange={(e) =>
                                            setProfile({ ...profile, studentId: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="input-field-unit">
                                    <label>Major / Faculty</label>
                                    <input
                                        type="text"
                                        value={profile.major}
                                        onChange={(e) =>
                                            setProfile({ ...profile, major: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: AI TUTOR PEDAGOGY */}
                    {activeSection === "ai_tutor" && (
                        <div className="settings-form-group">
                            <div className="section-narrative-header">
                                <h3>Socratic AI Tutoring Behavior</h3>
                                <p>
                                    Determine how interactive AI mentors prompt questions and
                                    evaluate student code submissions.
                                </p>
                            </div>

                            <div className="setting-card-block">
                                <span className="block-title">Instructional Style</span>
                                <div className="options-radio-cluster">
                                    <label
                                        className={`radio-card-choice ${tutorSettings.mode === "socratic" ? "selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="tutorMode"
                                            value="socratic"
                                            checked={tutorSettings.mode === "socratic"}
                                            onChange={() =>
                                                setTutorSettings({
                                                    ...tutorSettings,
                                                    mode: "socratic",
                                                })
                                            }
                                        />
                                        <div>
                                            <strong>Socratic Method (Recommended)</strong>
                                            <p>
                                                Guides with incremental hints and inquiry questions
                                                instead of immediate answer reveals.
                                            </p>
                                        </div>
                                    </label>

                                    <label
                                        className={`radio-card-choice ${tutorSettings.mode === "direct" ? "selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="tutorMode"
                                            value="direct"
                                            checked={tutorSettings.mode === "direct"}
                                            onChange={() =>
                                                setTutorSettings({
                                                    ...tutorSettings,
                                                    mode: "direct",
                                                })
                                            }
                                        />
                                        <div>
                                            <strong>Direct Solutions & Debugging</strong>
                                            <p>
                                                Provides fully corrected code implementations with
                                                comprehensive algorithmic proofs immediately.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="setting-card-block">
                                <span className="block-title">
                                    Feedback Rigor & Rubric Enforcement
                                </span>
                                <div className="select-dropdown-unit">
                                    <select
                                        value={tutorSettings.strictness}
                                        onChange={(e) =>
                                            setTutorSettings({
                                                ...tutorSettings,
                                                strictness: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="lenient">
                                            Lenient — Focus on code completion and conceptual
                                            understanding
                                        </option>
                                        <option value="balanced">
                                            Balanced — Standard university rubric (syntax, style &
                                            Big-O)
                                        </option>
                                        <option value="rigorous">
                                            Rigorous — Strict SAST static security & memory leak
                                            audits
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Automatic Flashcard Synthesis</strong>
                                    <p>
                                        Automatically extract failed quiz questions into active
                                        recall flashcards.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="setting-checkbox-toggle"
                                    checked={tutorSettings.autoGenerateFlashcards}
                                    onChange={(e) =>
                                        setTutorSettings({
                                            ...tutorSettings,
                                            autoGenerateFlashcards: e.target.checked,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: RAG ENGINE PARAMETERS */}
                    {activeSection === "rag_engine" && (
                        <div className="settings-form-group">
                            <div className="section-narrative-header">
                                <h3>Courseware RAG & Vector Index Parameters</h3>
                                <p>
                                    Tune retrieval hyperparameters for syllabus semantic search and
                                    Neo4j knowledge graph queries.
                                </p>
                            </div>

                            <div className="setting-card-block">
                                <div className="range-field-header">
                                    <label>Vector Search Top-K Retrieval</label>
                                    <span className="range-metric-chip">
                                        {ragSettings.vectorTopK} Chunks
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="2"
                                    max="12"
                                    value={ragSettings.vectorTopK}
                                    onChange={(e) =>
                                        setRagSettings({
                                            ...ragSettings,
                                            vectorTopK: Number(e.target.value),
                                        })
                                    }
                                    className="slider-range-input"
                                />
                                <span className="range-subtext">
                                    Number of courseware passages retrieved per tutor query.
                                </span>
                            </div>

                            <div className="setting-card-block">
                                <div className="range-field-header">
                                    <label>Cosine Similarity Threshold</label>
                                    <span className="range-metric-chip">
                                        {ragSettings.similarityThreshold}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.6"
                                    max="0.95"
                                    step="0.01"
                                    value={ragSettings.similarityThreshold}
                                    onChange={(e) =>
                                        setRagSettings({
                                            ...ragSettings,
                                            similarityThreshold: Number(e.target.value),
                                        })
                                    }
                                    className="slider-range-input"
                                />
                                <span className="range-subtext">
                                    Minimum threshold required to accept textbook evidence into LLM
                                    prompts.
                                </span>
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Hybrid GraphRAG Node Traversal</strong>
                                    <p>
                                        Connect vector embeddings with Neo4j entity relationships
                                        for cross-chapter reasoning.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="setting-checkbox-toggle"
                                    checked={ragSettings.hybridGraphEnabled}
                                    onChange={(e) =>
                                        setRagSettings({
                                            ...ragSettings,
                                            hybridGraphEnabled: e.target.checked,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: NOTIFICATIONS */}
                    {activeSection === "notifications" && (
                        <div className="settings-form-group">
                            <div className="section-narrative-header">
                                <h3>Exam Reminders & Schedule Alerts</h3>
                                <p>
                                    Set up automated reminders for approaching midterm drills,
                                    assignment rubrics, and study streaks.
                                </p>
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Daily Study Streak Reminders</strong>
                                    <p>
                                        Receive alert pings when your daily practice drill has not
                                        been completed.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    defaultChecked
                                    className="setting-checkbox-toggle"
                                />
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Lab Assignment Rubric Deadlines</strong>
                                    <p>
                                        Notify 48 hours prior to deadline if automated code review
                                        checks are still failing.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    defaultChecked
                                    className="setting-checkbox-toggle"
                                />
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>AI Knowledge Gap Alerts</strong>
                                    <p>
                                        Weekly digest highlighting areas requiring remediation based
                                        on recent quiz scores.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    defaultChecked
                                    className="setting-checkbox-toggle"
                                />
                            </div>
                        </div>
                    )}

                    {/* SECTION 5: API KEYS & SECURITY */}
                    {activeSection === "security" && (
                        <div className="settings-form-group">
                            <div className="section-narrative-header">
                                <h3>API Keys & External Tool Integrations</h3>
                                <p>
                                    Manage authorization tokens for local container sandboxes and
                                    cloud LLM endpoints.
                                </p>
                            </div>

                            <div className="input-field-unit full-width">
                                <label>OpenAI / DeepSeek Custom Endpoint Key</label>
                                <input
                                    type="password"
                                    defaultValue="sk-proj-982402xxxxxxxxxxxxxxxx"
                                    placeholder="sk-..."
                                />
                            </div>

                            <div className="input-field-unit full-width">
                                <label>Qdrant Vector Cloud Cluster URL</label>
                                <input
                                    type="text"
                                    defaultValue="https://qdrant-cluster-prod.prismstudio.dev:6333"
                                />
                            </div>

                            <div className="security-notice-box">
                                <ShieldCheck size={16} color="#059669" />
                                <span>
                                    All credentials are encrypted client-side and authenticated
                                    through secure session storage.
                                </span>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Setting;
