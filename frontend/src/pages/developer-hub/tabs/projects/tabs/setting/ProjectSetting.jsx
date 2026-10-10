import { useState } from "react";
import {
    Sliders,
    Sparkles,
    Terminal,
    Archive,
    Folder,
    Save,
    RotateCcw,
    Plus,
    Eye,
    EyeOff,
    Check,
    ArchiveRestore,
} from "lucide-react";
import "./ProjectSetting.css";

const EXCLUDED_PATHS_DEFAULT = `node_modules
bower_components
vendor
jspm_packages
dist
build
.next
.git`;

const ARCHIVED_TASKS_DATA = [
    { id: "a1", title: "EE (Sep) < Norm", status: "completed", date: "Archived 10/6/2026" },
    {
        id: "a2",
        title: "[Admin] Modal kết quả Add Users không handle overflow khi danh sách user quá dài",
        status: "in_progress",
        date: "Archived 10/6/2026",
    },
    {
        id: "a3",
        title: "[Planning Task] Define Project Config",
        status: "completed",
        date: "Archived 10/6/2026",
    },
    {
        id: "a4",
        title: "[Planning Task] Resource Allocation",
        status: "completed",
        date: "Archived 10/6/2026",
    },
    { id: "a5", title: "Management", status: "in_progress", date: "Archived 10/6/2026" },
    {
        id: "a6",
        title: "[Localization] Một số nội dung luôn hiển thị bằng English khi chuyển Language sang Tiếng Việt hoặc 日本語",
        status: "in_progress",
        date: "Archived 10/6/2026",
    },
    {
        id: "a7",
        title: "[Network Issue][Upload File] Upload file failed in VibeFlow",
        status: "in_progress",
        date: "Archived 10/6/2026",
    },
    { id: "a8", title: "kkhoan < norm", status: "in_progress", date: "Archived 10/6/2026" },
    {
        id: "a9",
        title: "[Workbench IDE] Không hiển thị cảnh báo khi tạo file trùng tên trong cùng folder",
        status: "in_progress",
        date: "Archived 10/6/2026",
    },
    {
        id: "a10",
        title: "[Planning Task] Define Project Productivity",
        status: "completed",
        date: "Archived 10/6/2026",
    },
    {
        id: "a11",
        title: "[Project] Opening Archived Project Redirects User to Home Page",
        status: "in_progress",
        date: "Archived 10/6/2026",
    },
    {
        id: "a12",
        title: "[Conversation List] Archive icon/button is incorrectly displayed for archived conversations",
        status: "in_progress",
        date: "Archived 10/6/2026",
    },
    {
        id: "a13",
        title: "[Workbench Change] Commit Fail nhưng mà vẫn ẩn file trong Workbench change",
        status: "in_progress",
        date: "Archived 10/6/2026",
    },
    {
        id: "a14",
        title: '[IDE] Xóa file thành công nhưng hệ thống hiển thị thông báo lỗi "Delete failed HTTP 404"',
        status: "in_progress",
        date: "Archived 10/6/2026",
    },
    {
        id: "a15",
        title: "[Planning Task] Hold Project KickOff Meeting",
        status: "completed",
        date: "Archived 10/6/2026",
    },
];

