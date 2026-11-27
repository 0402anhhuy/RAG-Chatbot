import { useState } from "react";
import { Check, Cpu, KeyRound, Loader2, Plus, RotateCw, Unplug, Wallet } from "lucide-react";
import { authApi, userSettingsApi } from "@/api";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import { getSessionUser, getSessionUserId } from "@/lib/session";
import "@/features/developer-hub/settings/Setting.css";

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

const formatDate = (isoDate) => {
    if (!isoDate) return "—";
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
};

const buildEndpointOptions = (endpoints, providerType) =>
    endpoints
        .filter((endpoint) => endpoint.code.startsWith(`${providerType}_`))
        .map((endpoint) => ({
            value: endpoint.code,
            label: `${endpoint.label} (${endpoint.host})`,
        }));

// Một dòng provider: dùng khi đã kết nối (hiện key đã che + nút Disconnect)
const ConnectedProviderRow = ({ provider, endpointOptions, onDisconnect, busy }) => {
    const [draftEndpoint, setDraftEndpoint] = useState(provider.endpointCode || "");
    const endpointValue = endpointOptions.some((option) => option.value === draftEndpoint)
        ? draftEndpoint
        : endpointOptions[0]?.value || "";

    return (
        <div className="provider-row">
            <div className="provider-row-head">
                <strong>{provider.providerLabel}</strong>
                <span className="provider-status-pill">
                    <Check size={11} />
                    Connected
                </span>
            </div>
            <div className="provider-input-group">
                <input
                    type="text"
                    value={provider.maskedKey || ""}
                    readOnly
                    aria-label={`${provider.providerLabel} API key`}
                />
                <CustomSelector
                    options={endpointOptions}
                    value={endpointValue}
                    onChange={(value) => setDraftEndpoint(value)}
                    placeholder="Endpoint..."
                />
            </div>
            <div className="provider-actions">
                <button
                    type="button"
                    className="btn-provider ghost"
                    onClick={() => onDisconnect(provider.provider)}
                    disabled={busy}
                >
                    {busy ? (
                        <Loader2 size={13} className="setting-spin" />
                    ) : (
                        <Unplug size={13} />
                    )}
                    {busy ? "Disconnecting..." : "Disconnect"}
                </button>
            </div>
        </div>
    );
};

// Một dòng provider chưa kết nối: cho nhập key + chọn endpoint qua CustomSelector
const DisconnectedProviderRow = ({ provider, endpointOptions, onConnect, busy }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [endpointCode, setEndpointCode] = useState(endpointOptions[0]?.value || "");

    const closeForm = () => {
        setIsOpen(false);
        setApiKey("");
    };

    const submit = async () => {
        const ok = await onConnect(provider.provider, { apiKey, endpointCode });
        if (ok) closeForm();
    };

    return (
        <div className="provider-row">
            <div className="provider-row-head">
                <strong>{provider.providerLabel}</strong>
            </div>

            {isOpen ? (
                <>
                    <div className="provider-input-group">
                        <input
                            type="password"
                            placeholder="Paste your API key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            autoComplete="off"
                            aria-label={`${provider.providerLabel} API key`}
                        />
                        {endpointOptions.length > 0 && (
                            <CustomSelector
                                options={endpointOptions}
                                value={endpointCode}
                                onChange={(value) => setEndpointCode(value)}
                                placeholder="Endpoint..."
                            />
                        )}
                    </div>
                    <div className="provider-actions">
                        <button
                            type="button"
                            className="btn-provider outline"
                            onClick={closeForm}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-provider solid"
                            onClick={submit}
                            disabled={busy || !apiKey.trim()}
                        >
                            {busy ? <Loader2 size={13} className="setting-spin" /> : null}
                            {busy ? "Saving..." : "Save key"}
                        </button>
                    </div>
                </>
            ) : (
                <div className="provider-actions">
                    <button
                        type="button"
                        className="btn-provider outline"
                        onClick={() => setIsOpen(true)}
                    >
                        <Plus size={13} />
                        Connect {provider.providerLabel}
                    </button>
                </div>
            )}
        </div>
    );
};

