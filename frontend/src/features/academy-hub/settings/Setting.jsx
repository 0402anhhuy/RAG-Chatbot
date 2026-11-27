import { useState } from "react";
import { User, Bot, Target, Bell, Check, Save } from "lucide-react";
import { academySettingApi } from "@/api";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import "@/features/academy-hub/settings/Setting.css";
import { getSessionUser } from "@/lib/session";

const SETTINGS_SECTIONS = [
    { id: "profile", label: "Student Profile", icon: User },
    { id: "ai_tutor", label: "AI Tutor Preferences", icon: Bot },
    { id: "study_goals", label: "Study Goals & Focus", icon: Target },
    { id: "notifications", label: "Reminders & Alerts", icon: Bell },
];

// Nhãn cho dropdown "Language & Communication Tone" (CustomSelector dùng chung)
const TONE_OPTIONS = [
    { value: "encouraging", label: "Encouraging & Supportive" },
    { value: "friendly", label: "Friendly & Casual" },
    { value: "academic", label: "Academic & Formal" },
];

const MIN_DAILY_TARGET = 15;
const MAX_DAILY_TARGET = 180;


// Form chỉ giữ chuỗi/number đúng như UI, chuyển đổi khi gửi BE.
const EMPTY_FORM = {
    fullName: "",
    email: "",
    university: "",
    studentId: "",
    major: "",
    academicYear: "",
    responseStyle: "guided",
    tone: "friendly",
    autoQuiz: true,
    dailyStudyTarget: 45,
    autoFlashcards: true,
    focusMode: true,
    dailyReminder: true,
    assignmentAlerts: true,
    streakReminder: true,
    weeklySummary: true,
};

const toForm = (settings) =>
    settings
        ? {
              ...EMPTY_FORM,
              ...settings.profile,
              fullName: settings.profile?.fullName || "",
              email: settings.profile?.email || "",
              university: settings.profile?.university || "",
              studentId: settings.profile?.studentId || "",
              major: settings.profile?.major || "",
              academicYear: settings.profile?.academicYear || "",
              responseStyle: settings.aiTutor?.responseStyle || "guided",
              tone: settings.aiTutor?.tone || "friendly",
              autoQuiz: Boolean(settings.aiTutor?.autoQuiz),
              dailyStudyTarget: settings.studyGoals?.dailyStudyTarget ?? 45,
              autoFlashcards: Boolean(settings.studyGoals?.autoFlashcards),
              focusMode: Boolean(settings.studyGoals?.focusMode),
              dailyReminder: Boolean(settings.notifications?.dailyReminder),
              assignmentAlerts: Boolean(settings.notifications?.assignmentAlerts),
              streakReminder: Boolean(settings.notifications?.streakReminder),
              weeklySummary: Boolean(settings.notifications?.weeklySummary),
          }
        : { ...EMPTY_FORM };

const toPayload = (form) => ({
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    university: form.university.trim(),
    studentId: form.studentId.trim(),
    major: form.major.trim(),
    academicYear: form.academicYear.trim(),
    tutorResponseStyle: form.responseStyle,
    tutorTone: form.tone,
    tutorAutoQuiz: form.autoQuiz,
    dailyStudyTarget: Number(form.dailyStudyTarget),
    autoFlashcards: form.autoFlashcards,
    focusMode: form.focusMode,
    notifyDailyReminder: form.dailyReminder,
    notifyAssignmentAlerts: form.assignmentAlerts,
    notifyStreakReminder: form.streakReminder,
    notifyWeeklySummary: form.weeklySummary,
});

