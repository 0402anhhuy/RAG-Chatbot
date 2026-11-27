import { useMemo, useState } from "react";
import {
    BarChart3,
    DollarSign,
    Code,
    ArrowDownToLine,
    ArrowUpFromLine,
    Database,
    ListTree,
    Zap,
    CheckCircle2,
    Trash2,
    Download,
    FileCode,
    Loader2,
    RefreshCw,
} from "lucide-react";
import { analyticsApi } from "@/api";
import { useAsyncData } from "@/hooks/useAsyncData.js";
import CustomSelector from "@/components/selector/CustomSelector.jsx";
import { useToast } from "@/context/ToastContext.jsx";
import { CostTrendChart, CodeActivityChart } from "@/features/developer-hub/projects/analytics/helpers/AnalyticsCharts.jsx";
import {
    EMPTY,
    currentMonthValue,
    formatCache,
    formatCost,
    formatCount,
    formatInOut,
    formatPercent,
    formatSigned,
    formatTokens,
    initialsOf,
    monthOptions,
} from "@/features/developer-hub/projects/analytics/helpers/analyticsFormat.js";
import "@/features/developer-hub/projects/analytics/ProjectAnalytics.css";

const SUB_TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "cost", label: "Cost & Usage", icon: DollarSign },
    { id: "code", label: "Code Activity", icon: Code },
];

const CSV_HEADERS = [
    "Provider",
    "Model",
    "Cost (USD)",
    "Tokens in",
    "Tokens out",
    "Cache read",
    "Cache write",
    "Steps",
    "% of total",
];

const PROJECT_TYPES = {
    PROVIDER: "provider",
    MEMBER: "member",
};

const toCsvCell = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const buildProviderCsv = (rows) =>
    [
        CSV_HEADERS.join(","),
        ...rows.map((row) =>
            [
                row.provider,
                row.model,
                row.cost.toFixed(6),
                row.tokensIn,
                row.tokensOut,
                row.cacheReadTokens,
                row.cacheWriteTokens,
                row.steps,
                `${row.percent.toFixed(2)}%`,
            ]
                .map(toCsvCell)
                .join(","),
        ),
    ].join("\n");

const downloadCsv = (filename, content) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
};

