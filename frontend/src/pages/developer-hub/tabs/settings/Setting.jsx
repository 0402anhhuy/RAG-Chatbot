import { useCallback, useEffect, useState } from "react";
import { Cpu, KeyRound, Loader2, Plus, RotateCw } from "lucide-react";
import { authApi, userSettingsApi } from "../../../../api";
import CustomSelector from "../../../../components/common/selector/CustomSelector";
import { useToast } from "../../../../context/ToastContext";
import "./Setting.css";

const getSessionUserId = () => {
    try {
        return JSON.parse(localStorage.getItem("rag_session") || "{}")?.user?.id || null;
    } catch {
        return null;
    }
};

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
        <div className="provider-input-item">
            <div className="provider-name-line">
                <strong>{provider.providerLabel}</strong>
                <span className="provider-tag">Your key</span>
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
            <button
                type="button"
                className="btn-connect-provider"
                onClick={() => onDisconnect(provider.provider)}
                disabled={busy}
            >
                {busy ? <Loader2 size={13} className="setting-spin" /> : null}
                {busy ? "Disconnecting..." : "Connected"}
            </button>
        </div>
    );
};

// Một dòng provider chưa kết nối: cho nhập key + chọn endpoint qua CustomSelector
const DisconnectedProviderRow = ({ provider, endpointOptions, onConnect, busy }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [endpointCode, setEndpointCode] = useState(endpointOptions[0]?.value || "");

    const submit = async () => {
        const ok = await onConnect(provider.provider, { apiKey, endpointCode });
        if (ok) {
            setIsOpen(false);
            setApiKey("");
        }
    };

    return (
        <div className="provider-input-item">
            <div className="provider-name-line">
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
                    <div className="provider-form-actions">
                        <button
                            type="button"
                            className="btn-connect-provider outlined"
                            onClick={() => {
                                setIsOpen(false);
                                setApiKey("");
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-connect-provider"
                            onClick={submit}
                            disabled={busy || !apiKey.trim()}
                        >
                            {busy ? <Loader2 size={13} className="setting-spin" /> : null}
                            {busy ? "Saving..." : "Save key"}
                        </button>
                    </div>
                </>
            ) : (
                <button
                    type="button"
                    className="btn-connect-provider outlined"
                    onClick={() => setIsOpen(true)}
                >
                    <Plus size={13} />
                    Connect {provider.providerLabel}
                </button>
            )}
        </div>
    );
};

const Setting = () => {
    const { showToast } = useToast();
    const [userId, setUserId] = useState(getSessionUserId);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [pendingProvider, setPendingProvider] = useState(null);

    // Form chỉnh hạn mức Starter Kit
    const [limitValue, setLimitValue] = useState("");
    const [resetDay, setResetDay] = useState("1");
    const [savingLimit, setSavingLimit] = useState(false);

    const loadSettings = useCallback(
        async (signal) => {
            try {
                setLoading(true);
                setError("");

                // Chưa có userId trong session thì hỏi lại BE bằng email trong session
                let activeUserId = userId;
                if (!activeUserId) {
                    const sessionEmail = (() => {
                        try {
                            return JSON.parse(localStorage.getItem("rag_session") || "{}")?.user
                                ?.email;
                        } catch {
                            return null;
                        }
                    })();
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

                if (!activeUserId) return;

                const data = await userSettingsApi.get(activeUserId);
                if (signal?.cancelled) return;

                setSettings(data);
                setLimitValue(String(data?.starterKitUsage?.limit ?? ""));
                setResetDay(String(data?.starterKitUsage?.resetDay ?? "1"));
            } catch (err) {
                if (signal?.cancelled) return;
                setSettings(null);
                setError(err.message || "Unable to load your settings.");
            } finally {
                if (!signal?.cancelled) setLoading(false);
            }
        },
        [userId],
    );

    useEffect(() => {
        const signal = { cancelled: false };
        loadSettings(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [loadSettings, refreshKey]);

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
            setRefreshKey((key) => key + 1);
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
            setRefreshKey((key) => key + 1);
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
        <div className="tab-body-container settings-narrow-wrap">
            <div className="tab-header-banner">
                <h2>User Settings</h2>
                <span>Manage your personal AI model providers and Starter Kit budget.</span>
            </div>

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
                        className="btn-refresh-settings"
                        onClick={() => setRefreshKey((key) => key + 1)}
                    >
                        <RotateCw size={13} />
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && settings && (
                <>
                    {/* Starter Kit Usage */}
                    <div className="settings-section-card">
                        <div className="settings-section-header">
                            <div className="header-meta-wrap">
                                <strong>Prism Developer Kit Usage</strong>
                                <small>
                                    Spend on developer starter models · Resets{" "}
                                    {formatDate(usage?.periodEnd)}
                                </small>
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

                        <div className="settings-limit-form">
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
                            <button
                                type="button"
                                className="btn-connect-provider"
                                onClick={handleSaveLimit}
                                disabled={savingLimit}
                            >
                                {savingLimit ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>

                    {/* LLM Providers */}
                    <div className="settings-section-card">
                        <div className="providers-title-row">
                            <Cpu size={16} />
                            <strong>LLM Providers</strong>
                        </div>
                        <p className="providers-lead-text">
                            Connect personal LLM providers. Models will appear in the
                            &quot;Personal&quot; section of the model picker.
                        </p>

                        {providers.length === 0 ? (
                            <div className="settings-state-row">
                                <KeyRound size={15} />
                                <span>No providers are available yet.</span>
                            </div>
                        ) : (
                            providers.map((provider) => {
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
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Setting;