const Setting = () => {
    const sessionUser = getSessionUser();
    const { showToast } = useToast();

    const [activeSection, setActiveSection] = useState("profile");
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const patchForm = (changes) => setForm((prev) => ({ ...prev, ...changes }));

    // ------------------------------------------------------------------ load
    const { loading } = useAsyncData(
        () => academySettingApi.get(sessionUser.id),
        [sessionUser?.id],
        {
            enabled: Boolean(sessionUser?.id),
            onSuccess: (data) => setForm(toForm(data)),
            onError: (err) => {
                setForm({ ...EMPTY_FORM });
                showToast(err.message || "Unable to load your settings.", "error");
            },
        },
    );

    // ------------------------------------------------------------------ save
    const handleSave = async () => {
        if (!sessionUser?.id) {
            showToast("Please sign in again to save your settings.", "error");
            return;
        }

        const target = Number(form.dailyStudyTarget);
        if (!Number.isFinite(target) || target < MIN_DAILY_TARGET || target > MAX_DAILY_TARGET) {
            showToast(
                `Daily study target must be between ${MIN_DAILY_TARGET} and ${MAX_DAILY_TARGET} minutes.`,
                "error",
            );
            return;
        }
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            showToast("Email address is invalid.", "error");
            return;
        }

        try {
            setSaving(true);
            const saved = await academySettingApi.update(sessionUser.id, toPayload(form));
            setForm(toForm(saved));
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2500);
            showToast("Study preferences saved.", "success");
        } catch (err) {
            showToast(err.message || "Unable to save your settings.", "error");
        } finally {
            setSaving(false);
        }
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
                    disabled={loading || saving}
                >
                    {isSaved ? (
                        <>
                            <Check size={14} /> Saved Changes
                        </>
                    ) : (
                        <>
                            <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
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
                                        value={form.fullName}
                                        onChange={(e) => patchForm({ fullName: e.target.value })}
                                    />
                                </div>

                                <div className="input-field-unit">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => patchForm({ email: e.target.value })}
                                    />
                                </div>

                                <div className="input-field-unit full-width">
                                    <label>University / College</label>
                                    <input
                                        type="text"
                                        value={form.university}
                                        onChange={(e) => patchForm({ university: e.target.value })}
                                    />
                                </div>

                                <div className="input-field-unit">
                                    <label>Student ID (MSSV)</label>
                                    <input
                                        type="text"
                                        value={form.studentId}
                                        onChange={(e) => patchForm({ studentId: e.target.value })}
                                    />
                                </div>

                                <div className="input-field-unit">
                                    <label>Major / Specialization</label>
                                    <input
                                        type="text"
                                        value={form.major}
                                        onChange={(e) => patchForm({ major: e.target.value })}
                                    />
                                </div>

                                <div className="input-field-unit full-width">
                                    <label>Academic Standing</label>
                                    <input
                                        type="text"
                                        value={form.academicYear}
                                        onChange={(e) =>
                                            patchForm({ academicYear: e.target.value })
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
                                        className={`radio-card-choice ${form.responseStyle === "guided" ? "selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="responseStyle"
                                            value="guided"
                                            checked={form.responseStyle === "guided"}
                                            onChange={() => patchForm({ responseStyle: "guided" })}
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
                                        className={`radio-card-choice ${form.responseStyle === "detailed" ? "selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="responseStyle"
                                            value="detailed"
                                            checked={form.responseStyle === "detailed"}
                                            onChange={() =>
                                                patchForm({ responseStyle: "detailed" })
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
                                    {/* Dropdown dùng CustomSelector chung thay cho thẻ select mặc định */}
                                    <CustomSelector
                                        options={TONE_OPTIONS}
                                        value={form.tone}
                                        onChange={(value) => patchForm({ tone: value })}
                                        placeholder="Select a tone..."
                                    />
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
                                    checked={form.autoQuiz}
                                    onChange={(e) => patchForm({ autoQuiz: e.target.checked })}
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
                                        {form.dailyStudyTarget} minutes / day
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={MIN_DAILY_TARGET}
                                    max={MAX_DAILY_TARGET}
                                    step="15"
                                    value={form.dailyStudyTarget}
                                    onChange={(e) =>
                                        patchForm({ dailyStudyTarget: Number(e.target.value) })
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
                                    checked={form.autoFlashcards}
                                    onChange={(e) =>
                                        patchForm({ autoFlashcards: e.target.checked })
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
                                    checked={form.focusMode}
                                    onChange={(e) => patchForm({ focusMode: e.target.checked })}
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
                                    checked={form.dailyReminder}
                                    onChange={(e) => patchForm({ dailyReminder: e.target.checked })}
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
                                    checked={form.assignmentAlerts}
                                    onChange={(e) =>
                                        patchForm({ assignmentAlerts: e.target.checked })
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
                                    checked={form.streakReminder}
                                    onChange={(e) =>
                                        patchForm({ streakReminder: e.target.checked })
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
                                    checked={form.weeklySummary}
                                    onChange={(e) => patchForm({ weeklySummary: e.target.checked })}
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
