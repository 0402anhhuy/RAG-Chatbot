import { useState } from "react";
import {
    User,
    Bot,
    Target,
    Bell,
    Check,
    Save,
    Sparkles,
    GraduationCap,
    BookOpen,
} from "lucide-react";
import "./Setting.css";

const SETTINGS_SECTIONS = [
    { id: "profile", label: "Student Profile", icon: User },
    { id: "ai_tutor", label: "AI Tutor Preferences", icon: Bot },
    { id: "study_goals", label: "Study Goals & Focus", icon: Target },
    { id: "notifications", label: "Reminders & Alerts", icon: Bell },
];

const Setting = () => {
    const [activeSection, setActiveSection] = useState("profile");
    const [isSaved, setIsSaved] = useState(false);

    // Profile State
    const [profile, setProfile] = useState({
        fullName: "Trần Anh Huy",
        email: "anhhuyrubic@gmail.com",
        university: "HCMC University of Technology and Education (HCMUTE)",
        studentId: "23110042",
        major: "Information Technology",
        academicYear: "3rd Year (Class of 2027)",
    });

    // Tutor State
    const [tutorSettings, setTutorSettings] = useState({
        responseStyle: "guided", // 'guided' | 'detailed'
        tone: "friendly", // 'encouraging' | 'friendly' | 'academic'
        autoQuiz: true,
        languagePreference: "bilingual", // 'vi' | 'en' | 'bilingual'
    });

    // Study Goals State
    const [studyGoals, setStudyGoals] = useState({
        dailyStudyTarget: 45, // phút
        weeklyQuizTarget: 3,
        autoFlashcards: true,
        focusMode: true,
    });

    // Notifications State
    const [notifications, setNotifications] = useState({
        dailyReminder: true,
        assignmentAlerts: true,
        streakReminder: true,
        weeklySummary: true,
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
                    <h2>Account & Study Preferences</h2>
                    <span>
                        Customize your learning goals, AI Tutor behavior, and schedule reminders
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
                            <Save size={14} /> Save Changes
                        </>
                    )}
                </button>
            </div>

            {/* Split Settings Layout */}
            <div className="edu-settings-grid">
                {/* Cột trái: Điều hướng danh mục */}
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

                {/* Cột phải: Nội dung chi tiết */}
                <main className="settings-content-panel">
                    {/* SECTION 1: PROFILE */}
                    {activeSection === "profile" && (
                        <div className="settings-form-group">
                            <div className="section-narrative-header">
                                <h3>Student Profile Information</h3>
                                <p>
                                    Update your personal details and university academic standing.
                                </p>
                            </div>

                            <div className="form-fields-grid">
                                <div className="input-field-unit">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        value={profile.fullName}
                                        onChange={(e) =>
                                            setProfile({ ...profile, fullName: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="input-field-unit">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        onChange={(e) =>
                                            setProfile({ ...profile, email: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="input-field-unit full-width">
                                    <label>University / College</label>
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
                                    <label>Major / Specialization</label>
                                    <input
                                        type="text"
                                        value={profile.major}
                                        onChange={(e) =>
                                            setProfile({ ...profile, major: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="input-field-unit full-width">
                                    <label>Academic Standing</label>
                                    <input
                                        type="text"
                                        value={profile.academicYear}
                                        onChange={(e) =>
                                            setProfile({ ...profile, academicYear: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: AI TUTOR */}
                    {activeSection === "ai_tutor" && (
                        <div className="settings-form-group">
                            <div className="section-narrative-header">
                                <h3>AI Tutor Teaching Style</h3>
                                <p>
                                    Personalize how your AI companion assists with explanations and
                                    practice.
                                </p>
                            </div>

                            <div className="setting-card-block">
                                <span className="block-title">Explanation Approach</span>
                                <div className="options-radio-cluster">
                                    <label
                                        className={`radio-card-choice ${tutorSettings.responseStyle === "guided" ? "selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="responseStyle"
                                            value="guided"
                                            checked={tutorSettings.responseStyle === "guided"}
                                            onChange={() =>
                                                setTutorSettings({
                                                    ...tutorSettings,
                                                    responseStyle: "guided",
                                                })
                                            }
                                        />
                                        <div>
                                            <strong>Guided Learning (Recommended)</strong>
                                            <p>
                                                Provides step-by-step hints and questions to help
                                                you reason through problems on your own.
                                            </p>
                                        </div>
                                    </label>

                                    <label
                                        className={`radio-card-choice ${tutorSettings.responseStyle === "detailed" ? "selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="responseStyle"
                                            value="detailed"
                                            checked={tutorSettings.responseStyle === "detailed"}
                                            onChange={() =>
                                                setTutorSettings({
                                                    ...tutorSettings,
                                                    responseStyle: "detailed",
                                                })
                                            }
                                        />
                                        <div>
                                            <strong>Comprehensive Direct Answers</strong>
                                            <p>
                                                Gives complete explanations, clear code examples,
                                                and direct solutions immediately.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="setting-card-block">
                                <span className="block-title">Language & Communication Tone</span>
                                <div className="select-dropdown-unit">
                                    <select
                                        value={tutorSettings.tone}
                                        onChange={(e) =>
                                            setTutorSettings({
                                                ...tutorSettings,
                                                tone: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="encouraging">
                                            Encouraging & Supportive
                                        </option>
                                        <option value="friendly">Friendly & Casual</option>
                                        <option value="academic">Academic & Formal</option>
                                    </select>
                                </div>
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Interactive Practice Prompts</strong>
                                    <p>
                                        Suggest short practice questions after explaining difficult
                                        concepts.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="setting-checkbox-toggle"
                                    checked={tutorSettings.autoQuiz}
                                    onChange={(e) =>
                                        setTutorSettings({
                                            ...tutorSettings,
                                            autoQuiz: e.target.checked,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: STUDY GOALS */}
                    {activeSection === "study_goals" && (
                        <div className="settings-form-group">
                            <div className="section-narrative-header">
                                <h3>Daily Study Goals & Review Habits</h3>
                                <p>
                                    Set realistic study targets and enable automatic review tools.
                                </p>
                            </div>

                            <div className="setting-card-block">
                                <div className="range-field-header">
                                    <label>Daily Study Target</label>
                                    <span className="range-metric-chip">
                                        {studyGoals.dailyStudyTarget} minutes / day
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="15"
                                    max="180"
                                    step="15"
                                    value={studyGoals.dailyStudyTarget}
                                    onChange={(e) =>
                                        setStudyGoals({
                                            ...studyGoals,
                                            dailyStudyTarget: Number(e.target.value),
                                        })
                                    }
                                    className="slider-range-input"
                                />
                                <span className="range-subtext">
                                    Recommended daily reading and practice time for semester
                                    courses.
                                </span>
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Auto-generate Study Flashcards</strong>
                                    <p>
                                        Automatically turn important course definitions and formulas
                                        into revision cards.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="setting-checkbox-toggle"
                                    checked={studyGoals.autoFlashcards}
                                    onChange={(e) =>
                                        setStudyGoals({
                                            ...studyGoals,
                                            autoFlashcards: e.target.checked,
                                        })
                                    }
                                />
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Focus Mode during Sessions</strong>
                                    <p>
                                        Hide unnecessary sidebars and secondary widgets while
                                        reading documents.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="setting-checkbox-toggle"
                                    checked={studyGoals.focusMode}
                                    onChange={(e) =>
                                        setStudyGoals({
                                            ...studyGoals,
                                            focusMode: e.target.checked,
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
                                <h3>Reminders & Schedule Alerts</h3>
                                <p>
                                    Choose which alerts you want to receive to keep your study
                                    streak active.
                                </p>
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Daily Study Reminders</strong>
                                    <p>
                                        Get a gentle notification at your chosen study time if you
                                        haven't reviewed yet.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="setting-checkbox-toggle"
                                    checked={notifications.dailyReminder}
                                    onChange={(e) =>
                                        setNotifications({
                                            ...notifications,
                                            dailyReminder: e.target.checked,
                                        })
                                    }
                                />
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Course Deadline Alerts</strong>
                                    <p>
                                        Remind you 2 days before assignment submissions and midterm
                                        exam dates.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="setting-checkbox-toggle"
                                    checked={notifications.assignmentAlerts}
                                    onChange={(e) =>
                                        setNotifications({
                                            ...notifications,
                                            assignmentAlerts: e.target.checked,
                                        })
                                    }
                                />
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Study Streak Keeper</strong>
                                    <p>
                                        Alerts before midnight so you don't lose your consecutive
                                        daily study streak.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="setting-checkbox-toggle"
                                    checked={notifications.streakReminder}
                                    onChange={(e) =>
                                        setNotifications({
                                            ...notifications,
                                            streakReminder: e.target.checked,
                                        })
                                    }
                                />
                            </div>

                            <div className="setting-card-block toggle-row">
                                <div>
                                    <strong>Weekly Learning Summary</strong>
                                    <p>
                                        A concise summary of chapters covered, questions answered,
                                        and quiz scores.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="setting-checkbox-toggle"
                                    checked={notifications.weeklySummary}
                                    onChange={(e) =>
                                        setNotifications({
                                            ...notifications,
                                            weeklySummary: e.target.checked,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Setting;