const ProjectAnalytics = ({ project = null }) => {
    const projectId = project?.id || null;
    const { showToast } = useToast();

    const [subTab, setSubTab] = useState("overview");
    const [month, setMonth] = useState(currentMonthValue);
    const [exportTarget, setExportTarget] = useState(PROJECT_TYPES.PROVIDER);

    const monthList = useMemo(() => monthOptions(12), []);
    const { data, loading, error, reload } = useAsyncData(
        () => analyticsApi.getByProject(projectId, month),
        [projectId, month],
        {
            enabled: Boolean(projectId),
            errorMessage: "Unable to load analytics.",
            onError: (err) => showToast(err.message || "Unable to load analytics.", "error"),
        },
    );
    const summary = data?.summary;

    const handleMonthChange = (value) => {
        setMonth(value);
    };

    const handleRefresh = () => {
        reload();
        showToast("Analytics refreshed.", "info");
    };

    const handleExport = () => {
        if (!data) {
            showToast("Nothing to export yet.", "info");
            return;
        }
        const rows = exportTarget === PROJECT_TYPES.MEMBER ? data.users : data.providers;
        if (!rows?.length) {
            showToast("No usage recorded in this month.", "info");
            return;
        }
        if (exportTarget === PROJECT_TYPES.MEMBER) {
            const header = [
                "User",
                "Email",
                "Project cost",
                "Personal cost",
                "Tokens in",
                "Tokens out",
                "Cache read",
                "Cache write",
                "Steps",
            ];
            const body = rows.map((row) =>
                [
                    row.name,
                    row.email,
                    row.projectCost.toFixed(6),
                    row.personalCost.toFixed(6),
                    row.tokensIn,
                    row.tokensOut,
                    row.cacheReadTokens,
                    row.cacheWriteTokens,
                    row.steps,
                ]
                    .map(toCsvCell)
                    .join(","),
            );
            downloadCsv(
                `analytics-users-${data.range}.csv`,
                [header.join(","), ...body].join("\n"),
            );
        } else {
            downloadCsv(`analytics-usage-${data.range}.csv`, buildProviderCsv(rows));
        }
        showToast("CSV exported.", "success");
    };

    if (!projectId) {
        return (
            <div className="vibe-analytics-viewport">
                <div className="analytics-state-card" role="alert">
                    Open a project first to view its analytics.
                </div>
            </div>
        );
    }

    // Cost / outcome tính từ số liệu thật: task bị bỏ dở bị loại khỏi mẫu số.
    const billableCost = (summary?.totalCost || 0) - (summary?.abandonedCost || 0);
    const tasksTracked = summary?.tasks || 0;
    const completedTasks = summary?.completedTasks || 0;
    const aiLines = summary?.linesAdded || 0;
    const abandonedTokens = summary?.abandonedTokens || 0;
    const totalTokensInOut = (summary?.tokensIn || 0) + (summary?.tokensOut || 0);
    const abandonedShare =
        totalTokensInOut + abandonedTokens > 0
            ? (abandonedTokens / (totalTokensInOut + abandonedTokens)) * 100
            : null;

    const costPerTask = tasksTracked > 0 ? summary.totalCost / tasksTracked : null;
    const costPerCompleted = completedTasks > 0 ? billableCost / completedTasks : null;
    const costPerLine = aiLines > 0 ? summary.totalCost / aiLines : null;

    const daily = data?.daily || [];
    const chartDays = daily.filter(
        (point) => point.total > 0 || point.linesAdded || point.linesRemoved,
    );
    const chartPoints = chartDays.length ? chartDays : daily;

    return (
        <div className="vibe-analytics-viewport">
            {/* Header: Title & Month Filter */}
            <div className="analytics-header-row">
                <div className="analytics-title-cluster">
                    <BarChart3 size={20} className="analytics-title-glyph" />
                    <h2>Analytics</h2>
                    {loading && <Loader2 size={15} className="analytics-spinner" />}
                </div>

                <div className="analytics-header-actions">
                    <button
                        type="button"
                        className="btn-analytics-ghost"
                        onClick={handleRefresh}
                        disabled={loading}
                        title="Reload analytics"
                    >
                        <RefreshCw size={13} className={loading ? "spin" : ""} />
                        <span>Refresh</span>
                    </button>
                    <CustomSelector
                        options={monthList}
                        value={month}
                        onChange={handleMonthChange}
                        placeholder="Select month"
                        className="analytics-month-selector"
                    />
                </div>
            </div>

            {/* Sub-tabs Switcher */}
            <div className="analytics-subtabs-toolbar">
                <div className="analytics-subtabs-pill-box">
                    {SUB_TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                className={`btn-subtab-pill ${subTab === tab.id ? "active" : ""}`}
                                onClick={() => setSubTab(tab.id)}
                            >
                                <Icon size={13} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {subTab === "cost" && (
                    <div className="analytics-export-cluster">
                        <CustomSelector
                            options={[
                                { value: PROJECT_TYPES.PROVIDER, label: "Provider / Model" },
                                { value: PROJECT_TYPES.MEMBER, label: "Members" },
                            ]}
                            value={exportTarget}
                            onChange={setExportTarget}
                            placeholder="Export"
                            className="analytics-export-selector"
                        />
                        <button type="button" className="btn-export-outline" onClick={handleExport}>
                            <Download size={13} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="analytics-state-card" role="alert">
                    {error}
                </div>
            )}

            {/* ======================================================== */}
            {/* 1. OVERVIEW                                               */}
            {/* ======================================================== */}
            {subTab === "overview" && (
                <div className="analytics-view-stack">
                    <div className="kpi-six-cards-grid">
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">$ Total Cost</span>
                            <strong className="kpi-analytic-value">
                                {summary ? formatCost(summary.totalCost) : EMPTY}
                            </strong>
                            {summary && (
                                <small className="kpi-analytic-sub">
                                    {formatCost(summary.projectCost)} project ·{" "}
                                    {formatCost(summary.personalCost)} personal
                                </small>
                            )}
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <ArrowDownToLine size={12} /> Tokens In
                            </span>
                            <strong className="kpi-analytic-value">
                                {summary ? formatTokens(summary.tokensIn) : EMPTY}
                            </strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <ArrowUpFromLine size={12} /> Tokens Out
                            </span>
                            <strong className="kpi-analytic-value">
                                {summary ? formatTokens(summary.tokensOut) : EMPTY}
                            </strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <Database size={12} /> Cache R / W
                            </span>
                            <strong className="kpi-analytic-value">
                                {summary ? formatTokens(summary.cacheReadTokens) : EMPTY}
                            </strong>
                            <small className="kpi-analytic-sub">
                                write {summary ? formatTokens(summary.cacheWriteTokens) : EMPTY}
                            </small>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <ListTree size={12} /> Steps
                            </span>
                            <strong className="kpi-analytic-value">
                                {summary ? formatCount(summary.steps) : EMPTY}
                            </strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">+ Lines of Code</span>
                            <strong className="kpi-analytic-value">
                                {summary ? formatSigned(summary.netLines) : EMPTY}
                            </strong>
                            {summary && (
                                <small className="kpi-analytic-sub">
                                    {formatSigned(-Math.abs(summary.linesRemoved))} ·{" "}
                                    {summary.filesChanged} files
                                </small>
                            )}
                        </div>
                    </div>

                    {/* COST PER OUTCOME */}
                    <div className="outcome-section-block">
                        <span className="outcome-section-title">COST PER OUTCOME</span>
                        <div className="outcome-four-cards-grid">
                            <div className="kpi-outcome-card">
                                <span className="kpi-outcome-label">
                                    <Zap size={13} /> Cost / Task
                                </span>
                                <strong className="kpi-outcome-value">
                                    {costPerTask === null ? EMPTY : formatCost(costPerTask)}
                                </strong>
                                <small className="kpi-outcome-sub">
                                    {summary ? `${tasksTracked} tasks` : EMPTY}
                                </small>
                            </div>
                            <div className="kpi-outcome-card">
                                <span className="kpi-outcome-label">
                                    <CheckCircle2 size={13} /> Cost / Completed
                                </span>
                                <strong className="kpi-outcome-value">
                                    {costPerCompleted === null
                                        ? EMPTY
                                        : formatCost(costPerCompleted)}
                                </strong>
                                <small className="kpi-outcome-sub">
                                    {summary ? `${completedTasks} shipped` : EMPTY}
                                </small>
                            </div>
                            <div className="kpi-outcome-card">
                                <span className="kpi-outcome-label">
                                    <Code size={13} /> Cost / AI-authored line
                                </span>
                                <strong className="kpi-outcome-value">
                                    {costPerLine === null ? EMPTY : formatCost(costPerLine)}
                                </strong>
                                {summary && (
                                    <small className="kpi-outcome-sub">
                                        {aiLines} lines written
                                    </small>
                                )}
                            </div>
                            <div className="kpi-outcome-card">
                                <span className="kpi-outcome-label">
                                    <Trash2 size={13} /> % Tokens on Abandoned
                                </span>
                                <strong className="kpi-outcome-value">
                                    {abandonedShare === null
                                        ? EMPTY
                                        : formatPercent(abandonedShare)}
                                </strong>
                                <small className="kpi-outcome-sub">
                                    {summary?.abandoned?.length
                                        ? `${summary.abandonedTasks} abandoned · ${formatCost(
                                              summary.abandoned.reduce(
                                                  (total, item) => total + item.cost,
                                                  0,
                                              ),
                                          )}`
                                        : "no spend on abandoned tasks"}
                                </small>
                            </div>
                        </div>
                    </div>

                    {/* Biểu đồ Cost trend */}
                    <div className="chart-panel-card">
                        <div className="chart-panel-header">
                            <h4>Cost trend</h4>
                            <div className="chart-legend-cluster">
                                <span className="chart-legend-item">
                                    <span className="legend-swatch amber" /> Total
                                </span>
                                <span className="chart-legend-item">
                                    <span className="legend-swatch purple" /> Project
                                </span>
                            </div>
                        </div>
                        <CostTrendChart
                            points={chartPoints}
                            emptyLabel="No usage recorded in this month."
                        />
                    </div>

                    {/* Biểu đồ Code activity */}
                    <div className="chart-panel-card">
                        <div className="chart-panel-header">
                            <h4>Code activity</h4>
                            <div className="chart-legend-cluster">
                                <span className="chart-legend-item">
                                    <span className="legend-swatch green" /> Added
                                </span>
                                <span className="chart-legend-item">
                                    <span className="legend-swatch rose" /> Removed
                                </span>
                            </div>
                        </div>
                        <CodeActivityChart
                            points={chartPoints}
                            emptyLabel="No code activity recorded in this month."
                        />
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 2. COST & USAGE                                           */}
            {/* ======================================================== */}
            {subTab === "cost" && (
                <div className="analytics-view-stack">
                    <div className="chart-panel-card">
                        <div className="chart-panel-header">
                            <h4>Daily LLM cost</h4>
                            <span className="chart-legend-text">Project vs personal spend</span>
                        </div>
                        <CostTrendChart
                            points={chartPoints}
                            emptyLabel="No LLM spend recorded in this month."
                        />
                    </div>

                    <div className="analytics-section-panel">
                        <h4 className="section-panel-title">By Provider / Model</h4>
                        <div className="analytics-table-card">
                            <table className="analytics-data-table">
                                <thead>
                                    <tr>
                                        <th>Provider</th>
                                        <th>Model</th>
                                        <th>Cost</th>
                                        <th>In / Out</th>
                                        <th>Cache R / W</th>
                                        <th>Steps</th>
                                        <th>% of Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.providers?.length ? (
                                        data.providers.map((row) => (
                                            <tr key={`${row.provider}-${row.model}`}>
                                                <td className="td-provider">{row.provider}</td>
                                                <td className="td-model">{row.model}</td>
                                                <td className="td-cost">{formatCost(row.cost)}</td>
                                                <td className="td-inout">
                                                    {formatInOut(row.tokensIn, row.tokensOut)}
                                                </td>
                                                <td className="td-cache">
                                                    {formatCache(
                                                        row.cacheReadTokens,
                                                        row.cacheWriteTokens,
                                                    )}
                                                </td>
                                                <td className="td-steps">{row.steps}</td>
                                                <td className="td-percent">
                                                    {formatPercent(row.percent)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="td-empty">
                                                {loading
                                                    ? "Loading usage…"
                                                    : "No usage recorded in this month."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="analytics-section-panel">
                        <div className="section-header-caption-line">
                            <h4 className="section-panel-title">By User</h4>
                            <span className="caption-subtext">
                                — personal spend is billed to the member's own key
                            </span>
                        </div>
                        <div className="analytics-table-card">
                            <table className="analytics-data-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Project Cost</th>
                                        <th>Personal Cost</th>
                                        <th>In / Out</th>
                                        <th>Cache R / W</th>
                                        <th>Steps</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.users?.length ? (
                                        data.users.map((row) => (
                                            <tr key={row.userId || row.name}>
                                                <td>
                                                    <div className="user-table-cell">
                                                        <div className="avatar-chip-small">
                                                            {initialsOf(row.name, row.email)}
                                                        </div>
                                                        <strong>{row.name}</strong>
                                                    </div>
                                                </td>
                                                <td>{formatCost(row.projectCost)}</td>
                                                <td>{formatCost(row.personalCost)}</td>
                                                <td>{formatInOut(row.tokensIn, row.tokensOut)}</td>
                                                <td>
                                                    {formatCache(
                                                        row.cacheReadTokens,
                                                        row.cacheWriteTokens,
                                                    )}
                                                </td>
                                                <td>{row.steps}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="td-empty">
                                                {loading
                                                    ? "Loading users…"
                                                    : "No member usage recorded in this month."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* 3. CODE ACTIVITY                                          */}
            {/* ======================================================== */}
            {subTab === "code" && (
                <div className="analytics-view-stack">
                    <div className="kpi-four-cards-grid">
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">+ Lines Added</span>
                            <strong className="kpi-analytic-value">
                                {summary ? `+${summary.linesAdded}` : EMPTY}
                            </strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">— Lines Removed</span>
                            <strong className="kpi-analytic-value">
                                {summary ? `-${summary.linesRemoved}` : EMPTY}
                            </strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <Code size={12} /> Net Change
                            </span>
                            <strong className="kpi-analytic-value">
                                {summary ? formatSigned(summary.netLines) : EMPTY}
                            </strong>
                        </div>
                        <div className="kpi-analytic-card">
                            <span className="kpi-analytic-label">
                                <FileCode size={12} /> Files Changed
                            </span>
                            <strong className="kpi-analytic-value">
                                {summary ? summary.filesChanged : EMPTY}
                            </strong>
                        </div>
                    </div>

                    <div className="chart-panel-card">
                        <div className="chart-panel-header">
                            <h4>Code activity</h4>
                            <span className="chart-legend-text">Lines added / removed, daily</span>
                        </div>
                        <CodeActivityChart
                            points={chartPoints}
                            emptyLabel="No code activity recorded in this month."
                        />
                    </div>

                    <div className="analytics-section-panel">
                        <h4 className="section-panel-title">By Member</h4>
                        <div className="analytics-table-card">
                            <table className="analytics-data-table">
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>Lines+</th>
                                        <th>Lines-</th>
                                        <th>Net</th>
                                        <th>Files</th>
                                        <th>Runs</th>
                                        <th>Lines/Run</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.users?.length ? (
                                        data.users.map((row) => (
                                            <tr key={`code-${row.userId || row.name}`}>
                                                <td>
                                                    <div className="user-table-cell">
                                                        <div className="avatar-chip-small">
                                                            {initialsOf(row.name, row.email)}
                                                        </div>
                                                        <strong>{row.name}</strong>
                                                    </div>
                                                </td>
                                                <td className="text-green-bold">
                                                    +{row.linesAdded}
                                                </td>
                                                <td className="text-red-bold">
                                                    -{row.linesRemoved}
                                                </td>
                                                <td
                                                    className={
                                                        row.linesAdded - row.linesRemoved >= 0
                                                            ? "text-green-bold"
                                                            : "text-red-bold"
                                                    }
                                                >
                                                    {formatSigned(
                                                        row.linesAdded - row.linesRemoved,
                                                    )}
                                                </td>
                                                <td>{row.filesChanged}</td>
                                                <td>{row.runs}</td>
                                                <td>
                                                    {row.runs > 0
                                                        ? Math.round(row.linesAdded / row.runs)
                                                        : 0}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="td-empty">
                                                {loading
                                                    ? "Loading code activity…"
                                                    : "No code activity recorded in this month."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectAnalytics;