const Setting = () => {
    const { showToast } = useToast();
    const [userId, setUserId] = useState(getSessionUserId);
    const [settings, setSettings] = useState(null);
    const [pendingProvider, setPendingProvider] = useState(null);

    // Form chỉnh hạn mức Starter Kit
    const [limitValue, setLimitValue] = useState("");
    const [resetDay, setResetDay] = useState("1");
    const [savingLimit, setSavingLimit] = useState(false);

    const {
        loading,
        error,
        reload,
    } = useAsyncData(
        async () => {
            // Chưa có userId trong session thì hỏi lại BE bằng email trong session
            let activeUserId = userId;
            if (!activeUserId) {
                const sessionEmail = getSessionUser()?.email;
                if (!sessionEmail) {
                    throw new Error("Please sign in again to manage your settings.");
                }
                const data = await authApi.me();
                activeUserId = data?.data?.userId || data?.userId;
                if (!activeUserId) {
                    throw new Error("Unable to resolve the signed-in user.");
                }
                setUserId(activeUserId);
            }
            return userSettingsApi.get(activeUserId);
        },
        [userId],
        {
            onSuccess: (data) => {
                setSettings(data);
                setLimitValue(String(data?.starterKitUsage?.limit ?? ""));
                setResetDay(String(data?.starterKitUsage?.resetDay ?? "1"));
            },
            onError: () => setSettings(null),
            errorMessage: "Unable to load your settings.",
        },
    );

    const handleSaveLimit = async () => {
        const limit = Number(limitValue);
        const day = Number(resetDay);
        if (Number.isNaN(limit) || limit < 0) {
            showToast("Monthly limit must be zero or greater.", "error");
            return;
        }
        if (!Number.isInteger(day) || day < 1 || day > 28) {
            showToast("Reset day must be between 1 and 28.", "error");
            return;
        }
        try {
            setSavingLimit(true);
            const updated = await userSettingsApi.update(userId, {
                starterKitMonthlyLimit: limit,
                budgetResetDay: day,
            });
            setSettings(updated);
            showToast("Starter Kit limit updated.", "success");
        } catch (err) {
            showToast(err.message || "Unable to update the limit.", "error");
        } finally {
            setSavingLimit(false);
        }
    };

    const handleConnect = async (provider, credentials) => {
        try {
            setPendingProvider(provider);
            await userSettingsApi.connectProvider(userId, provider, credentials);
            reload();
            showToast("Provider connected.", "success");
            return true;
        } catch (err) {
            showToast(err.message || "Unable to connect the provider.", "error");
            return false;
        } finally {
            setPendingProvider(null);
        }
    };

    const handleDisconnect = async (provider) => {
        try {
            setPendingProvider(provider);
            await userSettingsApi.disconnectProvider(userId, provider);
            reload();
            showToast("Provider disconnected.", "success");
        } catch (err) {
            showToast(err.message || "Unable to disconnect the provider.", "error");
        } finally {
            setPendingProvider(null);
        }
    };

    const usage = settings?.starterKitUsage;
    const endpoints = settings?.availableEndpoints || [];
    const providers = settings?.llmProviders || [];

    return (
        <div className="settings-page">
            <header className="settings-page-header">
                <h2>User Settings</h2>
                <p>Manage your personal AI model providers and Starter Kit budget.</p>
            </header>

            {loading && (
                <div className="settings-state-row">
                    <Loader2 size={16} className="setting-spin" />
                    <span>Loading your settings...</span>
                </div>
            )}

            {!loading && error && (
                <div className="settings-state-row settings-state-error" role="alert">
                    <span>{error}</span>
                    <button
                        type="button"
                        className="btn-provider outline"
                        onClick={() => reload()}
                    >
                        <RotateCw size={13} />
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && settings && (
                <div className="settings-stack">
                    {/* Starter Kit Usage */}
                    <section className="settings-section-card">
                        <div className="settings-section-head">
                            <div className="settings-section-title">
                                <span className="settings-icon-chip">
                                    <Wallet size={17} />
                                </span>
                                <div className="header-meta-wrap">
                                    <strong>Prism Developer Kit Usage</strong>
                                    <small>
                                        Spend on developer starter models · Resets{" "}
                                        {formatDate(usage?.periodEnd)}
                                    </small>
                                </div>
                            </div>
                            <span className="spend-number">
                                {formatMoney(usage?.spent)} / {formatMoney(usage?.limit)} (
                                {usage?.percentUsed ?? 0}%)
                            </span>
                        </div>

                        <div className="spend-progress-bar">
                            <div
                                className="spend-bar-fill"
                                style={{ width: `${Math.min(usage?.percentUsed ?? 0, 100)}%` }}
                            />
                        </div>

                        <form
                            className="settings-limit-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                handleSaveLimit();
                            }}
                        >
                            <label className="settings-inline-field">
                                <span>Monthly limit ($)</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={limitValue}
                                    onChange={(e) => setLimitValue(e.target.value)}
                                />
                            </label>
                            <label className="settings-inline-field">
                                <span>Reset day</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="28"
                                    value={resetDay}
                                    onChange={(e) => setResetDay(e.target.value)}
                                />
                            </label>
                            <button type="submit" className="btn-save-limit" disabled={savingLimit}>
                                {savingLimit ? "Saving..." : "Save changes"}
                            </button>
                        </form>
                    </section>

                    {/* LLM Providers */}
                    <section className="settings-section-card">
                        <div className="settings-section-title">
                            <span className="settings-icon-chip">
                                <Cpu size={17} />
                            </span>
                            <div className="header-meta-wrap">
                                <strong>LLM Providers</strong>
                                <small>
                                    Connected models appear in the &quot;Personal&quot; section of
                                    the model picker.
                                </small>
                            </div>
                        </div>

                        {providers.length === 0 ? (
                            <div className="settings-state-row settings-state-inline">
                                <KeyRound size={15} />
                                <span>No providers are available yet.</span>
                            </div>
                        ) : (
                            <div className="provider-list">
                                {providers.map((provider) => {
                                    const endpointOptions = buildEndpointOptions(
                                        endpoints,
                                        provider.provider,
                                    );
                                    return provider.connected ? (
                                        <ConnectedProviderRow
                                            key={provider.provider}
                                            provider={provider}
                                            endpointOptions={endpointOptions}
                                            onDisconnect={handleDisconnect}
                                            busy={pendingProvider === provider.provider}
                                        />
                                    ) : (
                                        <DisconnectedProviderRow
                                            key={provider.provider}
                                            provider={provider}
                                            endpointOptions={endpointOptions}
                                            onConnect={handleConnect}
                                            busy={pendingProvider === provider.provider}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
};

export default Setting;
