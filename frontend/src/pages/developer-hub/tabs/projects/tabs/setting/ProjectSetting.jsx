import { useCallback, useEffect, useState } from "react";
import {
    Sliders,
    Sparkles,
    Archive,
    Folder,
    Save,
    Plus,
    Eye,
    EyeOff,
    ArchiveRestore,
    Loader2,
    Trash2,
} from "lucide-react";
import { projectSettingApi } from "../../../../../../api";
import CustomSelector from "../../../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../../../context/ToastContext";
import "./ProjectSetting.css";

// Provider mà người dùng có thể thêm key cho project (khớp ProviderType của BE).
const PROVIDER_OPTIONS = [
    { value: "GOOGLE", label: "Google Gemini" },
    { value: "OPENAI", label: "OpenAI" },
    { value: "ANTHROPIC", label: "Anthropic Claude" },
    { value: "FPT_CLOUD", label: "FPT Cloud" },
];

// Giá trị mặc định giữ chỗ trong lúc tải settings; BE luôn trả về số thật.
const EMPTY_FORM = {
    name: "",
    description: "",
    excludedPaths: "",
    hoursPerDay: 8,
    daysPerMonth: 20,
    referenceRate: 2000,
};

const ProjectSetting = ({ project = null }) => {
    const projectId = project?.id || null;
    const { showToast } = useToast();

    const [subTab, setSubTab] = useState("general"); // "general" | "llm" | "archived"

    const [loading, setLoading] = useState(false);
    const [savingGeneral, setSavingGeneral] = useState(false);
    const [savingBudget, setSavingBudget] = useState(false);
    const [addingProvider, setAddingProvider] = useState(false);
    const [restoringTaskId, setRestoringTaskId] = useState(null);

    // Form General
    const [form, setForm] = useState(EMPTY_FORM);
    const [projectType, setProjectType] = useState("LOCAL");
    const [savedForm, setSavedForm] = useState(EMPTY_FORM);

    // LLM + Budget
    const [isAddingProvider, setIsAddingProvider] = useState(false);
    const [providerType, setProviderType] = useState("GOOGLE");
    const [apiKey, setApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [providers, setProviders] = useState([]);
    const [allowStarterKit, setAllowStarterKit] = useState(true);
    const [allowPersonalProviders, setAllowPersonalProviders] = useState(true);
    const [enableBudgetTracking, setEnableBudgetTracking] = useState(false);
    const [budgetLimit, setBudgetLimit] = useState("");

    // Danh sách Archived
    const [archivedTasks, setArchivedTasks] = useState([]);
    const [archivedLoading, setArchivedLoading] = useState(false);

    const applySettings = (data) => {
        if (!data) return;
        const nextForm = {
            name: data.name ?? "",
            description: data.description ?? "",
            excludedPaths: data.excludedPaths ?? "",
            hoursPerDay: data.hoursPerDay ?? 8,
            daysPerMonth: data.daysPerMonth ?? 20,
            referenceRate: data.referenceRate ?? 0,
        };
        setForm(nextForm);
        setSavedForm(nextForm);
        setProjectType(data.projectType || "LOCAL");
        setProviders(data.providers || []);
        setAllowStarterKit(Boolean(data.allowStarterKit));
        setAllowPersonalProviders(Boolean(data.allowPersonalProviders));
        setEnableBudgetTracking(Boolean(data.budgetTrackingEnabled));
        setBudgetLimit(
            data.monthlyBudgetLimit === null || data.monthlyBudgetLimit === undefined
                ? ""
                : String(data.monthlyBudgetLimit),
        );
    };

    const loadSettings = useCallback(
        async (signal) => {
            if (!projectId) {
                setForm(EMPTY_FORM);
                return;
            }
            try {
                setLoading(true);
                const data = await projectSettingApi.get(projectId);
                if (!signal?.cancelled) applySettings(data);
            } catch (err) {
                if (signal?.cancelled) return;
                showToast(err.message || "Unable to load project settings.", "error");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [projectId, showToast],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadSettings(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadSettings]);

    const loadArchivedTasks = useCallback(
        async (signal) => {
            if (!projectId) {
                setArchivedTasks([]);
                return;
            }
            try {
                setArchivedLoading(true);
                const data = await projectSettingApi.listArchivedTasks(projectId);
                if (!signal?.cancelled) setArchivedTasks(data || []);
            } catch (err) {
                if (signal?.cancelled) return;
                setArchivedTasks([]);
                showToast(err.message || "Unable to load archived tasks.", "error");
            } finally {
                if (!signal?.cancelled) setArchivedLoading(false);
            }
        },
        [projectId, showToast],
    );

    useEffect(() => {
        if (subTab !== "archived") return undefined;
        const signal = { cancelled: false };
        loadArchivedTasks(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [subTab, loadArchivedTasks]);

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const handleSaveGeneral = async () => {
        if (!projectId) return;
        if (!form.name.trim()) {
            showToast("Project name is required.", "info");
            return;
        }
        try {
            setSavingGeneral(true);
            const saved = await projectSettingApi.update(projectId, {
                name: form.name.trim(),
                description: form.description,
                excludedPaths: form.excludedPaths,
                hoursPerDay: Number(form.hoursPerDay) || 1,
                daysPerMonth: Number(form.daysPerMonth) || 1,
                referenceRate: Number(form.referenceRate) || 0,
            });
            applySettings(saved);
            showToast("Project settings saved.", "success");
        } catch (err) {
            showToast(err.message || "Unable to save project settings.", "error");
        } finally {
            setSavingGeneral(false);
        }
    };

    const handleCancelGeneral = () => {
        setForm(savedForm);
        showToast("Changes discarded.", "info");
    };

    const handleAddProvider = async () => {
        if (!projectId) return;
        if (!apiKey.trim()) {
            showToast("Enter an API key first.", "info");
            return;
        }
        try {
            setAddingProvider(true);
            const saved = await projectSettingApi.addProvider(projectId, {
                provider: providerType,
                apiKey: apiKey.trim(),
            });
            applySettings(saved);
            setApiKey("");
            setIsAddingProvider(false);
            showToast("Provider added and verified.", "success");
        } catch (err) {
            showToast(err.message || "Unable to add the provider.", "error");
        } finally {
            setAddingProvider(false);
        }
    };

    const handleRemoveProvider = async (credential) => {
        if (!projectId) return;
        try {
            const saved = await projectSettingApi.removeProvider(projectId, credential.id);
            applySettings(saved);
            showToast("Provider removed.", "success");
        } catch (err) {
            showToast(err.message || "Unable to remove the provider.", "error");
        }
    };

    const handleSaveBudget = async () => {
        if (!projectId) return;
        try {
            setSavingBudget(true);
            const saved = await projectSettingApi.update(projectId, {
                allowStarterKit,
                allowPersonalProviders,
                budgetTrackingEnabled: enableBudgetTracking,
                monthlyBudgetLimit: budgetLimit === "" ? null : Number(budgetLimit),
            });
            applySettings(saved);
            showToast("Budget settings saved.", "success");
        } catch (err) {
            showToast(err.message || "Unable to save budget settings.", "error");
        } finally {
            setSavingBudget(false);
        }
    };

    const handleUnarchive = async (taskId) => {
        if (!projectId) return;
        try {
            setRestoringTaskId(taskId);
            await projectSettingApi.unarchiveTask(projectId, taskId);
            setArchivedTasks((prev) => prev.filter((task) => task.id !== taskId));
            showToast("Task restored to the board.", "success");
        } catch (err) {
            showToast(err.message || "Unable to restore the task.", "error");
        } finally {
            setRestoringTaskId(null);
        }
    };

    if (!projectId) {
        return (
            <div className="vibe-settings-page-viewport">
                <div className="settings-surface-card">
                    <p role="alert">Open a project first to manage its settings.</p>
                </div>
            </div>
        );
    }

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
                    {loading && <Loader2 size={12} className="settings-spinner" />}
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
                                <span>
                                    {projectType === "REMOTE" ? "Remote Project" : "Local Project"}
                                </span>
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
                                value={form.name}
                                onChange={(e) => setField("name", e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div className="settings-field-item">
                            <label className="settings-label">Description</label>
                            <textarea
                                className="textarea-settings-box"
                                rows={3}
                                placeholder="A brief description of your project..."
                                value={form.description}
                                onChange={(e) => setField("description", e.target.value)}
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
                                    onClick={async () => {
                                        // Lấy lại đúng danh sách mặc định từ BE
                                        try {
                                            const saved = await projectSettingApi.update(
                                                projectId,
                                                {
                                                    excludedPaths: null,
                                                },
                                            );
                                            setField("excludedPaths", saved.excludedPaths);
                                            showToast("Default list restored.", "success");
                                        } catch (err) {
                                            showToast(
                                                err.message ||
                                                    "Unable to restore the default list.",
                                                "error",
                                            );
                                        }
                                    }}
                                >
                                    Restore default
                                </button>
                            </div>
                            <textarea
                                className="textarea-excluded-paths"
                                rows={6}
                                value={form.excludedPaths}
                                onChange={(e) => setField("excludedPaths", e.target.value)}
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
                                            value={form.hoursPerDay}
                                            onChange={(e) =>
                                                setField("hoursPerDay", e.target.value)
                                            }
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
                                            value={form.daysPerMonth}
                                            onChange={(e) =>
                                                setField("daysPerMonth", e.target.value)
                                            }
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
                                            value={form.referenceRate}
                                            onChange={(e) =>
                                                setField("referenceRate", e.target.value)
                                            }
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
                                    {Number(form.hoursPerDay) * Number(form.daysPerMonth)}
                                </span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="settings-footer-action-bar">
                            <button
                                type="button"
                                className="btn-cancel-settings-pill"
                                onClick={handleCancelGeneral}
                                disabled={savingGeneral}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-save-settings-pill"
                                onClick={handleSaveGeneral}
                                disabled={savingGeneral}
                            >
                                {savingGeneral ? (
                                    <Loader2 size={14} className="settings-spinner" />
                                ) : (
                                    <Save size={14} />
                                )}
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

                    {/* Danh sách provider đã cấu hình cho project */}
                    {providers.length > 0 && (
                        <div className="settings-archived-viewport">
                            {providers.map((provider) => (
                                <div key={provider.id} className="archived-task-row-card">
                                    <div className="archived-task-info">
                                        <strong className="archived-task-title">
                                            {PROVIDER_OPTIONS.find(
                                                (option) => option.value === provider.providerType,
                                            )?.label || provider.providerType}
                                        </strong>
                                        <div className="archived-meta-badges">
                                            <span className="archived-status-tag completed">
                                                {provider.verified ? "verified" : "unverified"}
                                            </span>
                                            <span className="archived-date-text">
                                                {provider.apiKeyMasked}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-unarchive-pill"
                                        onClick={() => handleRemoveProvider(provider)}
                                    >
                                        <Trash2 size={14} />
                                        <span>Remove</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Form Add Provider hoặc Khung Empty State */}
                    {isAddingProvider ? (
                        <div className="add-provider-form-card">
                            <h5>Add Provider</h5>
                            <div className="provider-form-fields">
                                <div className="provider-field-item">
                                    <label>Provider</label>
                                    <CustomSelector
                                        options={PROVIDER_OPTIONS}
                                        value={providerType}
                                        onChange={setProviderType}
                                        placeholder="Select provider"
                                        className="select-provider-pill"
                                    />
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
                                        onClick={() => {
                                            setIsAddingProvider(false);
                                            setApiKey("");
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-add-verify-pill"
                                        onClick={handleAddProvider}
                                        disabled={addingProvider}
                                    >
                                        {addingProvider ? (
                                            <Loader2 size={14} className="settings-spinner" />
                                        ) : (
                                            <Plus size={14} />
                                        )}
                                        <span>Add &amp; Verify</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        providers.length === 0 && (
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
                        )
                    )}

                    {/* Provider Access Switches */}
                    <div className="provider-access-card">
                        <div className="access-title-block">
                            <h5>Provider access</h5>
                            <p>
                                Choose which credential sources this project may use. When both are
                                off, only the providers configured above can be used — members whose
                                only access is a personal key or the Starter Kit will have no model
                                available for this project.
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

                        {enableBudgetTracking && (
                            <div className="toggle-switch-line">
                                <div className="switch-text-meta">
                                    <strong>Monthly limit</strong>
                                    <span>Spending cap in USD for the current billing month.</span>
                                </div>
                                <div className="constant-pill-input-wrap">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={budgetLimit}
                                        onChange={(e) => setBudgetLimit(e.target.value)}
                                    />
                                    <span className="unit-label">$</span>
                                </div>
                            </div>
                        )}

                        <div className="budget-footer-action">
                            <button
                                type="button"
                                className="btn-save-budget-pill"
                                onClick={handleSaveBudget}
                                disabled={savingBudget}
                            >
                                {savingBudget ? (
                                    <Loader2 size={14} className="settings-spinner" />
                                ) : (
                                    <Save size={14} />
                                )}
                                <span>Save Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 3. VIEW: ARCHIVED                                        */}
            {/* ======================================================== */}
            {subTab === "archived" && (
                <div className="settings-archived-viewport">
                    <div className="archived-count-header">
                        <span>{archivedTasks.length} archived tasks</span>
                    </div>

                    <div className="archived-tasks-list">
                        {archivedLoading ? (
                            <p>Loading archived tasks...</p>
                        ) : archivedTasks.length === 0 ? (
                            <p>No archived tasks in this project.</p>
                        ) : (
                            archivedTasks.map((item) => (
                                <div key={item.id} className="archived-task-row-card">
                                    <div className="archived-task-info">
                                        <strong className="archived-task-title">
                                            {item.title}
                                        </strong>
                                        <div className="archived-meta-badges">
                                            <span
                                                className={`archived-status-tag ${item.statusLabel}`}
                                            >
                                                {item.statusLabel}
                                            </span>
                                            <span className="archived-date-text">
                                                {item.archivedLabel}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-unarchive-pill"
                                        onClick={() => handleUnarchive(item.id)}
                                        disabled={restoringTaskId === item.id}
                                    >
                                        <ArchiveRestore size={14} />
                                        <span>Unarchive</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSetting;