const ProjectSetting = ({ projectName = "DMS AI Hub" }) => {
    const [subTab, setSubTab] = useState("general"); // "general" | "llm" | "sandboxes" | "archived"

    // Form General
    const [name, setName] = useState(projectName);
    const [description, setDescription] = useState("");
    const [excludedPaths, setExcludedPaths] = useState(EXCLUDED_PATHS_DEFAULT);
    const [hoursPerDay, setHoursPerDay] = useState(8);
    const [daysPerMonth, setDaysPerMonth] = useState(20);
    const [referenceRate, setReferenceRate] = useState(2000);

    // Form LLM + Budget
    const [isAddingProvider, setIsAddingProvider] = useState(false);
    const [providerType, setProviderType] = useState("Google Gemini");
    const [apiKey, setApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [allowStarterKit, setAllowStarterKit] = useState(true);
    const [allowPersonalProviders, setAllowPersonalProviders] = useState(true);
    const [enableBudgetTracking, setEnableBudgetTracking] = useState(false);

    // Danh sách Archived
    const [archivedTasks, setArchivedTasks] = useState(ARCHIVED_TASKS_DATA);

    const handleUnarchive = (taskId) => {
        setArchivedTasks((prev) => prev.filter((t) => t.id !== taskId));
    };

    return (
        <div className="vibe-settings-page-viewport">
            {/* Thanh điều hướng Sub-tabs trên cùng */}
            <div className="settings-subtabs-nav-bar">
                <button
                    type="button"
                    className={`btn-settings-subtab ${subTab === "general" ? "active" : ""}`}
                    onClick={() => setSubTab("general")}
                >
                    <Sliders size={14} />
                    <span>General</span>
                </button>
                <button
                    type="button"
                    className={`btn-settings-subtab ${subTab === "llm" ? "active" : ""}`}
                    onClick={() => setSubTab("llm")}
                >
                    <Sparkles size={14} />
                    <span>LLM + Budget</span>
                </button>
                <button
                    type="button"
                    className={`btn-settings-subtab ${subTab === "sandboxes" ? "active" : ""}`}
                    onClick={() => setSubTab("sandboxes")}
                >
                    <Terminal size={14} />
                    <span>Sandboxes</span>
                </button>
                <button
                    type="button"
                    className={`btn-settings-subtab ${subTab === "archived" ? "active" : ""}`}
                    onClick={() => setSubTab("archived")}
                >
                    <Archive size={14} />
                    <span>Archived</span>
                </button>
            </div>

            {/* ======================================================== */}
            {/* 1. VIEW: GENERAL                                         */}
            {/* ======================================================== */}
            {subTab === "general" && (
                <div className="settings-general-center-container">
                    <div className="settings-surface-card">
                        <div className="card-top-title-group">
                            <h3>Project Settings</h3>
                            <p>Manage project configuration</p>
                        </div>

                        {/* Project Type */}
                        <div className="settings-field-item">
                            <label className="settings-label">Project Type</label>
                            <div className="project-type-row">
                                <Folder size={15} className="folder-glyph" />
                                <span>Local Project</span>
                            </div>
                        </div>

                        {/* Project Name * */}
                        <div className="settings-field-item">
                            <label className="settings-label">
                                Project Name <span className="req-star">*</span>
                            </label>
                            <input
                                type="text"
                                className="input-settings-pill"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div className="settings-field-item">
                            <label className="settings-label">Description</label>
                            <textarea
                                className="textarea-settings-box"
                                rows={3}
                                placeholder="A brief description of your project..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Local Sync — excluded paths */}
                        <div className="settings-field-item">
                            <div className="label-with-right-btn-line">
                                <label className="settings-label">
                                    Local Sync — excluded paths
                                </label>
                                <button
                                    type="button"
                                    className="btn-restore-default"
                                    onClick={() => setExcludedPaths(EXCLUDED_PATHS_DEFAULT)}
                                >
                                    Restore default
                                </button>
                            </div>
                            <textarea
                                className="textarea-excluded-paths"
                                rows={6}
                                value={excludedPaths}
                                onChange={(e) => setExcludedPaths(e.target.value)}
                            />
                            <p className="excluded-paths-explain-text">
                                One path segment per line — this starts as the built-in list; add or
                                remove lines freely. A file is skipped when ANY folder in its path
                                matches, at any depth, so &quot;node_modules&quot; also covers
                                &quot;web/frontend/node_modules&quot;. Matching is by whole segment,
                                not prefix or glob. Clear every line to sync everything;
                                &quot;Restore default&quot; puts the built-in list back.
                            </p>
                        </div>

                        {/* Analytics Constants Thẻ con */}
                        <div className="analytics-constants-nested-card">
                            <div className="constants-title-block">
                                <strong>Analytics Constants</strong>
                                <p>
                                    Reference basis for the Cost-to-Revenue and Effort Variance
                                    cards on the Analytics tab. These are a reference rate, not
                                    billing.
                                </p>
                            </div>

                            <div className="constants-three-inputs-grid">
                                <div className="constant-input-col">
                                    <div className="constant-header-line">
                                        <span>Hours per man-day</span>
                                        <small>DEFAULT</small>
                                    </div>
                                    <div className="constant-pill-input-wrap">
                                        <input
                                            type="number"
                                            value={hoursPerDay}
                                            onChange={(e) => setHoursPerDay(e.target.value)}
                                        />
                                        <span className="unit-label">h</span>
                                    </div>
                                    <small className="constant-sub-hint">
                                        Working hours in one man-day
                                    </small>
                                </div>

                                <div className="constant-input-col">
                                    <div className="constant-header-line">
                                        <span>Days per man-month</span>
                                        <small>DEFAULT</small>
                                    </div>
                                    <div className="constant-pill-input-wrap">
                                        <input
                                            type="number"
                                            value={daysPerMonth}
                                            onChange={(e) => setDaysPerMonth(e.target.value)}
                                        />
                                        <span className="unit-label">d</span>
                                    </div>
                                    <small className="constant-sub-hint">
                                        Working days in one man-month
                                    </small>
                                </div>

                                <div className="constant-input-col">
                                    <div className="constant-header-line">
                                        <span>Reference rate per man-month</span>
                                        <small>DEFAULT</small>
                                    </div>
                                    <div className="constant-pill-input-wrap">
                                        <input
                                            type="number"
                                            value={referenceRate}
                                            onChange={(e) => setReferenceRate(e.target.value)}
                                        />
                                        <span className="unit-label">$</span>
                                    </div>
                                    <small className="constant-sub-hint">
                                        Reference only — never shown as real revenue
                                    </small>
                                </div>
                            </div>

                            <div className="constants-footer-calc">
                                <span>
                                    Hours per man-month:{" "}
                                    {Number(hoursPerDay) * Number(daysPerMonth)}
                                </span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="settings-footer-action-bar">
                            <button type="button" className="btn-cancel-settings-pill">
                                Cancel
                            </button>
                            <button type="button" className="btn-save-settings-pill">
                                <Save size={14} />
                                <span>Save</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 2. VIEW: LLM + BUDGET                                    */}
            {/* ======================================================== */}
            {subTab === "llm" && (
                <div className="settings-llm-center-container">
                    {/* Header LLM Providers */}
                    <div className="llm-section-header-row">
                        <div className="llm-header-texts">
                            <div className="llm-sparkle-title">
                                <Sparkles size={16} className="sparkle-glyph" />
                                <h4>LLM Providers</h4>
                            </div>
                            <p>Configure one or more cloud LLM providers for this project</p>
                        </div>

                        {!isAddingProvider && (
                            <button
                                type="button"
                                className="btn-add-provider-pill"
                                onClick={() => setIsAddingProvider(true)}
                            >
                                <Plus size={14} />
                                <span>Add Provider</span>
                            </button>
                        )}
                    </div>

                    {/* Form Add Provider hoặc Khung Empty State */}
                    {isAddingProvider ? (
                        <div className="add-provider-form-card">
                            <h5>Add Provider</h5>
                            <div className="provider-form-fields">
                                <div className="provider-field-item">
                                    <label>Provider</label>
                                    <select
                                        className="select-provider-pill"
                                        value={providerType}
                                        onChange={(e) => setProviderType(e.target.value)}
                                    >
                                        <option value="Google Gemini">Google Gemini</option>
                                        <option value="OpenAI">OpenAI</option>
                                        <option value="Anthropic Claude">Anthropic Claude</option>
                                    </select>
                                </div>

                                <div className="provider-field-item">
                                    <label>API Key</label>
                                    <div className="api-key-input-wrap">
                                        <input
                                            type={showApiKey ? "text" : "password"}
                                            placeholder="AIza..."
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="btn-toggle-eye"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                        >
                                            {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="provider-form-actions">
                                    <button
                                        type="button"
                                        className="btn-cancel-link"
                                        onClick={() => setIsAddingProvider(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-add-verify-pill"
                                        onClick={() => setIsAddingProvider(false)}
                                    >
                                        <Plus size={14} />
                                        <span>Add &amp; Verify</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-llm-provider-card">
                            <Sparkles size={24} className="empty-sparkle-center" />
                            <p>No LLM providers configured yet.</p>
                            <button
                                type="button"
                                className="btn-add-provider-center"
                                onClick={() => setIsAddingProvider(true)}
                            >
                                <Plus size={14} />
                                <span>Add Provider</span>
                            </button>
                        </div>
                    )}

                    {/* Provider Access Switches */}
                    <div className="provider-access-card">
                        <div className="access-title-block">
                            <h5>Provider access</h5>
                            <p>
                                Choose which credential sources this project may use. When both are
                                off, only the providers configured above can be used — members whose
                                only access is a personal key or the Starter Kit will not be able to
                                start a sandbox on this project.
                            </p>
                        </div>

                        <div className="toggle-switch-line">
                            <div className="switch-text-meta">
                                <strong>Allow the VibeFlow Starter Kit</strong>
                                <span>
                                    Members may run this project on the shared platform Starter Kit
                                    models.
                                </span>
                            </div>
                            <label className="toggle-switch-label">
                                <input
                                    type="checkbox"
                                    checked={allowStarterKit}
                                    onChange={(e) => setAllowStarterKit(e.target.checked)}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>

                        <div className="toggle-switch-line">
                            <div className="switch-text-meta">
                                <strong>Allow members&apos; personal providers</strong>
                                <span>
                                    Members may run this project on the providers they connected to
                                    their own account.
                                </span>
                            </div>
                            <label className="toggle-switch-label">
                                <input
                                    type="checkbox"
                                    checked={allowPersonalProviders}
                                    onChange={(e) => setAllowPersonalProviders(e.target.checked)}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>

                        <small className="access-footer-subhint">
                            Applies to new sandboxes. A running sandbox keeps its current providers
                            until it is restarted or refreshed.
                        </small>
                    </div>

                    {/* Budget Settings */}
                    <div className="budget-settings-card">
                        <div className="budget-header-block">
                            <div className="budget-title-row">
                                <span className="dollar-badge-glyph">$</span>
                                <h5>Budget Settings</h5>
                            </div>
                            <p>Set a monthly spending limit for LLM usage in this project</p>
                        </div>

                        <div className="toggle-switch-line">
                            <div className="switch-text-meta">
                                <strong>Enable Budget Tracking</strong>
                                <span>
                                    When enabled, LLM usage is tracked and runs are blocked when the
                                    limit is exceeded
                                </span>
                            </div>
                            <label className="toggle-switch-label">
                                <input
                                    type="checkbox"
                                    checked={enableBudgetTracking}
                                    onChange={(e) => setEnableBudgetTracking(e.target.checked)}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>

                        <div className="budget-footer-action">
                            <button type="button" className="btn-save-budget-pill">
                                <Save size={14} />
                                <span>Save Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 3. VIEW: SANDBOXES                                       */}
            {/* ======================================================== */}
            {subTab === "sandboxes" && (
                <div className="settings-sandboxes-viewport">
                    <div className="sandboxes-table-wrapper">
                        <table className="sandboxes-data-table">
                            <thead>
                                <tr>
                                    <th>STATUS</th>
                                    <th>USER</th>
                                    <th>START / END</th>
                                    <th>DURATION</th>
                                    <th>CONVERSATIONS</th>
                                    <th>PROMPTS</th>
                                    <th>ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <div className="sandbox-status-stopped">
                                            <span className="stopped-square-glyph">■</span>
                                            <span>Stopped</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="sandbox-user-row">
                                            <div className="user-avatar-tiny">HT</div>
                                            <strong>Huy Tran Anh</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="sandbox-time-column">
                                            <span>
                                                Yesterday <strong>09:41:52 PM</strong>
                                            </span>
                                            <small>— 10:45:09 PM</small>
                                        </div>
                                    </td>
                                    <td>1h 3m</td>
                                    <td>
                                        <span className="metric-glyph-count">💬 0</span>
                                    </td>
                                    <td>
                                        <span className="metric-glyph-count">⚡ 0</span>
                                    </td>
                                    <td>
                                        <code className="sandbox-id-code">9d73c570</code>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 4. VIEW: ARCHIVED                                        */}
            {/* ======================================================== */}
            {subTab === "archived" && (
                <div className="settings-archived-viewport">
                    <div className="archived-count-header">
                        <span>{archivedTasks.length} archived tasks</span>
                    </div>

                    <div className="archived-tasks-list">
                        {archivedTasks.map((item) => (
                            <div key={item.id} className="archived-task-row-card">
                                <div className="archived-task-info">
                                    <strong className="archived-task-title">{item.title}</strong>
                                    <div className="archived-meta-badges">
                                        <span className={`archived-status-tag ${item.status}`}>
                                            {item.status}
                                        </span>
                                        <span className="archived-date-text">{item.date}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn-unarchive-pill"
                                    onClick={() => handleUnarchive(item.id)}
                                >
                                    <ArchiveRestore size={14} />
                                    <span>Unarchive</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSetting;
